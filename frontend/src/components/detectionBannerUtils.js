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
