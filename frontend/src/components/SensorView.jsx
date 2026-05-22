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
    bay1Temperature, bay1Humidity, bay1Co2,
    bay2Temperature, bay2Humidity, bay2Co2,
    bay3Temperature, bay3Humidity, bay3Co2,
    bay4Temperature, bay4Humidity, bay4Co2,
    exhaustFan1Rpm, exhaustFan2Rpm, exhaustFan3Rpm, exhaustFan4Rpm,
    intakeFan1Rpm, intakeFan2Rpm, intakeFan3Rpm, intakeFan4Rpm,
    intakeFan5Rpm, intakeFan6Rpm, intakeFan7Rpm, intakeFan8Rpm,
    intakeFan9Rpm, intakeFan10Rpm,
    fansExhaustSpeed,
    fansIntakeSpeed,
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

  function renderBaySection(label, bay1, bay2, bay3, bay4, unit) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'underline' }}>
          {label}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee' }}>
          <StatusCard label="Bay 1" value={formatSensor(bay1, unit)} />
          <StatusCard label="Bay 2" value={formatSensor(bay2, unit)} />
          <StatusCard label="Bay 3" value={formatSensor(bay3, unit)} />
          <StatusCard label="Bay 4" value={formatSensor(bay4, unit)} />
        </div>
      </div>
    )
  }

  function renderFanRpmCard(label, rpm) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff', padding: '18px 20px', minHeight: '80px' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#1a1917', letterSpacing: '2px' }}>
          {label}
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: '#1a1917' }}>
          {formatSensor(rpm, ' RPM')}
        </div>
      </div>
    )
  }

  function renderFanSubsections() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', gridColumn: '1 / -1' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'underline' }}>
              Fan Speed Setpoints
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee' }}>
              <StatusCard label="Exhaust Speed" value={formatSensor(fansExhaustSpeed, '')} />
              <StatusCard label="Intake Speed"  value={formatSensor(fansIntakeSpeed,  '')} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'underline' }}>
            Exhaust Fans
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee' }}>
            {renderFanRpmCard('Exhaust Fan 1', exhaustFan1Rpm)}
            {renderFanRpmCard('Exhaust Fan 2', exhaustFan2Rpm)}
            {renderFanRpmCard('Exhaust Fan 3', exhaustFan3Rpm)}
            {renderFanRpmCard('Exhaust Fan 4', exhaustFan4Rpm)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#4a5568', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'underline' }}>
            Intake Fans
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee' }}>
            {renderFanRpmCard('Intake Fan 1',  intakeFan1Rpm)}
            {renderFanRpmCard('Intake Fan 2',  intakeFan2Rpm)}
            {renderFanRpmCard('Intake Fan 3',  intakeFan3Rpm)}
            {renderFanRpmCard('Intake Fan 4',  intakeFan4Rpm)}
            {renderFanRpmCard('Intake Fan 5',  intakeFan5Rpm)}
            {renderFanRpmCard('Intake Fan 6',  intakeFan6Rpm)}
            {renderFanRpmCard('Intake Fan 7',  intakeFan7Rpm)}
            {renderFanRpmCard('Intake Fan 8',  intakeFan8Rpm)}
            {renderFanRpmCard('Intake Fan 9',  intakeFan9Rpm)}
            {renderFanRpmCard('Intake Fan 10', intakeFan10Rpm)}
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
            {renderBaySection('Temperature',    bay1Temperature, bay2Temperature, bay3Temperature, bay4Temperature, '°C')}
            {renderBaySection('Humidity',       bay1Humidity,    bay2Humidity,    bay3Humidity,    bay4Humidity,    '%')}
            {renderBaySection('Carbon Dioxide', bay1Co2,         bay2Co2,         bay3Co2,         bay4Co2,         ' ppm')}
            {renderInternalSection('Speaker', speaker, '')}
            {renderFanSubsections()}
          </div>
        </div>
      </div>
    </div>
  )
}
