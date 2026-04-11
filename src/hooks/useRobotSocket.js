import { useCallback, useEffect, useRef, useState } from 'react'

const RECONNECT_DELAY = 3000

export function useRobotSocket(token, onLogout) {
  const ws = useRef(null)
  const reconnectTimer = useRef(null)
  const [relayOnline, setRelayOnline] = useState(false)
  const [robotOnline, setRobotOnline] = useState(false)
  const [telemetry, setTelemetry] = useState({
    behavior: 'UNKNOWN',
    battery: null,
    speed: null,
    odom: { x: null, y: null, heading: null },
    stoppedVehicle: false,
    stoppedVehicleCount: 0,
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

    function connect() {
      const url = `${import.meta.env.VITE_RELAY_WS}?token=${token}`
      const socket = new WebSocket(url)
      ws.current = socket

      socket.onopen = () => {
        setRelayOnline(true)
      }

      socket.onclose = () => {
        setRelayOnline(false)
        setRobotOnline(false)
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY)
      }

      socket.onerror = () => {
        socket.close()
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
            stoppedVehicle: d.stoppedVehicle ?? prev.stoppedVehicle,
            stoppedVehicleCount:
              d.stoppedVehicleCount ?? prev.stoppedVehicleCount,
            cpuTemp: d.cpuTemp ?? prev.cpuTemp,
          }))
          return
        }

        if (msg.type === 'auth_error') {
          onLogout?.()
        }
      }
    }

    connect()

    return () => {
      clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [token, onLogout])

  return { relayOnline, robotOnline, telemetry, send }
}
