// Props:
//   behavior     – current robot behavior string (e.g. 'PATROL', 'ESTOP')
//   robotOnline  – boolean
//   notifications – array of { id, type, title, detail, time }
//                  type is one of: 'danger' | 'vehicle' | 'clear'
export default function RightPanel({ behavior, robotOnline, notifications }) {
  const stateColors = {
    PATROL:  '#2a7d4f',
    ALERT:   '#c47d0e',
    OBSTRUCTION_ALERT: '#c47d0e',
    STOPPED_VEHICLE_ALERT: '#c47d0e',
    ESTOP:   '#d63c2a',
    EMERGENCY_STOP: '#d63c2a',
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
      {/* Robot state */}
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

      {/* Notification count header */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #dde3ee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '3px', textTransform: 'uppercase' }}>
          Notifications
        </span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '1px', color: notifications.length > 0 ? '#d63c2a' : '#8896ab' }}>
          {notifications.length} event{notifications.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Notification list */}
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
