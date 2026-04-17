import { useState } from 'react'

function isEmergencyBehavior(behavior) {
  return behavior === 'ESTOP' || behavior === 'EMERGENCY_STOP'
}

const CAMERAS = [
  { id: 'front', label: 'Front', src: import.meta.env.VITE_FRONT_PLAYER_URL },
  { id: 'rear',  label: 'Rear',  src: import.meta.env.VITE_REAR_PLAYER_URL  },
  { id: 'side',  label: 'Side',  src: import.meta.env.VITE_SIDE_PLAYER_URL  },
]

function CamSlot({ label, isMain, isActive, onClick, stoppedVehicle, src }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#0d0d0d',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: isActive && !isMain ? 'inset 0 0 0 2px rgba(255,255,255,0.35)' : undefined,
      }}
    >
      {/* Live player iframe */}
      {src ? (
        <iframe
          src={src}
          allow="autoplay"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            border: 'none',
            pointerEvents: isMain ? 'none' : 'none',
          }}
          title={label}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.12)', letterSpacing: '2px', textTransform: 'uppercase' }}>
            No stream
          </span>
        </div>
      )}

      {/* Camera label */}
      <div style={{
        position: 'absolute', top: '10px', left: '10px', zIndex: 10,
        fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '2px',
        color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
        background: 'rgba(0,0,0,0.35)', padding: '2px 6px', backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
      }}>
        {label}
      </div>

      {/* Stream debug label */}
      <div style={{
        position: 'absolute', top: '28px', left: '10px', zIndex: 10,
        fontFamily: "'DM Mono', monospace", fontSize: '8px', letterSpacing: '1px',
        color: src ? 'rgba(127,255,163,0.8)' : 'rgba(255,179,179,0.9)',
        textTransform: 'uppercase',
        background: 'rgba(0,0,0,0.35)', padding: '2px 6px', backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
      }}>
        {src ? 'stream configured' : 'missing stream url'}
      </div>

      {/* Stopped-vehicle alert tag */}
      {stoppedVehicle && isMain && (
        <div style={{
          position: 'absolute', top: '10px', right: '10px', zIndex: 10,
          fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '1px',
          textTransform: 'uppercase', padding: '2px 8px',
          background: 'rgba(196,125,14,0.9)', color: '#fff',
          pointerEvents: 'none',
        }}>
          Vehicle
        </div>
      )}

      {/* Click hint for inactive thumbs */}
      {onClick && !isActive && (
        <div style={{
          position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 10,
          fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '2px',
          color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
          background: 'rgba(0,0,0,0.35)', padding: '2px 8px', backdropFilter: 'blur(4px)',
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          Click to view
        </div>
      )}
    </div>
  )
}

export default function CameraView({ stoppedVehicle, behavior, stoppedVehicleCount, uptime }) {
  const [primaryCam, setPrimaryCam] = useState('front')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#dde3ee', gap: '1px' }}>

      {/* Primary feed */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {CAMERAS.map(cam => (
          <div
            key={cam.id}
            style={{
              position: 'absolute', inset: 0,
              visibility: cam.id === primaryCam ? 'visible' : 'hidden',
            }}
          >
            <CamSlot
              label={cam.label}
              isMain
              isActive={cam.id === primaryCam}
              stoppedVehicle={stoppedVehicle && cam.id === primaryCam}
              src={cam.src}
            />
          </div>
        ))}
      </div>

      {/* Thumbnail strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px', height: '120px', flexShrink: 0 }}>
        {CAMERAS.map(cam => (
          <CamSlot
            key={cam.id}
            label={cam.label}
            isMain={false}
            isActive={primaryCam === cam.id}
            onClick={() => setPrimaryCam(cam.id)}
            stoppedVehicle={false}
            src={cam.src}
          />
        ))}
      </div>

      {/* Status bar */}
      <div style={{
        background: '#ffffff', borderTop: '1px solid #dde3ee',
        display: 'flex', alignItems: 'center', padding: '0 16px',
        height: '36px', gap: '20px', flexShrink: 0,
      }}>
        {[
          { label: 'State',    value: behavior || '—',                                   danger: isEmergencyBehavior(behavior) },
          { label: 'Vehicles', value: stoppedVehicle ? String(stoppedVehicleCount) : '0', danger: stoppedVehicle },
          { label: 'Uptime',   value: uptime },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {s.label}
            <span style={{ color: s.danger ? '#d63c2a' : '#4a5568' }}>{s.value}</span>
            {i < 2 && <span style={{ width: '1px', height: '14px', background: '#dde3ee', marginLeft: '14px' }} />}
          </div>
        ))}
      </div>
    </div>
  )
}
