import { useState, useCallback, useEffect, useRef } from 'react'
import { useRobotSocket } from '../hooks/useRobotSocket'
import StatusCard from '../components/StatusCard'
import CameraView from '../components/CameraView'
import EStop from '../components/EStop'
import Teleop from '../components/Teleop'
import NavGoalForm from '../components/NavGoalForm'


const RAD_TO_DEG = 180 / Math.PI

// ── Icons ────────────────────────────────────────────────
function IconCamera() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}
function IconSensors() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}
function IconControls() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <path d="M12 12h.01M7 12h.01M12 8v8M7 8v8"/>
      <circle cx="17" cy="10" r="1" fill="currentColor"/>
      <circle cx="17" cy="14" r="1" fill="currentColor"/>
    </svg>
  )
}

// ── Left nav ────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'camera',   label: 'Camera',   Icon: IconCamera   },
  { id: 'sensors',  label: 'Sensors',  Icon: IconSensors  },
  { id: 'controls', label: 'Controls', Icon: IconControls },
]

function LeftNav({ active, onChange }) {
  return (
    <nav
      style={{
        width: '200px',
        flexShrink: 0,
        backgroundColor: '#1B3A6B',
        borderRight: '1px solid #16336080',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '8px',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderLeft: isActive ? '3px solid #F5C200' : '3px solid transparent',
              color: isActive ? '#F5C200' : 'rgba(255,255,255,0.5)',
              fontFamily: "'DM Mono', monospace",
              fontSize: '11px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
            }}
          >
            {item.Icon()}
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

// ── Right panel ──────────────────────────────────────────
function RightPanel({ behavior, robotOnline, notifications }) {
  const stateColors = {
    PATROL:  '#2a7d4f',
    ALERT:   '#c47d0e',
    ESTOP:   '#d63c2a',
    UNKNOWN: '#8896ab',
  }
  const color = stateColors[behavior] || stateColors.UNKNOWN

  return (
    <aside
      style={{
        width: '300px',
        flexShrink: 0,
        backgroundColor: '#ffffff',
        borderLeft: '1px solid #dde3ee',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* State block */}
      <div style={{ padding: '20px', borderBottom: '1px solid #dde3ee', flexShrink: 0 }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '6px' }}>
          Robot state
        </p>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '22px', letterSpacing: '2px', fontWeight: 500, color, textTransform: 'uppercase' }}>
          {behavior || 'UNKNOWN'}
        </p>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#8896ab', marginTop: '4px', letterSpacing: '1px' }}>
          {robotOnline ? 'Robot connected' : 'Robot offline'}
        </p>
      </div>

      {/* Notifications */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #dde3ee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '3px', textTransform: 'uppercase' }}>
          Notifications
        </span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '1px', color: notifications.length > 0 ? '#d63c2a' : '#8896ab' }}>
          {notifications.length} event{notifications.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <p style={{ padding: '32px 20px', textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#8896ab', letterSpacing: '1px' }}>
            No events yet
          </p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              style={{
                padding: '11px 20px',
                borderBottom: '1px solid #dde3ee',
                borderLeft: `2px solid ${n.type === 'vehicle' ? '#c47d0e' : n.type === 'clear' ? '#2a7d4f' : '#d63c2a'}`,
                animation: 'slidein 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  color: n.type === 'vehicle' ? '#c47d0e' : n.type === 'clear' ? '#2a7d4f' : '#d63c2a',
                }}>
                  {n.title}
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab' }}>
                  {n.time}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#4a5568', lineHeight: 1.4 }}>{n.detail}</p>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}

// ── Sensor view ──────────────────────────────────────────
function SensorView({ telemetry }) {
  const { battery, speed, odom, cpuTemp } = telemetry
  const headingDeg = odom.heading != null ? (odom.heading * RAD_TO_DEG).toFixed(1) : null

  function batteryColor(v) {
    if (v == null) return '#8896ab'
    if (v > 50) return '#2a7d4f'
    if (v > 20) return '#c47d0e'
    return '#d63c2a'
  }
  function tempColor(v) {
    if (v == null) return '#8896ab'
    if (v > 75) return '#d63c2a'
    if (v > 60) return '#c47d0e'
    return '#2a7d4f'
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '3px', textTransform: 'uppercase' }}>
        Telemetry
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee' }}>
        <StatusCard label="Battery"    value={battery  != null ? `${battery.toFixed(1)}%`          : '—'} color={batteryColor(battery)} />
        <StatusCard label="Speed"      value={speed    != null ? `${speed.toFixed(2)} m/s`          : '—'} />
        <StatusCard label="CPU Temp"   value={cpuTemp  != null ? `${cpuTemp.toFixed(1)}°C`          : '—'} color={tempColor(cpuTemp)} />
        <StatusCard label="Position X" value={odom.x   != null ? `${odom.x.toFixed(3)} m`           : '—'} />
        <StatusCard label="Position Y" value={odom.y   != null ? `${odom.y.toFixed(3)} m`           : '—'} />
        <StatusCard label="Heading"    value={headingDeg != null ? `${headingDeg}°`                 : '—'} />
      </div>
    </div>
  )
}

// ── Control view ─────────────────────────────────────────
function ControlView({ send, robotOnline, teleopEnabled, setTeleopEnabled, estopActive, handleEStop, lastCmd }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '420px' }}>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '3px', textTransform: 'uppercase' }}>
        Controls
      </p>

      <EStop onEStop={handleEStop} active={estopActive} disabled={!robotOnline} />

      <div style={{ background: '#fff', border: '1px solid #dde3ee', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '3px', textTransform: 'uppercase' }}>
            Manual Teleop
          </span>
          <button
            onClick={() => { if (!robotOnline || estopActive) return; setTeleopEnabled(v => !v) }}
            style={{
              padding: '4px 12px',
              fontFamily: "'DM Mono', monospace",
              fontSize: '9px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              border: '1px solid',
              cursor: (!robotOnline || estopActive) ? 'not-allowed' : 'pointer',
              opacity: (!robotOnline || estopActive) ? 0.4 : 1,
              backgroundColor: teleopEnabled ? '#1B3A6B' : 'transparent',
              borderColor: teleopEnabled ? '#1B3A6B' : '#bdc8dc',
              color: teleopEnabled ? '#ffffff' : '#4a5568',
              transition: 'all 0.15s',
            }}
          >
            {teleopEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        <Teleop send={send} enabled={teleopEnabled && robotOnline && !estopActive} />
        {lastCmd && (
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '1px', marginTop: '12px' }}>
            last: {lastCmd}
          </p>
        )}
      </div>

      <NavGoalForm send={send} disabled={teleopEnabled || estopActive || !robotOnline} />
    </div>
  )
}

// ── Clock ────────────────────────────────────────────────
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

// ── Dashboard ────────────────────────────────────────────
export default function Dashboard({ token, onLogout }) {
  const { relayOnline, robotOnline, telemetry, send } = useRobotSocket(token, onLogout)
  const clock = useClock()

  const [activeView,    setActiveView]    = useState('camera')
  const [teleopEnabled, setTeleopEnabled] = useState(false)
  const [estopActive,   setEstopActive]   = useState(false)
  const [lastCmd,       setLastCmd]       = useState(null)
  const [notifications, setNotifications] = useState([])
  const notifId = useRef(0)

  const prevBehavior  = useRef(null)
  const prevRobot     = useRef(null)
  const prevVehicle   = useRef(null)
  const uptimeStart   = useRef(null)
  const [uptime, setUptime] = useState('0m')

  // Uptime counter
  useEffect(() => {
    uptimeStart.current = Date.now()
    const id = setInterval(() => {
      setUptime(Math.floor((Date.now() - uptimeStart.current) / 60000) + 'm')
    }, 10000)
    return () => clearInterval(id)
  }, [])

  // Add notification helper
  const addNotif = useCallback((type, title, detail) => {
    const n = new Date()
    const pad = v => String(v).padStart(2, '0')
    const time = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`
    setNotifications(prev => [{ id: notifId.current++, type, title, detail, time }, ...prev].slice(0, 50))
  }, [])

  // Watch telemetry for notification triggers
  useEffect(() => {
    if (telemetry.behavior && telemetry.behavior !== prevBehavior.current) {
      if (prevBehavior.current !== null) {
        const colors = { ESTOP: 'danger', ALERT: 'vehicle', PATROL: 'clear' }
        addNotif(colors[telemetry.behavior] || 'clear', `State → ${telemetry.behavior}`, 'Behavior state changed')
      }
      prevBehavior.current = telemetry.behavior
    }
  }, [telemetry.behavior, addNotif])

  useEffect(() => {
    if (prevRobot.current !== null && prevRobot.current !== robotOnline) {
      addNotif(robotOnline ? 'clear' : 'danger', robotOnline ? 'Robot connected' : 'Robot disconnected', 'Bridge WebSocket status')
    }
    prevRobot.current = robotOnline
  }, [robotOnline, addNotif])

  useEffect(() => {
    if (prevVehicle.current !== null && prevVehicle.current !== telemetry.stoppedVehicle) {
      if (telemetry.stoppedVehicle) {
        addNotif('vehicle', 'Stopped vehicle detected', `Count: ${telemetry.stoppedVehicleCount}`)
      } else {
        addNotif('clear', 'Vehicle cleared', 'No stopped vehicles detected')
      }
    }
    prevVehicle.current = telemetry.stoppedVehicle
  }, [telemetry.stoppedVehicle, telemetry.stoppedVehicleCount, addNotif])

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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* E-Stop emergency bar */}
      {telemetry.behavior === 'ESTOP' && (
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
          {/* Connection pill */}
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

        {/* Main content */}
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

        <RightPanel
          behavior={telemetry.behavior}
          robotOnline={robotOnline}
          notifications={notifications}
        />
      </div>
    </div>
  )
}
