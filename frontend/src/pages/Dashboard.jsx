import { useState, useCallback, useEffect, useRef } from 'react'
import { useRobotSocket } from '../hooks/useRobotSocket'
import CameraView from '../components/CameraView'
import DetectionBanner, { getBannerAlert } from '../components/DetectionBanner'
import LeftNav from '../components/LeftNav'
import RightPanel from '../components/RightPanel'
import SensorView from '../components/SensorView'
import ControlView from '../components/ControlView'

function isEmergencyBehavior(behavior) {
  return behavior === 'ESTOP' || behavior === 'EMERGENCY_STOP'
}

function isAlertBehavior(behavior) {
  return behavior === 'ALERT' || behavior === 'OBSTRUCTION_ALERT' || behavior === 'STOPPED_VEHICLE_ALERT'
}

function notificationTypeForBehavior(behavior) {
  if (isEmergencyBehavior(behavior)) return 'danger'
  if (isAlertBehavior(behavior)) return 'vehicle'
  return 'clear'
}

function notificationTypeForAlert(alert) {
  if (!alert.active) return 'clear'
  if (alert.category === 'stopped_vehicle') return 'vehicle'
  return alert.level === 'error' ? 'danger' : 'vehicle'
}

function useClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    function tick() {
      const n = new Date()
      const pad = v => String(v).padStart(2, '0')
      setTime(`${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function Dashboard({ token, onLogout }) {
  const {
    relayOnline,
    robotOnline,
    telemetry,
    activeAlerts,
    latestAlertEvent,
    hasAlertFeed,
    send,
  } = useRobotSocket(token, onLogout)
  const clock = useClock()

  const [activeView,    setActiveView]    = useState('camera')
  const [teleopEnabled, setTeleopEnabled] = useState(false)
  const [estopActive,   setEstopActive]   = useState(false)
  const [lastCmd,       setLastCmd]       = useState(null)
  const [notifications, setNotifications] = useState([])
  const notifId = useRef(0)

  const prevBehavior     = useRef(null)
  const prevRobot        = useRef(null)
  const prevVehicle      = useRef(null)
  const prevAlertEventId = useRef(null)
  const uptimeStart      = useRef(null)
  const [uptime, setUptime] = useState('0m')

  // Uptime counter
  useEffect(() => {
    uptimeStart.current = Date.now()
    const id = setInterval(() => {
      setUptime(Math.floor((Date.now() - uptimeStart.current) / 60000) + 'm')
    }, 10000)
    return () => clearInterval(id)
  }, [])

  const addNotif = useCallback((type, title, detail) => {
    const n = new Date()
    const pad = v => String(v).padStart(2, '0')
    const time = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`
    setNotifications(prev => [{ id: notifId.current++, type, title, detail, time }, ...prev].slice(0, 50))
  }, [])

  useEffect(() => {
    if (telemetry.behavior && telemetry.behavior !== prevBehavior.current) {
      if (prevBehavior.current !== null && !(telemetry.behavior === 'UNKNOWN' && !robotOnline)) {
        addNotif(
          notificationTypeForBehavior(telemetry.behavior),
          `State → ${telemetry.behavior}`,
          'Behavior state changed',
        )
      }
      prevBehavior.current = telemetry.behavior
    }
  }, [robotOnline, telemetry.behavior, addNotif])

  useEffect(() => {
    if (prevRobot.current !== null && prevRobot.current !== robotOnline) {
      addNotif(robotOnline ? 'clear' : 'danger', robotOnline ? 'Robot connected' : 'Robot disconnected', 'Bridge WebSocket status')
    }
    prevRobot.current = robotOnline
  }, [robotOnline, addNotif])

  useEffect(() => {
    if (hasAlertFeed) {
      prevVehicle.current = telemetry.stoppedVehicle
      return
    }
    if (!robotOnline) {
      prevVehicle.current = telemetry.stoppedVehicle
      return
    }
    if (prevVehicle.current !== null && prevVehicle.current !== telemetry.stoppedVehicle) {
      if (telemetry.stoppedVehicle) {
        addNotif('vehicle', 'Stopped vehicle detected', `Count: ${telemetry.stoppedVehicleCount}`)
      } else {
        addNotif('clear', 'Vehicle cleared', 'No stopped vehicles detected')
      }
    }
    prevVehicle.current = telemetry.stoppedVehicle
  }, [hasAlertFeed, robotOnline, telemetry.stoppedVehicle, telemetry.stoppedVehicleCount, addNotif])

  useEffect(() => {
    if (!latestAlertEvent || latestAlertEvent.id === prevAlertEventId.current) return
    addNotif(
      notificationTypeForAlert(latestAlertEvent),
      latestAlertEvent.title,
      latestAlertEvent.detail || (latestAlertEvent.active ? 'Alert active' : 'Alert cleared'),
    )
    prevAlertEventId.current = latestAlertEvent.id
  }, [latestAlertEvent, addNotif])

  const wrappedSend = useCallback((msg) => {
    send(msg)
    if (msg.type === 'cmd_vel') {
      setLastCmd(`lin=${msg.linear.toFixed(2)} ang=${msg.angular.toFixed(2)}`)
    }
  }, [send])

  function handleEStop() {
    send({ type: 'estop' })
    wrappedSend({ type: 'cmd_vel', linear: 0, angular: 0 })
    setTeleopEnabled(false)
    setEstopActive(true)
    setTimeout(() => setEstopActive(false), 3000)
  }

  const isLive = relayOnline && robotOnline
  const bannerAlert = getBannerAlert(activeAlerts, telemetry)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Emergency stop bar */}
      {(telemetry.safetyStop || isEmergencyBehavior(telemetry.behavior)) && (
        <div style={{
          background: '#d63c2a',
          color: '#fff',
          textAlign: 'center',
          padding: '8px',
          fontFamily: "'DM Mono', monospace",
          fontSize: '11px',
          letterSpacing: '4px',
          textTransform: 'uppercase',
          flexShrink: 0,
          animation: 'flash 1s infinite',
        }}>
          ⚠ Emergency Stop Active
        </div>
      )}

      {bannerAlert && <DetectionBanner alert={bannerAlert} />}

      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '52px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #dde3ee',
        flexShrink: 0,
      }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '13px', fontWeight: 500, letterSpacing: '4px', textTransform: 'uppercase', color: '#1a1917' }}>
          A.R.E.<span style={{ color: '#F5C200' }}>S</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#8896ab', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Lincoln Tunnel · TBR-07
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '13px', color: '#4a5568', letterSpacing: '1px' }}>
            {clock}
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '4px 10px',
            border: `1px solid ${isLive ? '#b8e0cc' : '#bdc8dc'}`,
            background: isLive ? '#f0f8f4' : '#f4f6fb',
            fontFamily: "'DM Mono', monospace",
            fontSize: '9px',
            letterSpacing: '2px',
            color: isLive ? '#2a7d4f' : '#8896ab',
            textTransform: 'uppercase',
            borderRadius: '20px',
          }}>
            <span style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: 'currentColor',
              animation: isLive ? 'blink 2s infinite' : undefined,
            }} />
            {isLive ? 'Live' : relayOnline ? 'Relay only' : 'Offline'}
          </div>
          <button
            onClick={onLogout}
            style={{
              background: 'none', border: '1px solid #dde3ee', cursor: 'pointer',
              fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '2px',
              textTransform: 'uppercase', color: '#8896ab', padding: '4px 10px',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#4a5568'; e.currentTarget.style.color = '#1a1917' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#dde3ee'; e.currentTarget.style.color = '#8896ab' }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <LeftNav active={activeView} onChange={setActiveView} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeView === 'camera' && (
            <CameraView
              stoppedVehicle={telemetry.stoppedVehicle}
              behavior={telemetry.behavior}
              stoppedVehicleCount={telemetry.stoppedVehicleCount}
              uptime={uptime}
            />
          )}
          {activeView === 'sensors' && (
            <SensorView telemetry={telemetry} />
          )}
          {activeView === 'controls' && (
            <ControlView
              send={wrappedSend}
              robotOnline={robotOnline}
              teleopEnabled={teleopEnabled}
              setTeleopEnabled={setTeleopEnabled}
              estopActive={estopActive}
              handleEStop={handleEStop}
              lastCmd={lastCmd}
            />
          )}
        </div>

        {activeView === 'camera' && (
          <RightPanel
            behavior={telemetry.behavior}
            robotOnline={robotOnline}
            notifications={notifications}
          />
        )}
      </div>
    </div>
  )
}
