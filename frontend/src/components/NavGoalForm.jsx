import { useState } from 'react'

const DEG_TO_RAD = Math.PI / 180

const inputStyle = (disabled) => ({
  width: '100%',
  background: disabled ? '#f4f6fb' : '#fff',
  border: '1px solid #dde3ee',
  color: '#1a1917',
  fontFamily: "'DM Mono', monospace",
  fontSize: '12px',
  padding: '7px 10px',
  outline: 'none',
  transition: 'border-color 0.15s',
})

export default function NavGoalForm({ send, disabled }) {
  const [x, setX] = useState('')
  const [y, setY] = useState('')
  const [theta, setTheta] = useState('')

  const [error, setError] = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    const nx = parseFloat(x)
    const ny = parseFloat(y)
    const ntheta = parseFloat(theta)
    if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(ntheta)) {
      setError('All fields must be finite numbers')
      return
    }
    if (Math.abs(nx) > 10000 || Math.abs(ny) > 10000) {
      setError('X/Y out of range (±10 000 m)')
      return
    }
    setError(null)
    send({ type: 'nav_goal', x: nx, y: ny, theta: ntheta * DEG_TO_RAD })
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #dde3ee', padding: '16px' }}>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '14px' }}>
        Nav Goal
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[
          { label: 'X (m)',    val: x,     set: setX     },
          { label: 'Y (m)',    val: y,     set: setY     },
          { label: 'Theta (°)', val: theta, set: setTheta },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <label style={{ display: 'block', fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
              {label}
            </label>
            <input
              type="number" step="any"
              value={val} onChange={e => set(e.target.value)}
              placeholder="0.000" disabled={disabled}
              style={inputStyle(disabled)}
              onFocus={e => { if (!disabled) e.target.style.borderColor = '#4a5568' }}
              onBlur={e => { e.target.style.borderColor = '#dde3ee' }}
              required
            />
          </div>
        ))}
        <button
          type="submit" disabled={disabled}
          style={{
            padding: '8px', background: disabled ? 'transparent' : '#1B3A6B',
            border: `1px solid ${disabled ? '#dde3ee' : '#1B3A6B'}`,
            color: disabled ? '#8896ab' : '#fff',
            fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '2px',
            textTransform: 'uppercase', cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#F5C200'; if (!disabled) e.currentTarget.style.color = '#1B3A6B'; if (!disabled) e.currentTarget.style.borderColor = '#F5C200' }}
          onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = '#1B3A6B'; if (!disabled) e.currentTarget.style.color = '#fff'; if (!disabled) e.currentTarget.style.borderColor = '#1B3A6B' }}
        >
          Send Nav Goal →
        </button>
        {error && (
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#d63c2a', letterSpacing: '1px', marginTop: '6px' }}>
            {error}
          </p>
        )}
      </form>
    </div>
  )
}
