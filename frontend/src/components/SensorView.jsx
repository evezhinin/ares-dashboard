import StatusCard from './StatusCard'

const RAD_TO_DEG = 180 / Math.PI

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

// Props: telemetry – the telemetry object from useRobotSocket
//   { battery, speed, odom: { x, y, heading }, cpuTemp }
export default function SensorView({ telemetry }) {
  const { battery, speed, odom, cpuTemp } = telemetry
  const headingDeg = odom.heading != null ? (odom.heading * RAD_TO_DEG).toFixed(1) : null

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '3px', textTransform: 'uppercase' }}>
        Telemetry
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee' }}>
        <StatusCard label="Battery"    value={battery  != null ? `${battery.toFixed(1)}%`     : '—'} color={batteryColor(battery)} />
        <StatusCard label="Speed"      value={speed    != null ? `${speed.toFixed(2)} m/s`     : '—'} />
        <StatusCard label="CPU Temp"   value={cpuTemp  != null ? `${cpuTemp.toFixed(1)}°C`     : '—'} color={tempColor(cpuTemp)} />
        <StatusCard label="Position X" value={odom.x   != null ? `${odom.x.toFixed(3)} m`      : '—'} />
        <StatusCard label="Position Y" value={odom.y   != null ? `${odom.y.toFixed(3)} m`      : '—'} />
        <StatusCard label="Heading"    value={headingDeg != null ? `${headingDeg}°`            : '—'} />
      </div>
    </div>
  )
}
