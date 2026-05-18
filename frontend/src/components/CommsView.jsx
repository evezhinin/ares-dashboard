import { useEffect, useRef, useState } from 'react'

export default function CommsView({ send, relayOnline, wsRef }) {
  const [talking, setTalking]       = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const [error, setError]           = useState(null)
  const talkingRef        = useRef(false)
  const mediaRecorderRef  = useRef(null)
  const streamRef         = useRef(null)

  useEffect(() => {
    talkingRef.current = talking
  }, [talking])

  // Pre-request microphone permission on mount
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((stream) => {
        stream.getTracks().forEach(t => t.stop())
        setAudioReady(true)
      })
      .catch(() => setError('Microphone access denied'))
  }, [])

  function stopTalking() {
    if (!talkingRef.current) return
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    mediaRecorderRef.current = null
    streamRef.current = null
    send({ type: 'audio.ptt_stop' })
    setTalking(false)
  }

  // Cleanup on unmount — stopTalking is declared above so no hoisting issue
  useEffect(() => {
    return () => {
      if (talkingRef.current) stopTalking()
    }
  }, [])

  async function startTalking() {
    if (!relayOnline || talkingRef.current || !audioReady) return
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
        video: false,
      })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 32000,
      })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && wsRef?.current?.readyState === WebSocket.OPEN) {
          e.data.arrayBuffer().then(buf => wsRef.current.send(buf))
        }
      }

      recorder.start(100)
      send({ type: 'audio.ptt_start' })
      setTalking(true)
    } catch {
      setError('Could not access microphone')
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
      <div style={{
        maxWidth: '560px',
        background: '#fff',
        border: '1px solid #dde3ee',
        padding: '24px',
      }}>
        <p style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '10px',
          color: '#8896ab',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          margin: 0,
          marginBottom: '18px',
        }}>
          Push To Talk
        </p>

        {error && (
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '10px',
            color: '#d63c2a',
            marginBottom: '12px',
          }}>
            {error}
          </p>
        )}

        {!audioReady && !error && (
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '10px',
            color: '#8896ab',
            marginBottom: '12px',
          }}>
            Requesting microphone access...
          </p>
        )}

        <button
          type="button"
          disabled={!relayOnline || !audioReady}
          onMouseDown={startTalking}
          onMouseUp={stopTalking}
          onMouseLeave={stopTalking}
          onTouchStart={(e) => { e.preventDefault(); startTalking() }}
          onTouchEnd={(e)   => { e.preventDefault(); stopTalking() }}
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
            cursor: (relayOnline && audioReady) ? 'pointer' : 'not-allowed',
            opacity: (relayOnline && audioReady) ? 1 : 0.45,
            transition: 'background 0.12s, color 0.12s, border-color 0.12s',
          }}
        >
          {talking ? '● Talking...' : 'Hold To Talk'}
        </button>

        <p style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '9px',
          color: '#8896ab',
          letterSpacing: '1px',
          marginTop: '12px',
          textAlign: 'center',
        }}>
          {talking ? 'Release to stop broadcasting' : 'Hold button to broadcast to robot speaker'}
        </p>
      </div>
    </div>
  )
}