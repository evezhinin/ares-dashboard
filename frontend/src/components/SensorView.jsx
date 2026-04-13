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
  const {
    battery,
    speed,
    odom,
    cpuTemp,
    temperature,
    humidity,
    carbonDioxide,
    carbonMonoxide,
    ammonia,
    nitricOxide,
    acoustic,
    internalTemperature,
    internalHumidity,
    internalCarbonDioxide,
    speaker,
    fans,
    bodyExhaust,
    hub1Intake,
    hub1Exhaust,
    hub2Intake,
    hub2Exhaust,
  } = telemetry

  const headingDeg = odom.heading != null ? (odom.heading * RAD_TO_DEG).toFixed(1) : null

  function formatSensor(value, unit = '') {
    if (value == null) return '—'
    return typeof value === 'number' ? `${value.toFixed(1)}${unit}` : `${value}${unit}`
  }

  function renderExternalSection(label, value, unit) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee' }}>
          <StatusCard label="Front-End" value={formatSensor(value, unit)} />
          <StatusCard label="Back End" value={formatSensor(value, unit)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee', minHeight: '120px' }}>
          <StatusCard label="Visual Comparison" value={formatSensor(value, unit)} />
        </div>
      </div>
    )
  }

  function renderInternalSection(label, value, unit) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee', minHeight: '140px' }}>
          <StatusCard label={label} value={formatSensor(value, unit)} />
        </div>
      </div>
    )
  }

  function renderInternalGroupedSection(label, value, unit) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee' }}>
          <StatusCard label="Front-End" value={formatSensor(value, unit)} />
          <StatusCard label="Back End" value={formatSensor(value, unit)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee', minHeight: '140px' }}>
          <StatusCard label="Visual Comparison" value={formatSensor(value, unit)} />
        </div>
      </div>
    )
  }

  function renderFanSubsections(label, value, unit) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Front Intake
            </div>
            <div style={{ background: '#fff', padding: '18px 20px', minHeight: '140px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#1a1917' }}>
                <span>Fan 1:</span>
                <span>Fan 2:</span>
                <span>Fan 3:</span>
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: '#1a1917' }}>
                {formatSensor(value, unit)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Back Intake
            </div>
            <StatusCard label="Back Intake" value={formatSensor(value, unit)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Hub 1
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee' }}>
              <StatusCard label="Intake" value={formatSensor(hub1Intake, unit)} />
              <StatusCard label="Exhaust" value={formatSensor(hub1Exhaust, unit)} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Hub 2
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee' }}>
              <StatusCard label="Intake" value={formatSensor(hub2Intake, unit)} />
              <StatusCard label="Exhaust" value={formatSensor(hub2Exhaust, unit)} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Body Exhaust
            </div>
            <StatusCard label="Body Exhaust" value={formatSensor(bodyExhaust, unit)} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '3px', textTransform: 'uppercase' }}>
        Sensors
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: '#1a1917', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
            External Sensors
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {renderExternalSection('Temperature', temperature, '°C')}
            {renderExternalSection('Humidity', humidity, '%')}
            {renderExternalSection('Carbon Dioxide', carbonDioxide, ' ppm')}
            {renderExternalSection('Carbon Monoxide', carbonMonoxide, ' ppm')}
            {renderExternalSection('Ammonia', ammonia, ' ppm')}
            {renderExternalSection('Nitric Oxide', nitricOxide, ' ppm')}
            {renderExternalSection('Acoustic', acoustic, ' dB')}
          </div>
        </div>
        <div>
          <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: '#1a1917', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
            Internal Sensors
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {renderInternalGroupedSection('Temperature', internalTemperature, '°C')}
            {renderInternalGroupedSection('Humidity', internalHumidity, '%')}
            {renderInternalGroupedSection('Carbon Dioxide', internalCarbonDioxide, ' ppm')}
            {renderInternalSection('Speaker', speaker, '')}
            {renderFanSubsections('Fans', fans, '')}
          </div>
        </div>
      </div>
    </div>
  )
}
