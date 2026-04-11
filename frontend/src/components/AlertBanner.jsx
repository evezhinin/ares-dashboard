export default function AlertBanner({ count }) {
  return (
    <div
      className="flex items-center gap-3 px-6 py-3"
      style={{ backgroundColor: 'rgba(245,194,0,0.15)', borderBottom: '1px solid #F5C200' }}
    >
      <span
        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
        style={{
          backgroundColor: '#F5C200',
          animation: 'pulse-dot 1s ease-in-out infinite',
        }}
      />
      <span className="font-bold" style={{ color: '#2A2A2A', fontSize: '13px', letterSpacing: '0.05em' }}>
        STOPPED VEHICLE DETECTED · COUNT: {count}
      </span>
    </div>
  )
}
