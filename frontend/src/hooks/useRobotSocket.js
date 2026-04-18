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
        scheduleReconnect(connect)
      }

      socket.onerror = () => {
        if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
          socket.close()
        }
      }

      socket.onmessage = (event) => {
        let msg
        try {
          msg = JSON.parse(event.data)
        } catch {
          return
        }

        if (msg.type === 'robot_status') {
          setRobotOnline(msg.online)
          if (!msg.online) resetRobotState()
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
              sensors: {},
              sound: {},
              gas: {},
              fans: {},
              lights: {},
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

        if (msg.type === 'sensor_data') {
          setTelemetry((prev) => ({
            ...prev,
            sensors: { ...prev.sensors, [msg.sensor]: msg.data },
          }))
          return
        }

        if (msg.type === 'sound_data') {
          setTelemetry((prev) => ({
            ...prev,
            sound: { ...prev.sound, [msg.sensor]: msg.data },
          }))
          return
        }

        if (msg.type === 'gas_data') {
          setTelemetry((prev) => ({
            ...prev,
            gas: { ...prev.gas, [msg.sensor]: msg.data },
          }))
          return
        }

        if (msg.type === 'scd41_aggregate') {
          setTelemetry((prev) => ({
            ...prev,
            scd41_aggregate: msg.data,
          }))
          return
        }

        if (msg.type === 'scd41_bays') {
          setTelemetry((prev) => ({
            ...prev,
            scd41_bays: { ...prev.scd41_bays, ...msg.data },
          }))
          return
        }

        if (msg.type === 'fan_data') {
          setTelemetry((prev) => ({ ...prev, fans: msg.data }))
          return
        }

        if (msg.type === 'light_data') {
          setTelemetry((prev) => ({ ...prev, lights: msg.data }))
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
  }
}
