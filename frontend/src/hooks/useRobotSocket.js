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
    bay1Temperature: null, bay1Humidity: null, bay1Co2: null,
    bay2Temperature: null, bay2Humidity: null, bay2Co2: null,
    bay3Temperature: null, bay3Humidity: null, bay3Co2: null,
    bay4Temperature: null, bay4Humidity: null, bay4Co2: null,
    exhaustFan1Rpm: null, exhaustFan2Rpm: null, exhaustFan3Rpm: null, exhaustFan4Rpm: null,
    intakeFan1Rpm: null, intakeFan2Rpm: null, intakeFan3Rpm: null, intakeFan4Rpm: null,
    intakeFan5Rpm: null, intakeFan6Rpm: null, intakeFan7Rpm: null, intakeFan8Rpm: null,
    intakeFan9Rpm: null, intakeFan10Rpm: null,
    fansExhaustSpeed: null,
    fansIntakeSpeed: null,
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
          const scd41Front = d.scd41?.front ?? {}
          const scd41Back  = d.scd41?.back  ?? {}
          const gasFront   = d.gas?.front   ?? {}
          const gasBack    = d.gas?.back    ?? {}
          const soundFront = d.sound?.front ?? {}
          const soundBack  = d.sound?.back  ?? {}
          setTelemetry((prev) => ({
            ...prev,
            temperatureFront: scd41Front.temperature      ?? prev.temperatureFront,
            temperatureBack:  scd41Back.temperature       ?? prev.temperatureBack,
            humidityFront:    scd41Front.humidity         ?? prev.humidityFront,
            humidityBack:     scd41Back.humidity          ?? prev.humidityBack,
            co2Front:         scd41Front.co2              ?? prev.co2Front,
            co2Back:          scd41Back.co2               ?? prev.co2Back,
            coFront:          gasFront.co                 ?? prev.coFront,
            coBack:           gasBack.co                  ?? prev.coBack,
            nh3Front:         gasFront.nh3                ?? prev.nh3Front,
            nh3Back:          gasBack.nh3                 ?? prev.nh3Back,
            no2Front:         gasFront.no2                ?? prev.no2Front,
            no2Back:          gasBack.no2                 ?? prev.no2Back,
            soundDbFront:     soundFront.db_level         ?? prev.soundDbFront,
            soundDbBack:      soundBack.db_level          ?? prev.soundDbBack,
            honkingFront:     soundFront.honking_detected ?? prev.honkingFront,
            honkingBack:      soundBack.honking_detected  ?? prev.honkingBack,
          }))
          return
        }

        if (msg.type === 'internal_sensor_readings') {
          console.log('[internal_sensor_readings] payload:', JSON.stringify(msg.payload, null, 2))
          const d = msg.payload ?? {}
          setTelemetry((prev) => ({
            ...prev,
            bay1Temperature:   d.bay_1?.temperature    ?? prev.bay1Temperature,
            bay1Humidity:      d.bay_1?.humidity        ?? prev.bay1Humidity,
            bay1Co2:           d.bay_1?.co2             ?? prev.bay1Co2,
            bay2Temperature:   d.bay_2?.temperature    ?? prev.bay2Temperature,
            bay2Humidity:      d.bay_2?.humidity        ?? prev.bay2Humidity,
            bay2Co2:           d.bay_2?.co2             ?? prev.bay2Co2,
            bay3Temperature:   d.bay_3?.temperature    ?? prev.bay3Temperature,
            bay3Humidity:      d.bay_3?.humidity        ?? prev.bay3Humidity,
            bay3Co2:           d.bay_3?.co2             ?? prev.bay3Co2,
            bay4Temperature:   d.bay_4?.temperature    ?? prev.bay4Temperature,
            bay4Humidity:      d.bay_4?.humidity        ?? prev.bay4Humidity,
            bay4Co2:           d.bay_4?.co2             ?? prev.bay4Co2,
            exhaustFan1Rpm:    d.exhaust_fan_1?.rpm    ?? prev.exhaustFan1Rpm,
            exhaustFan2Rpm:    d.exhaust_fan_2?.rpm    ?? prev.exhaustFan2Rpm,
            exhaustFan3Rpm:    d.exhaust_fan_3?.rpm    ?? prev.exhaustFan3Rpm,
            exhaustFan4Rpm:    d.exhaust_fan_4?.rpm    ?? prev.exhaustFan4Rpm,
            intakeFan1Rpm:     d.intake_fan_1?.rpm     ?? prev.intakeFan1Rpm,
            intakeFan2Rpm:     d.intake_fan_2?.rpm     ?? prev.intakeFan2Rpm,
            intakeFan3Rpm:     d.intake_fan_3?.rpm     ?? prev.intakeFan3Rpm,
            intakeFan4Rpm:     d.intake_fan_4?.rpm     ?? prev.intakeFan4Rpm,
            intakeFan5Rpm:     d.intake_fan_5?.rpm     ?? prev.intakeFan5Rpm,
            intakeFan6Rpm:     d.intake_fan_6?.rpm     ?? prev.intakeFan6Rpm,
            intakeFan7Rpm:     d.intake_fan_7?.rpm     ?? prev.intakeFan7Rpm,
            intakeFan8Rpm:     d.intake_fan_8?.rpm     ?? prev.intakeFan8Rpm,
            intakeFan9Rpm:     d.intake_fan_9?.rpm     ?? prev.intakeFan9Rpm,
            intakeFan10Rpm:    d.intake_fan_10?.rpm    ?? prev.intakeFan10Rpm,
            fansExhaustSpeed:  d.fans?.exhaust_speed   ?? prev.fansExhaustSpeed,
            fansIntakeSpeed:   d.fans?.intake_speed    ?? prev.fansIntakeSpeed,
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
