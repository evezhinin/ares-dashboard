import { useState } from 'react'

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onLogin(password)
    } catch (err) {
      setError(err.message || 'Invalid password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#1B3A6B',
      backgroundImage: 'linear-gradient(rgba(245,194,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(245,194,0,0.04) 1px, transparent 1px)',
      backgroundSize: '40px 40px',
    }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src="/ares_white_logo.png"
            alt="ARES"
            style={{ width: '100%', maxWidth: '240px', height: 'auto', display: 'inline-block' }}
          />
        </div>

        {/* Card */}
        <div style={{ background: '#fff', border: '1px solid rgba(245,194,0,0.3)', padding: '28px' }}>
          <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: '#1a1917', marginBottom: '4px', fontWeight: 500, textAlign: 'center' }}>
            Mission Control
          </h1>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '24px', textAlign: 'center'}}>
            Authorized personnel only
          </p>

          <form onSubmit={handleSubmit}>
            {/* <label style={{ display: 'block', fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>
              Operator Password
            </label> */}
            <input
              id="operator-password"
              name="operatorPassword"
              type="password"
              autoComplete="current-password"
              placeholder="Enter access code"
              value={password}
              onChange={e => { setPassword(e.target.value); if (error) setError('') }}
              required
              style={{
                width: '100%', background: '#f4f6fb', border: '1px solid #dde3ee',
                fontFamily: "'DM Mono', monospace", fontSize: '13px', color: '#1a1917',
                padding: '9px 12px', outline: 'none', marginBottom: '12px', transition: 'border-color 0.15s', textAlign: 'center',
              }}
              onFocus={e => e.target.style.borderColor = '#1B3A6B'}
              onBlur={e => e.target.style.borderColor = '#dde3ee'}
            />

            {error && (
              <div style={{
                marginBottom: '12px', padding: '8px 12px',
                border: '1px solid #d63c2a', background: 'rgba(214,60,42,0.06)',
                fontFamily: "'DM Mono', monospace", fontSize: '11px', color: '#d63c2a', letterSpacing: '0.5px',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              style={{
                width: '100%', padding: '10px',
                background: loading || !password ? 'transparent' : '#1B3A6B',
                border: `1px solid ${loading || !password ? '#dde3ee' : '#1B3A6B'}`,
                color: loading || !password ? '#8896ab' : '#fff',
                fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '3px',
                textTransform: 'uppercase', cursor: loading || !password ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!loading && password) { e.currentTarget.style.background = '#F5C200'; e.currentTarget.style.color = '#1B3A6B'; e.currentTarget.style.borderColor = '#F5C200' } }}
              onMouseLeave={e => { if (!loading && password) { e.currentTarget.style.background = '#1B3A6B'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#1B3A6B' } }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', border: '1.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  Authenticating
                </span>
              ) : 'Gain Access →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
