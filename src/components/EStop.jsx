export default function EStop({ onEStop, active, disabled }) {
  return (
    <button
      onClick={onEStop}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '18px',
        background: active ? '#b02d1f' : '#d63c2a',
        color: '#fff',
        border: 'none',
        fontFamily: "'DM Mono', monospace",
        fontSize: '13px',
        fontWeight: 500,
        letterSpacing: '4px',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        animation: active ? 'flash 0.5s infinite' : undefined,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.background = '#b02d1f' }}
      onMouseLeave={e => { if (!disabled && !active) e.currentTarget.style.background = '#d63c2a' }}
    >
      ⏹ Emergency Stop
    </button>
  )
}
