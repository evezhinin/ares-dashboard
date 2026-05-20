function getBannerTone(alert) {
  if (alert.category === 'stopped_vehicle') {
    return { background: '#c47d0e', border: '#9b620c', color: '#ffffff' }
  }
  if (alert.level === 'error') {
    return { background: '#d63c2a', border: '#ad2f22', color: '#ffffff' }
  }
  return { background: '#1B3A6B', border: '#163360', color: '#ffffff' }
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
