import { useEffect, useRef, useState } from 'react'

// WebRTC feed for a single camera slot
function CamSlot({ label, isMain, isActive, onClick, stoppedVehicle, whepUrl }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const pcRef = useRef(null)

  useEffect(() => {
    if (!whepUrl) return

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })
    pcRef.current = pc

    pc.ontrack = (e) => {
      if (videoRef.current) videoRef.current.srcObject = e.streams[0]
    }

    async function start() {
      try {
        pc.addTransceiver('video', { direction: 'recvonly' })
        pc.addTransceiver('audio', { direction: 'recvonly' })
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        const res = await fetch(whepUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp,
        })
        if (!res.ok) return
        const sdp = await res.text()
        await pc.setRemoteDescription({ type: 'answer', sdp })
      } catch {
        // stream unavailable
      }
    }
    start()
    return () => pc.close()
  }, [whepUrl])

  // Bounding box overlay for main slot only
  useEffect(() => {
    if (!isMain || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (stoppedVehicle) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = '#F5C200'
      ctx.lineWidth = 2
      const w = canvas.width * 0.4
      const h = canvas.height * 0.35
      const x = (canvas.width - w) / 2
      const y = (canvas.height - h) / 2
      ctx.strokeRect(x, y, w, h)
      ctx.fillStyle = '#F5C200'
      ctx.font = '500 10px "DM Mono", monospace'
      ctx.fillText('STOPPED VEHICLE', x + 4, y - 6)
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [stoppedVehicle, isMain])

  const hasStream = !!whepUrl

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#0d0d0d',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: isActive && !isMain ? 'inset 0 0 0 2px rgba(255,255,255,0.35)' : undefined,
      }}
    >
      {/* Camera label */}
      <div style={{
        position: 'absolute', top: '10px', left: '10px', zIndex: 10,
        fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '2px',
        color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
        background: 'rgba(0,0,0,0.35)', padding: '2px 6px', backdropFilter: 'blur(4px)',
      }}>
        {label}
      </div>

      {/* Alert tag */}
      {stoppedVehicle && isMain && (
        <div style={{
          position: 'absolute', top: '10px', right: '10px', zIndex: 10,
          fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '1px',
          textTransform: 'uppercase', padding: '2px 8px',
          background: 'rgba(196,125,14,0.9)', color: '#fff',
        }}>
          Vehicle
        </div>
      )}

      {/* Video */}
      <video
        ref={videoRef}
        autoPlay muted playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: hasStream ? 'block' : 'none' }}
      />

      {/* Canvas overlay */}
      {isMain && (
        <canvas
          ref={canvasRef}
          width={640} height={360}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />
      )}

      {/* Placeholder */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: hasStream ? 0 : 1,
      }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: 'rgba(255,255,255,0.12)', letterSpacing: '2px', textTransform: 'uppercase' }}>
          No stream
        </span>
      </div>

      {/* Click hint for inactive thumbs */}
      {onClick && !isActive && (
        <div style={{
          position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
          fontFamily: "'DM Mono', monospace", fontSize: '9px', letterSpacing: '2px',
          color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
          background: 'rgba(0,0,0,0.35)', padding: '2px 8px', backdropFilter: 'blur(4px)',
          whiteSpace: 'nowrap',
        }}>
          Click to view
        </div>
      )}
    </div>
  )
}

const CAMERAS = [
  { id: 'ares2', label: 'Front · ares2', whepKey: 'VITE_WHEP_URL' },
  { id: 'rear',  label: 'Rear',          whepKey: null },
  { id: 'side',  label: 'Side',          whepKey: null },
]

export default function CameraView({ stoppedVehicle, behavior, stoppedVehicleCount, uptime }) {
  const [primaryCam, setPrimaryCam] = useState('ares2')

  const stateColors = { PATROL: '#2a7d4f', ALERT: '#c47d0e', ESTOP: '#d63c2a', UNKNOWN: '#8896ab' }
  const stateColor = stateColors[behavior] || stateColors.UNKNOWN

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#dde3ee', gap: '1px' }}>

      {/* Primary feed */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {CAMERAS.map(cam => cam.id === primaryCam && (
          <CamSlot
            key={cam.id}
            label={cam.label}
            isMain
            isActive
            stoppedVehicle={stoppedVehicle}
            whepUrl={cam.whepKey ? import.meta.env[cam.whepKey] : null}
          />
        ))}
      </div>

      {/* Thumbnail strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px', height: '110px', flexShrink: 0 }}>
        {CAMERAS.map(cam => (
          <CamSlot
            key={cam.id}
            label={cam.label}
            isMain={false}
            isActive={primaryCam === cam.id}
            onClick={() => setPrimaryCam(cam.id)}
            stoppedVehicle={false}
            whepUrl={cam.whepKey ? import.meta.env[cam.whepKey] : null}
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
          { label: 'State',    value: behavior || '—',                     danger: behavior === 'ESTOP' },
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
