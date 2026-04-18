import { useRef, useCallback } from 'react'
import StatusCard from './StatusCard'

const RAD_TO_DEG = 180 / Math.PI
const HISTORY_MS = 5 * 60 * 1000  // 5 minutes
const MAX_POINTS = 300             // 1 sample/sec → 5 min

// ── Inline SVG line graph ─────────────────────────────────────────────────────
// history: [{ ts, front, back }, ...]
function LineGraph({ history, frontColor = '#2a7d4f', backColor = '#1a5fa8', unit = '' }) {
  const W = 480
  const H = 100
  const PAD = { top: 8, right: 8, bottom: 20, left: 38 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  if (!history || history.length < 2) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }}>
        <text
          x={W / 2} y={H / 2}
          textAnchor="middle" dominantBaseline="middle"
          fontFamily="'DM Mono', monospace" fontSize="10" fill="#8896ab"
        >
          Awaiting data…
        </text>
      </svg>
    )
  }

  const allVals = history.flatMap(p => [p.front, p.back]).filter(v => v != null)
  const rawMin  = Math.min(...allVals)
  const rawMax  = Math.max(...allVals)
  const span    = rawMax - rawMin || 1
  const yMin    = rawMin - span * 0.1
  const yMax    = rawMax + span * 0.1

  const tsMin  = history[0].ts
  const tsMax  = history[history.length - 1].ts
  const tsSpan = tsMax - tsMin || 1

  function xOf(ts)  { return PAD.left + ((ts - tsMin) / tsSpan) * innerW }
  function yOf(val) { return PAD.top  + (1 - (val - yMin) / (yMax - yMin)) * innerH }

  function toPolyline(key) {
    return history
      .filter(p => p[key] != null)
      .map(p => `${xOf(p.ts).toFixed(1)},${yOf(p[key]).toFixed(1)}`)
      .join(' ')
  }

  const ticks = Array.from({ length: 5 }, (_, i) => {
    const val = yMin + (yMax - yMin) * (i / 4)
    return { y: yOf(val), label: val.toFixed(1) }
  })

  const xLabels = [
    { x: xOf(tsMin),               label: '−5m'   },
    { x: xOf((tsMin + tsMax) / 2), label: '−2.5m' },
    { x: xOf(tsMax),               label: 'now'   },
  ]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }}>
      {ticks.map((t, i) => (
        <line key={i}
          x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y}
          stroke="#dde3ee" strokeWidth="1" />
      ))}
      {ticks.map((t, i) => (
        <text key={i} x={PAD.left - 4} y={t.y}
          textAnchor="end" dominantBaseline="middle"
          fontFamily="'DM Mono', monospace" fontSize="8" fill="#8896ab">
          {t.label}
        </text>
      ))}
      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={H - 4}
          textAnchor="middle"
          fontFamily="'DM Mono', monospace" fontSize="8" fill="#8896ab">
          {l.label}
        </text>
      ))}
      <polyline points={toPolyline('back')}
        fill="none" stroke={backColor} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={toPolyline('front')}
        fill="none" stroke={frontColor} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
      <rect x={PAD.left} y={PAD.top} width="8" height="8" rx="1" fill={frontColor} />
      <text x={PAD.left + 11} y={PAD.top + 4}
        dominantBaseline="middle"
        fontFamily="'DM Mono', monospace" fontSize="8" fill="#4a5568">
        Front
      </text>
      <rect x={PAD.left + 46} y={PAD.top} width="8" height="8" rx="1" fill={backColor} />
      <text x={PAD.left + 57} y={PAD.top + 4}
        dominantBaseline="middle"
        fontFamily="'DM Mono', monospace" fontSize="8" fill="#4a5568">
        Back
      </text>
    </svg>
  )
}

// ── Shared style constants ────────────────────────────────────────────────────
const sectionLabel = {
  fontFamily: "'DM Mono', monospace",
  fontSize: '10px',
  color: '#4a5568',
  letterSpacing: '2px',
  textTransform: 'uppercase',
  textDecoration: 'underline',
}
const twoColGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))',
  gap: '1px',
  background: '#dde3ee',
  border: '1px solid #dde3ee',
}
const graphWrapper = {
  background: '#dde3ee',
  border: '1px solid #dde3ee',
  padding: '1px',
  minHeight: '120px',
}
const graphInner = {
  background: '#fff',
  padding: '10px',
  height: '100%',
  boxSizing: 'border-box',
}

// ── Fan status badge ──────────────────────────────────────────────────────────
function FanStatusBadge({ label, active, activeColor = '#d63c2a', inactiveColor = '#2a7d4f' }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      fontFamily: "'DM Mono', monospace", fontSize: '10px',
      color: active ? activeColor : inactiveColor,
    }}>
      <div style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: active ? activeColor : inactiveColor,
      }} />
      {label}: {active ? 'YES ⚠' : 'No'}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SensorView({ telemetry }) {
  const {
    battery, speed, odom, cpuTemp,
    temperature, humidity, carbonDioxide, carbonMonoxide,
    ammonia, nitricOxide,
    internalTemperature, internalHumidity, internalCarbonDioxide,
    speaker, bodyExhaust,
    hub1Intake, hub1Exhaust, hub2Intake, hub2Exhaust,
    // Live sensor data from robot nodes
    sound       = {},  // { front: { db_level, honking_detected }, back: { … } }
    gas         = {},  // { front: { co_ppm, nh3_ppm, no2_ppm, … }, back: { … } }
    sensors     = {},  // { front: { co2, temperature, humidity }, back: { … } }
    scd41_bays  = {},  // { bay_1: { co2, temperature, humidity }, bay_2: …, bay_3: …, bay_4: … }
    fans        = {},  // { intake_speed, exhaust_speed, co2_purge_active, emergency, shutdown, temperature, co2 }
    lights      = {},  // { lights_on }
  } = telemetry

  const headingDeg = odom?.heading != null ? (odom.heading * RAD_TO_DEG).toFixed(1) : null

  // ── Rolling history refs ──────────────────────────────────────────────────
  const histories = useRef({
    temperature:    [],
    humidity:       [],
    carbonDioxide:  [],
    carbonMonoxide: [],
    ammonia:        [],
    nitricOxide:    [],
    acoustic:       [],
  })

  const pushHistory = useCallback((key, frontVal, backVal) => {
    if (frontVal == null && backVal == null) return
    const now    = Date.now()
    const cutoff = now - HISTORY_MS
    const arr    = histories.current[key]
    arr.push({ ts: now, front: frontVal ?? null, back: backVal ?? null })
    while (arr.length > 0 && arr[0].ts < cutoff) arr.shift()
    if (arr.length > MAX_POINTS) arr.splice(0, arr.length - MAX_POINTS)
  }, [])

  // Record a data point on every render
  pushHistory('temperature',    sensors?.front?.temperature ?? temperature,  sensors?.back?.temperature ?? temperature)
  pushHistory('humidity',       sensors?.front?.humidity    ?? humidity,     sensors?.back?.humidity    ?? humidity)
  pushHistory('carbonDioxide',  sensors?.front?.co2         ?? carbonDioxide, sensors?.back?.co2        ?? carbonDioxide)
  pushHistory('carbonMonoxide', gas?.front?.co_ppm          ?? carbonMonoxide, gas?.back?.co_ppm         ?? carbonMonoxide)
  pushHistory('ammonia',        gas?.front?.nh3_ppm         ?? ammonia,      gas?.back?.nh3_ppm         ?? ammonia)
  pushHistory('nitricOxide',    gas?.front?.no2_ppm         ?? nitricOxide,  gas?.back?.no2_ppm         ?? nitricOxide)
  pushHistory('acoustic',       sound?.front?.db_level,                      sound?.back?.db_level)

  // ── Format helpers ────────────────────────────────────────────────────────
  function formatSensor(value, unit = '') {
    if (value == null) return '—'
    return typeof value === 'number' ? `${value.toFixed(1)}${unit}` : `${value}${unit}`
  }
  function formatSensor2(value, unit = '') {
    if (value == null) return '—'
    return typeof value === 'number' ? `${value.toFixed(2)}${unit}` : `${value}${unit}`
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderFrontBackSection(label, frontValue, backValue, historyKey, unit, decimals = 1) {
    const fmt = decimals === 2 ? formatSensor2 : formatSensor
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={sectionLabel}>{label}</div>
        <div style={twoColGrid}>
          <StatusCard label="Front-End" value={fmt(frontValue, unit)} />
          <StatusCard label="Back End"  value={fmt(backValue,  unit)} />
        </div>
        <div style={graphWrapper}>
          <div style={graphInner}>
            <LineGraph history={histories.current[historyKey]} unit={unit} />
          </div>
        </div>
      </div>
    )
  }

  function renderHonkingSection(label, frontHonking, backHonking) {
    const fmt = (v) => (v == null ? '—' : v ? 'YES ⚠' : 'No')
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={sectionLabel}>{label}</div>
        <div style={twoColGrid}>
          <StatusCard
            label="Front-End"
            value={fmt(frontHonking)}
            valueStyle={{ color: frontHonking ? '#d63c2a' : '#2a7d4f' }}
          />
          <StatusCard
            label="Back End"
            value={fmt(backHonking)}
            valueStyle={{ color: backHonking ? '#d63c2a' : '#2a7d4f' }}
          />
        </div>
        <div style={graphWrapper}>
          <div style={graphInner}>
            <LineGraph
              history={histories.current.acoustic}
              frontColor={sound?.front?.honking_detected ? '#d63c2a' : '#2a7d4f'}
              backColor={sound?.back?.honking_detected   ? '#d63c2a' : '#1a5fa8'}
              unit=" dB"
            />
          </div>
        </div>
      </div>
    )
  }

  // Internal sections — static StatusCards, no graphs
  function renderInternalSection(label, value, unit) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={sectionLabel}>{label}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee', minHeight: '140px' }}>
          <StatusCard label={label} value={formatSensor(value, unit)} />
        </div>
      </div>
    )
  }

  // Internal SCD41 — 4 bay cards, no graph, no Visual Comparison
  function renderInternalGroupedSection(label, dataKey, unit) {
    const bays = [
      { label: 'Bay 1', data: scd41_bays?.bay_1 },
      { label: 'Bay 2', data: scd41_bays?.bay_2 },
      { label: 'Bay 3', data: scd41_bays?.bay_3 },
      { label: 'Bay 4', data: scd41_bays?.bay_4 },
    ]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={sectionLabel}>{label}</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1px',
          background: '#dde3ee',
          border: '1px solid #dde3ee',
        }}>
          {bays.map(({ label: bayLabel, data }) => (
            <StatusCard
              key={bayLabel}
              label={bayLabel}
              value={formatSensor(data?.[dataKey], unit)}
            />
          ))}
        </div>
      </div>
    )
  }

  // ── Fan subsections — now driven by live fan_data ─────────────────────────
  function renderFanSubsections() {
    const intakeSpeed  = fans?.intake_speed
    const exhaustSpeed = fans?.exhaust_speed
    const purgeActive  = fans?.co2_purge_active
    const emergency    = fans?.emergency
    const shutdown     = fans?.shutdown

    // Highlight speed values red in emergency/purge, amber in purge only
    const speedColor = emergency || shutdown
      ? '#d63c2a'
      : purgeActive ? '#c47d0e' : '#1a1917'

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={sectionLabel}>Fans</div>

        {/* Status row — mode flags */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <FanStatusBadge label="CO2 Purge"  active={purgeActive} activeColor="#c47d0e" />
          <FanStatusBadge label="Emergency"  active={emergency} />
          <FanStatusBadge label="Shutdown"   active={shutdown} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))', gap: '16px' }}>

          {/* Front Intake — fans 1, 2, 3 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={sectionLabel}>Front Intake</div>
            <div style={{ background: '#fff', padding: '18px 20px', minHeight: '140px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#1a1917' }}>
                <span>Fan 1:</span><span>Fan 2:</span><span>Fan 3:</span>
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: speedColor }}>
                {intakeSpeed != null ? `${intakeSpeed.toFixed(1)}%` : '—'}
              </div>
            </div>
          </div>

          {/* Back Intake — fans 4, 5, 6 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={sectionLabel}>Back Intake</div>
            <div style={{ background: '#fff', padding: '18px 20px', minHeight: '140px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#1a1917' }}>
                <span>Fan 4:</span><span>Fan 5:</span><span>Fan 6:</span>
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: speedColor }}>
                {intakeSpeed != null ? `${intakeSpeed.toFixed(1)}%` : '—'}
              </div>
            </div>
          </div>

          {/* Hub 1 — fans 7, 8 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={sectionLabel}>Hub 1</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff', padding: '18px 20px', minHeight: '140px' }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#1a1917', letterSpacing: '2px' }}>Fan 7:</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: speedColor }}>
                  {hub1Intake != null ? `${Number(hub1Intake).toFixed(1)}%` : (intakeSpeed != null ? `${intakeSpeed.toFixed(1)}%` : '—')}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff', padding: '18px 20px', minHeight: '140px' }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#1a1917', letterSpacing: '2px' }}>Fan 8:</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: speedColor }}>
                  {hub1Exhaust != null ? `${Number(hub1Exhaust).toFixed(1)}%` : (exhaustSpeed != null ? `${exhaustSpeed.toFixed(1)}%` : '—')}
                </div>
              </div>
            </div>
          </div>

          {/* Hub 2 — fans 9, 10 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={sectionLabel}>Hub 2</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff', padding: '18px 20px', minHeight: '140px' }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#1a1917', letterSpacing: '2px' }}>Fan 9:</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: speedColor }}>
                  {hub2Intake != null ? `${Number(hub2Intake).toFixed(1)}%` : (intakeSpeed != null ? `${intakeSpeed.toFixed(1)}%` : '—')}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff', padding: '18px 20px', minHeight: '140px' }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#1a1917', letterSpacing: '2px' }}>Fan 10:</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: speedColor }}>
                  {hub2Exhaust != null ? `${Number(hub2Exhaust).toFixed(1)}%` : (exhaustSpeed != null ? `${exhaustSpeed.toFixed(1)}%` : '—')}
                </div>
              </div>
            </div>
          </div>

          {/* Body Exhaust — fans 11–14 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={sectionLabel}>Body Exhaust</div>
            <div style={{ background: '#fff', padding: '18px 20px', minHeight: '140px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: "'DM Mono', monospace", fontSize: '10px', color: '#1a1917' }}>
                <span>Fan 11:</span><span>Fan 12:</span><span>Fan 13:</span><span>Fan 14:</span>
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: speedColor }}>
                {exhaustSpeed != null ? `${exhaustSpeed.toFixed(1)}%` : (bodyExhaust != null ? `${Number(bodyExhaust).toFixed(1)}%` : '—')}
              </div>
            </div>
          </div>

        </div>
      </div>
    )
  }

  // ── Light section ─────────────────────────────────────────────────────────
  function renderLightSection() {
    const on = lights?.lights_on
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={sectionLabel}>Tunnel Lights</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1px', background: '#dde3ee', border: '1px solid #dde3ee', minHeight: '80px' }}>
          <StatusCard
            label="Lights On"
            value={on == null ? '—' : on ? 'ON' : 'OFF'}
            valueStyle={{ color: on ? '#2a7d4f' : '#8896ab' }}
          />
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

        {/* ── External Sensors ─────────────────────────────────────────────── */}
        <div>
          <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', fontWeight: 'bold', color: '#1a1917', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
            External Sensors
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {renderFrontBackSection('Temperature',     sensors?.front?.temperature ?? temperature,   sensors?.back?.temperature ?? temperature,   'temperature',    '°C')}
            {renderFrontBackSection('Humidity',        sensors?.front?.humidity    ?? humidity,      sensors?.back?.humidity    ?? humidity,      'humidity',       '%')}
            {renderFrontBackSection('Carbon Dioxide',  sensors?.front?.co2         ?? carbonDioxide, sensors?.back?.co2         ?? carbonDioxide, 'carbonDioxide',  ' ppm')}
            {renderFrontBackSection('Carbon Monoxide', gas?.front?.co_ppm          ?? carbonMonoxide, gas?.back?.co_ppm         ?? carbonMonoxide, 'carbonMonoxide', ' ppm')}
            {renderFrontBackSection('Ammonia',         gas?.front?.nh3_ppm         ?? ammonia,       gas?.back?.nh3_ppm         ?? ammonia,       'ammonia',        ' ppm')}
            {renderFrontBackSection('Nitric Oxide',    gas?.front?.no2_ppm         ?? nitricOxide,   gas?.back?.no2_ppm         ?? nitricOxide,   'nitricOxide',    ' ppm', 2)}
            {renderFrontBackSection('Acoustic',        sound?.front?.db_level,                       sound?.back?.db_level,                       'acoustic',       ' dB')}
            {renderHonkingSection('Honking Detected',  sound?.front?.honking_detected, sound?.back?.honking_detected)}
          </div>
        </div>

        {/* ── Internal Sensors ─────────────────────────────────────────────── */}
        <div>
          <h3 style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', fontWeight: 'bold', color: '#1a1917', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
            Internal Sensors
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {renderInternalGroupedSection('Temperature',    'temperature', '°C')}
            {renderInternalGroupedSection('Humidity',       'humidity',    '%')}
            {renderInternalGroupedSection('Carbon Dioxide', 'co2',         ' ppm')}
            {renderInternalSection('Speaker', speaker, '')}
            {renderFanSubsections()}
            {renderLightSection()}
          </div>
        </div>

      </div>
    </div>
  )
}