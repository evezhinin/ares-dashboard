export default function StatusCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '2px', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 500, color: color || '#1a1917' }}>
        {value}
      </span>
    </div>
  )
}
