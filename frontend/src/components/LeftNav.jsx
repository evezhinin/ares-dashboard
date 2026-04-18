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

function IconComms() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
      <path d="M19 11a7 7 0 0 1-14 0"/>
      <path d="M12 18v4"/>
      <path d="M8 22h8"/>
    </svg>
  )
}

const NAV_ITEMS = [
  { id: 'camera',   label: 'Camera',   Icon: IconCamera   },
  { id: 'sensors',  label: 'Sensors',  Icon: IconSensors  },
  { id: 'controls', label: 'Controls', Icon: IconControls },
  { id: 'comms',    label: 'Comms',    Icon: IconComms    },
]

// Props: active (string id of the selected view), onChange (fn called with item id on click)
export default function LeftNav({ active, onChange }) {
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
