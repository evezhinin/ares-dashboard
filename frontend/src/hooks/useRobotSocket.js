import React from 'react';
  
  const UseRobotSocket = () =>  {
	return (
	  <div>
	  </div>
	);
  }
  
  export default UseRobotSocket;
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
let audioEl = null
let mediaSource = null
let sourceBuffer = null
let pendingChunks = []
let msReady = false

function getOrCreateAudio() {
  if (audioEl) return
  audioEl = new Audio()
  audioEl.autoplay = true
  mediaSource = new MediaSource()
  audioEl.src = URL.createObjectURL(mediaSource)
  audioEl.play().catch(() => {})
  mediaSource.addEventListener('sourceopen', () => {
    try {
      sourceBuffer = mediaSource.addSourceBuffer('audio/webm;codecs=opus')
      sourceBuffer.mode = 'sequence'
      msReady = true
      flushPending()
      sourceBuffer.addEventListener('updateend', flushPending)
    } catch (err) {
      console.error('[audio] MediaSource setup failed:', err)
    }
  })
}

function flushPending() {
  if (!sourceBuffer || sourceBuffer.updating || pendingChunks.length === 0) return
  const chunk = pendingChunks.shift()
  try {
    sourceBuffer.appendBuffer(chunk)
  } catch (err) {
    console.error('[audio] appendBuffer error:', err)
    pendingChunks = []
  }
}

function playAudioChunk(arrayBuffer) {
  getOrCreateAudio()
  pendingChunks.push(arrayBuffer)
  if (msReady) flushPending()
}

function resetAudio() {
  pendingChunks = []
  msReady = false
  sourceBuffer = null
  if (mediaSource && mediaSource.readyState === 'open') {
    try {
      mediaSource.endOfStream()
    } catch (err) {
      console.debug('[audio] endOfStream failed during reset:', err)
    }
  }
  mediaSource = null
  if (audioEl) {
    audioEl.src = ''
    audioEl = null
  }
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
    internalTemperature: null,
    internalHumidity: null,
    internalCarbonDioxide: null,
    speaker: null,
    fans: null,
    bodyExhaust: null,
    hub1Intake: null,
    hub1Exhaust: null,
    hub2Intake: null,
    hub2Exhaust: null,
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
          const d = msg.data ?? {}
          setTelemetry((prev) => ({
            ...prev,
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

          setTelemetry((prev) => {
            const nextStoppedVehicleActive =
              d.stoppedVehicle?.active ?? prev.stoppedVehicle

            const nextStoppedVehicleVehicles = Array.isArray(
              d.stoppedVehicle?.vehicles,
            )
              ? d.stoppedVehicle.vehicles
              : prev.stoppedVehicleDetails.vehicles

            return {
              ...prev,
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

        if (msg.type === 'sensor_readings') {
          console.log('[sensor_readings] payload:', JSON.stringify(msg.payload, null, 2))
          const d = msg.payload ?? {}
          const front = d.front ?? {}
          const back = d.back ?? {}
          setTelemetry((prev) => ({
            ...prev,
            temperatureFront: front.temperature ?? prev.temperatureFront,
            temperatureBack:  back.temperature  ?? prev.temperatureBack,
            humidityFront:    front.humidity    ?? prev.humidityFront,
            humidityBack:     back.humidity     ?? prev.humidityBack,
            co2Front:         front.co2         ?? prev.co2Front,
            co2Back:          back.co2          ?? prev.co2Back,
            coFront:          front.co          ?? prev.coFront,
            coBack:           back.co           ?? prev.coBack,
            nh3Front:         front.nh3         ?? prev.nh3Front,
            nh3Back:          back.nh3          ?? prev.nh3Back,
            no2Front:         front.no2         ?? prev.no2Front,
            no2Back:          back.no2          ?? prev.no2Back,
            soundDbFront:     front.sound_db    ?? prev.soundDbFront,
            soundDbBack:      back.sound_db     ?? prev.soundDbBack,
          }))
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
