const DETECTION_ALERT_PRIORITY = {
  stopped_vehicle: 3,
  obstruction: 2,
  person: 1,
}

function formatObstructionDetail(obstruction) {
  const parts = []
  if (obstruction.direction) parts.push(`Dir: ${obstruction.direction}`)
  if (obstruction.distanceM != null) parts.push(`Dist: ${obstruction.distanceM}m`)
  if (obstruction.durationSec != null) parts.push(`For: ${obstruction.durationSec}s`)
  return parts.length > 0 ? parts.join(' | ') : 'Obstacle detected in travel path'
}

function formatPersonDetail(persons) {
  const cameras = Array.isArray(persons.cameras)
    ? persons.cameras
        .map((camera) => (typeof camera === 'string' ? camera : camera?.camera))
        .filter(Boolean)
    : []
  return cameras.length > 0
    ? `Cameras: ${cameras.join(', ')}`
    : 'Confirmed person alert'
}

function getBannerTone(alert) {
  if (alert.category === 'stopped_vehicle') {
    return { background: '#c47d0e', border: '#9b620c', color: '#ffffff' }
  }
  if (alert.level === 'error') {
    return { background: '#d63c2a', border: '#ad2f22', color: '#ffffff' }
  }
  return { background: '#1B3A6B', border: '#163360', color: '#ffffff' }
}

// Called from Dashboard to determine if a banner should be shown.
// Returns the highest-priority alert object, or null if none are active.
export function getBannerAlert(activeAlerts, telemetry) {
  const rankedAlert = [...activeAlerts]
    .filter((alert) => DETECTION_ALERT_PRIORITY[alert.category])
    .sort(
      (a, b) =>
        DETECTION_ALERT_PRIORITY[b.category] -
        DETECTION_ALERT_PRIORITY[a.category],
    )[0]

  if (rankedAlert) return rankedAlert

  if (telemetry.stoppedVehicle) {
    return {
      category: 'stopped_vehicle',
      level: 'warning',
      title: 'Stopped vehicle detected',
      detail:
        telemetry.stoppedVehicleCount > 0
          ? `Count: ${telemetry.stoppedVehicleCount}`
          : 'Confirmed stopped vehicle alert',
    }
  }

  if (telemetry.obstruction.active) {
    return {
      category: 'obstruction',
      level: 'warning',
      title: 'Obstruction detected',
      detail: formatObstructionDetail(telemetry.obstruction),
    }
  }

  if (telemetry.persons.active) {
    return {
      category: 'person',
      level: 'warning',
      title: 'Person detected',
      detail: formatPersonDetail(telemetry.persons),
    }
  }

  return null
}

// Props: alert { category, level, title, detail }
export default function DetectionBanner({ alert }) {
  const tone = getBannerTone(alert)

  return (
    <div
      style={{
        background: tone.background,
        color: tone.color,
        borderBottom: `1px solid ${tone.border}`,
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', opacity: 0.8 }}>
          Detection alert
        </span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {alert.title}
        </span>
        {alert.detail && (
          <span style={{ fontSize: '12px', lineHeight: 1.4, opacity: 0.9 }}>
            {alert.detail}
          </span>
        )}
      </div>

      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.75 }}>
        {alert.category.replace(/_/g, ' ')}
      </span>
    </div>
  )
}
