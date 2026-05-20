import StatusCard from './StatusCard'

// Props: telemetry – the telemetry object from useRobotSocket
//   { battery, speed, odom: { x, y, heading }, cpuTemp }
export default function SensorView({ telemetry }) {
  const {
    // battery,
    // speed,
    // odom,
    // cpuTemp,
    // temperature,
    // humidity,
    // carbonDioxide,
    // carbonMonoxide,
    // ammonia,
    // nitricOxide,
    // acoustic,
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
    temperatureFront, temperatureBack,
    humidityFront,    humidityBack,
    co2Front,         co2Back,
    coFront,          coBack,
    nh3Front,         nh3Back,
    no2Front,         no2Back,
    soundDbFront,     soundDbBack,
    // honkingFront,     honkingBack,
  } = telemetry

  function formatSensor(value, unit = '') {
    if (value == null) return '—'
    return typeof value === 'number' ? `${value.toFixed(1)}${unit}` : `${value}${unit}`
  }

  function renderExternalSection(label, frontValue, backValue, unit) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'underline' }}>
          {label}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee' }}>
          <StatusCard label="Front" value={formatSensor(frontValue, unit)} />
          <StatusCard label="Back"  value={formatSensor(backValue,  unit)} />
        </div>
      </div>
    )
  }

  function renderInternalSection(label, value, unit) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'underline' }}>
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
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'underline' }}>
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
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'underline' }}>
          {label}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'underline' }}>
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
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'underline' }}>
              Back Intake
            </div>
            <div style={{ background: '#fff', padding: '18px 20px', minHeight: '140px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#1a1917' }}>
                <span>Fan 4:</span>
                <span>Fan 5:</span>
                <span>Fan 6:</span>
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: '#1a1917' }}>
                {formatSensor(value, unit)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'underline' }}>
              Hub 1
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff', padding: '18px 20px', minHeight: '140px' }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#1a1917', letterSpacing: '2px' }}>
                  Fan 7:
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: '#1a1917' }}>
                  {formatSensor(hub1Intake, unit)}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff', padding: '18px 20px', minHeight: '140px' }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#1a1917', letterSpacing: '2px' }}>
                  Fan 8:
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: '#1a1917' }}>
                  {formatSensor(hub1Exhaust, unit)}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'underline' }}>
              Hub 2
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff', padding: '18px 20px', minHeight: '140px' }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#1a1917', letterSpacing: '2px' }}>
                  Fan 9:
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: '#1a1917' }}>
                  {formatSensor(hub2Intake, unit)}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff', padding: '18px 20px', minHeight: '140px' }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#1a1917', letterSpacing: '2px' }}>
                  Fan 10:
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: '#1a1917' }}>
                  {formatSensor(hub2Exhaust, unit)}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'underline' }}>
              Body Exhaust
            </div>
            <div style={{ background: '#fff', padding: '18px 20px', minHeight: '140px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#1a1917' }}>
                <span>Fan 11:</span>
                <span>Fan 12:</span>
                <span>Fan 13:</span>
                <span>Fan 14:</span>
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: '#1a1917' }}>
                {formatSensor(bodyExhaust, unit)}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '14px', fontWeight: 'bold', color: '#8896ab', letterSpacing: '3px', textTransform: 'uppercase' }}>
        Sensors
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', fontWeight: 'bold', color: '#1a1917', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
            External Sensors
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {renderExternalSection('Temperature',    temperatureFront, temperatureBack, '°C')}
              {renderExternalSection('Humidity',       humidityFront,    humidityBack,    '%')}
              {renderExternalSection('Carbon Dioxide', co2Front,         co2Back,         ' ppm')}
              {renderExternalSection('Carbon Monoxide',coFront,          coBack,          ' ppm')}
              {renderExternalSection('Ammonia',        nh3Front,         nh3Back,         ' ppm')}
              {renderExternalSection('Nitric Oxide',   no2Front,         no2Back,         ' ppm')}
              {renderExternalSection('Acoustic',       soundDbFront,     soundDbBack,     ' dB')}
          </div>
        </div>
        <div>
          <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', fontWeight: 'bold', color: '#1a1917', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
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
