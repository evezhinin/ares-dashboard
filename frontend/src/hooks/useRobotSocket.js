import { useCallback, useEffect, useRef, useState } from 'react'

const RECONNECT_DELAY = 3000

function summarizeAlertDetail(category, details) {
  if (!details || typeof details !== 'object') return null

  if (category === 'stopped_vehicle') {
    const count = Array.isArray(details.vehicles) ? details.vehicles.length : 0
    return count > 0 ? `Count: ${count}` : 'Confirmed stopped vehicle alert'
  }

  if (category === 'person') {
    const cameras = Array.isArray(details.cameras)
      ? details.cameras
          .map((camera) =>
            typeof camera === 'string' ? camera : camera?.camera,
          )
          .filter(Boolean)
      : []
    return cameras.length > 0
      ? `Cameras: ${cameras.join(', ')}`
      : 'Confirmed person alert'
  }

  if (category === 'obstruction') {
    const parts = []
    if (details.direction) parts.push(`Dir: ${details.direction}`)
    if (details.distanceM != null) parts.push(`Dist: ${details.distanceM}m`)
    if (details.durationSec != null) parts.push(`For: ${details.durationSec}s`)
    return parts.length > 0 ? parts.join(' | ') : 'Obstacle detected in path'
  }

  if (typeof details.message === 'string' && details.message) {
    return details.message
  }

  return null
}

function normalizeAlertEvent(message) {
  const payload = message.payload ?? {}
  const category = payload.category ?? 'unknown'

  return {
    id:
      message.seq != null
        ? `seq-${message.seq}`
        : `${message.ts ?? Date.now()}-${category}-${payload.active ? 'on' : 'off'}`,
    category,
    level: payload.level ?? 'info',
    active: payload.active !== false,
    title: payload.title ?? 'Alert update',
    detail: summarizeAlertDetail(category, payload.details),
    ts: message.ts ?? new Date().toISOString(),
  }
}
//let audioContext = null
//let audioQueue = []
//let isPlaying = false
//let sourceBuffer = null
//let mediaSource = null
//let audioElement = null
let audioCtx = null
let firstChunk = null
let chunkBuffer = []
let chunkBufferSize = 0
const DECODE_THRESHOLD = 12000

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 })
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

function playAudioChunk(arrayBuffer) {
  try {
    // Keep the first chunk — it contains the WebM header
    if (!firstChunk) {
      firstChunk = arrayBuffer
      return
    }

    chunkBuffer.push(arrayBuffer)
    chunkBufferSize += arrayBuffer.byteLength

    if (chunkBufferSize >= DECODE_THRESHOLD) {
      // Merge: header + accumulated chunks
      const totalSize = firstChunk.byteLength + chunkBufferSize
      const merged = new Uint8Array(totalSize)
      merged.set(new Uint8Array(firstChunk), 0)
      let offset = firstChunk.byteLength
      for (const buf of chunkBuffer) {
        merged.set(new Uint8Array(buf), offset)
        offset += buf.byteLength
      }
      chunkBuffer = []
      chunkBufferSize = 0

      const ctx = getAudioCtx()
      ctx.decodeAudioData(merged.buffer.slice(0)).then((decoded) => {
        const source = ctx.createBufferSource()
        source.buffer = decoded
        source.connect(ctx.destination)
        source.start()
      }).catch(() => {
        // reset on decode failure
        firstChunk = null
      })
    }
  } catch (err) {
    console.error('[audio] playAudioChunk error:', err.message)
  }
}

// Reset audio state when PTT stops
function resetAudio() {
  firstChunk = null
  chunkBuffer = []
  chunkBufferSize = 0
}


export function useRobotSocket(token, onLogout) {
  const ws = useRef(null)
  const reconnectTimer = useRef(null)
  const [relayOnline, setRelayOnline] = useState(false)
  const [robotOnline, setRobotOnline] = useState(false)
  const [activeAlerts, setActiveAlerts] = useState({})
  const [latestAlertEvent, setLatestAlertEvent] = useState(null)
  const [hasAlertFeed, setHasAlertFeed] = useState(false)
  const [telemetry, setTelemetry] = useState({
    behavior: 'UNKNOWN',
    battery: null,
    speed: null,
    odom: { x: null, y: null, heading: null },
    safetyStop: false,
    persons: { active: false, cameras: [] },
    obstruction: {
      active: false,
      direction: null,
      distanceM: null,
      angleDeg: null,
      durationSec: null,
    },
    stoppedVehicle: false,
    stoppedVehicleCount: 0,
    stoppedVehicleDetails: { active: false, vehicles: [] },
    cpuTemp: null,
    temperatureFront: null,
    temperatureBack:  null,
    humidityFront:    null,
    humidityBack:     null,
    co2Front:         null,
    co2Back:          null,
    coFront:          null,
    coBack:           null,
    nh3Front:         null,
    nh3Back:          null,
    no2Front:         null,
    no2Back:          null,
    soundDbFront:     null,
    soundDbBack:      null,
    honkingFront:     null,
    honkingBack:      null,
  })

  const send = useCallback(
    (message) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ ...message, token }))
      }
    },
    [token],
  )

  useEffect(() => {
    if (!token) return

    let disposed = false
    let allowReconnect = true

    function resetRobotState() {
      setActiveAlerts({})
      setTelemetry((prev) => ({
        ...prev,
        behavior: 'UNKNOWN',
        safetyStop: false,
        persons: { active: false, cameras: [] },
        obstruction: {
          active: false,
          direction: null,
          distanceM: null,
          angleDeg: null,
          durationSec: null,
        },
        stoppedVehicle: false,
        stoppedVehicleCount: 0,
        stoppedVehicleDetails: { active: false, vehicles: [] },
      }))
    }

    function scheduleReconnect(connectFn) {
      if (disposed || !allowReconnect) return
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = setTimeout(() => {
        if (disposed || !allowReconnect) return
        connectFn()
      }, RECONNECT_DELAY)
    }

    function stopReconnect() {
      allowReconnect = false
      clearTimeout(reconnectTimer.current)
    }

    function connect() {
      if (disposed || !allowReconnect) return
      const url = `${import.meta.env.VITE_RELAY_WS}?token=${token}`
      const socket = new WebSocket(url)
      socket.binaryType = 'arraybuffer'
      ws.current = socket

      socket.onopen = () => {
        if (disposed || !allowReconnect) {
          socket.close()
          return
        }
        setRelayOnline(true)
      }

      socket.onclose = () => {
        if (ws.current === socket) ws.current = null
        setRelayOnline(false)
        setRobotOnline(false)
        resetRobotState()
        resetAudio()
        scheduleReconnect(connect)
      }

      socket.onerror = () => {
        if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
          socket.close()
        }
      }

      socket.onmessage = (event) => {
        // handle binary messages (e.g. audio chunks) in CommsView, so ignore here
        if (event.data instanceof ArrayBuffer) {
          console.log('[audio] Received binary chunk:', event.data.byteLength, 'bytes')
          playAudioChunk(event.data)
          return
        }
        let msg
        try {
          msg = JSON.parse(event.data)
        } catch {
          return
        }

        if (msg.type === 'robot_status') {
          setRobotOnline(msg.online)
          if (!msg.online) {
            resetRobotState()
            resetAudio()
          }
          return
        }

        if (msg.type === 'telemetry') {
          const d = msg.data
          setTelemetry((prev) => ({
            behavior: d.behavior ?? prev.behavior,
            battery: d.battery ?? prev.battery,
            speed: d.speed ?? prev.speed,
            odom: {
              x: d.odom?.x ?? prev.odom.x,
              y: d.odom?.y ?? prev.odom.y,
              heading: d.odom?.heading ?? prev.odom.heading,
            },
            safetyStop: d.safetyStop ?? prev.safetyStop,
            persons: {
              active: d.persons?.active ?? prev.persons.active,
              cameras: d.persons?.cameras ?? prev.persons.cameras,
            },
            obstruction: {
              active: d.obstruction?.active ?? prev.obstruction.active,
              direction: d.obstruction?.direction ?? prev.obstruction.direction,
              distanceM: d.obstruction?.distanceM ?? prev.obstruction.distanceM,
              angleDeg: d.obstruction?.angleDeg ?? prev.obstruction.angleDeg,
              durationSec:
                d.obstruction?.durationSec ?? prev.obstruction.durationSec,
            },
            stoppedVehicle: d.stoppedVehicle ?? prev.stoppedVehicle,
            stoppedVehicleCount:
              d.stoppedVehicleCount ?? prev.stoppedVehicleCount,
            stoppedVehicleDetails: {
              active: d.stoppedVehicle ?? prev.stoppedVehicleDetails.active,
              vehicles:
                d.stoppedVehicleDetails?.vehicles ??
                prev.stoppedVehicleDetails.vehicles,
            },
            cpuTemp: d.cpuTemp ?? prev.cpuTemp,
          }))
          return
        }

        if (msg.type === 'telemetry.snapshot') {
          const d = msg.payload ?? {}
          if (typeof d.connected === 'boolean') {
            setRobotOnline(d.connected)
          }
        
        if (msg.type === 'sensor_readings') {
          const d = msg.payload ?? {}
          setTelemetry((prev) => ({
            ...prev,
            // SCD41
            temperatureFront: d.front?.temperature ?? prev.temperatureFront,
            temperatureBack:  d.back?.temperature  ?? prev.temperatureBack,
            humidityFront:    d.front?.humidity    ?? prev.humidityFront,
            humidityBack:     d.back?.humidity     ?? prev.humidityBack,
            co2Front:         d.front?.co2         ?? prev.co2Front,
            co2Back:          d.back?.co2          ?? prev.co2Back,
            // Gas
            coFront:          d.front?.co          ?? prev.coFront,
            coBack:           d.back?.co           ?? prev.coBack,
            nh3Front:         d.front?.nh3         ?? prev.nh3Front,
            nh3Back:          d.back?.nh3          ?? prev.nh3Back,
            no2Front:         d.front?.no2         ?? prev.no2Front,
            no2Back:          d.back?.no2          ?? prev.no2Back,
            // Sound
            soundDbFront:     d.front?.sound_db    ?? prev.soundDbFront,
            soundDbBack:      d.back?.sound_db     ?? prev.soundDbBack,
            honkingFront:     d.front?.honking     ?? prev.honkingFront,
            honkingBack:      d.back?.honking      ?? prev.honkingBack,
            }))
            return
          }

          setTelemetry((prev) => {
            const nextStoppedVehicleActive =
              d.stoppedVehicle?.active ?? prev.stoppedVehicle
            const nextStoppedVehicleVehicles = Array.isArray(
              d.stoppedVehicle?.vehicles,
            )
              ? d.stoppedVehicle.vehicles
              : prev.stoppedVehicleDetails.vehicles

            return {
              behavior: d.behavior ?? prev.behavior,
              battery: prev.battery,
              speed: prev.speed,
              odom: prev.odom,
              safetyStop: d.safetyStop ?? prev.safetyStop,
              persons: {
                active: d.persons?.active ?? prev.persons.active,
                cameras: Array.isArray(d.persons?.cameras)
                  ? d.persons.cameras
                  : prev.persons.cameras,
              },
              obstruction: {
                active: d.obstruction?.active ?? prev.obstruction.active,
                direction:
                  d.obstruction?.direction ?? prev.obstruction.direction,
                distanceM:
                  d.obstruction?.distanceM ?? prev.obstruction.distanceM,
                angleDeg: d.obstruction?.angleDeg ?? prev.obstruction.angleDeg,
                durationSec:
                  d.obstruction?.durationSec ?? prev.obstruction.durationSec,
              },
              stoppedVehicle: nextStoppedVehicleActive,
              stoppedVehicleCount: nextStoppedVehicleActive
                ? nextStoppedVehicleVehicles.length
                : 0,
              stoppedVehicleDetails: {
                active: nextStoppedVehicleActive,
                vehicles: nextStoppedVehicleVehicles,
              },
              cpuTemp: prev.cpuTemp,
            }
          })
          return
        }

        if (msg.type === 'alert.event') {
          const alert = normalizeAlertEvent(msg)
          setHasAlertFeed(true)
          setLatestAlertEvent(alert)
          setActiveAlerts((prev) => {
            if (!alert.active) {
              const next = { ...prev }
              delete next[alert.category]
              return next
            }

            return { ...prev, [alert.category]: alert }
          })
          return
        }

        if (msg.type === 'auth_error') {
          stopReconnect()
          onLogout?.()
          return
        }

        if (msg.type === 'relay.error') {
          const code = msg.payload?.code ?? 'relay_error'
          const message = msg.payload?.message ?? 'Unknown relay error'
          console.warn(`[relay] ${code}: ${message}`)
        }
      }
    }

    connect()

    return () => {
      disposed = true
      stopReconnect()
      clearTimeout(reconnectTimer.current)
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.close()
      }
    }
  }, [token, onLogout])

  return {
    relayOnline,
    robotOnline,
    telemetry,
    activeAlerts: Object.values(activeAlerts),
    latestAlertEvent,
    hasAlertFeed,
    send,
    ws,
  }
}
