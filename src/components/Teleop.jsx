import { useTeleop, KEY_MAP } from '../hooks/useTeleop'

const GRID = [
  { key: null, label: '' },
  { key: 'w',  label: 'W' },
  { key: null, label: '' },
  { key: 'a',  label: 'A' },
  { key: null, label: '·', center: true },
  { key: 'd',  label: 'D' },
  { key: null, label: '' },
  { key: 's',  label: 'S' },
  { key: null, label: '' },
]

export default function Teleop({ send, enabled }) {
  const { startCommand, stopCommand } = useTeleop(send, enabled)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
      {GRID.map((cell, i) => {
        const cmd = cell.key ? KEY_MAP[cell.key] : null
        const isKey = !!cell.key

        return (
          <div
            key={i}
            onPointerDown={() => cmd && enabled && startCommand(cmd.linear, cmd.angular)}
            onPointerUp={() => cmd && enabled && stopCommand()}
            onPointerLeave={() => cmd && enabled && stopCommand()}
            style={{
              height: '44px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'DM Mono', monospace",
              fontSize: cell.center ? '18px' : '13px',
              fontWeight: 500,
              letterSpacing: '1px',
              userSelect: 'none',
              cursor: isKey ? (enabled ? 'pointer' : 'not-allowed') : 'default',
              background: isKey ? (enabled ? '#1B3A6B' : '#f4f6fb') : 'transparent',
              color: isKey ? (enabled ? '#ffffff' : '#8896ab') : '#cccccc',
              border: isKey ? '1px solid transparent' : 'none',
              transition: 'background 0.1s, color 0.1s',
            }}
            onMouseEnter={e => { if (isKey && enabled && !cell.center) { e.currentTarget.style.background = '#F5C200'; e.currentTarget.style.color = '#1B3A6B' } }}
            onMouseLeave={e => { if (isKey && enabled && !cell.center) { e.currentTarget.style.background = '#1B3A6B'; e.currentTarget.style.color = '#ffffff' } }}
          >
            {cell.label}
          </div>
        )
      })}
    </div>
  )
}
