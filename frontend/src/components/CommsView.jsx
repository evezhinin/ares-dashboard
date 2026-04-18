import { useEffect, useRef, useState } from 'react'

export default function CommsView({ send, relayOnline }) {
  const [talking, setTalking] = useState(false)
  const talkingRef = useRef(false)

  useEffect(() => {
    talkingRef.current = talking
  }, [talking])

  useEffect(() => {
    return () => {
      if (talkingRef.current) {
        send({ type: 'audio.ptt_stop' })
      }
    }
  }, [send])

  function startTalking() {
    if (!relayOnline || talkingRef.current) return
    send({ type: 'audio.ptt_start' })
    setTalking(true)
  }

  function stopTalking() {
    if (!talkingRef.current) return
    send({ type: 'audio.ptt_stop' })
    setTalking(false)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
      <div
        style={{
          maxWidth: '560px',
          background: '#fff',
          border: '1px solid #dde3ee',
          padding: '24px',
        }}
      >
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '10px',
            color: '#8896ab',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            margin: 0,
            marginBottom: '18px',
          }}
        >
          Push To Talk
        </p>

        <button
          type="button"
          disabled={!relayOnline}
          onMouseDown={startTalking}
          onMouseUp={stopTalking}
          onMouseLeave={stopTalking}
          onTouchStart={startTalking}
          onTouchEnd={stopTalking}
          onTouchCancel={stopTalking}
          style={{
            width: '100%',
            minHeight: '140px',
            border: '1px solid',
            borderColor: talking ? '#1B3A6B' : '#bdc8dc',
            background: talking ? '#1B3A6B' : '#f4f6fb',
            color: talking ? '#fff' : '#1B3A6B',
            fontFamily: "'DM Mono', monospace",
            fontSize: '16px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            cursor: relayOnline ? 'pointer' : 'not-allowed',
            opacity: relayOnline ? 1 : 0.45,
            transition: 'background 0.12s, color 0.12s, border-color 0.12s',
          }}
        >
          {talking ? 'Talking...' : 'Hold To Talk'}
        </button>
      </div>
    </div>
  )
}
