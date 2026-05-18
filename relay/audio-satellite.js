import { spawn } from 'child_process'
import { WebSocket } from 'ws'

const {
  RELAY_WS_URL,
  AUDIO_SECRET,
  AUDIO_ID = 'pi-speaker',
  RECONNECT_DELAY_MS = '3000',
} = process.env

if (!RELAY_WS_URL) {
  console.error('[audio] Missing RELAY_WS_URL')
  process.exit(1)
}

if (!AUDIO_SECRET) {
  console.error('[audio] Missing AUDIO_SECRET')
  process.exit(1)
}

const reconnectDelayMs = Math.max(250, Number(RECONNECT_DELAY_MS) || 3000)

let ws = null
let reconnectTimer = null
let talking = false
let shuttingDown = false
let ffplayProcess = null

function safeParse(raw) {
  try {
    if (typeof raw === 'string') return JSON.parse(raw)
    if (Buffer.isBuffer(raw)) return JSON.parse(raw.toString('utf8'))
    return JSON.parse(String(raw))
  } catch {
    return null
  }
}

function wsUrlWithAuth(baseUrl) {
  const sep = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${sep}audio_secret=${encodeURIComponent(AUDIO_SECRET)}&audio_id=${encodeURIComponent(AUDIO_ID)}`
}

function startFfplay() {
  if (ffplayProcess) return

  console.log('[audio] Starting ffplay for audio playback')
  ffplayProcess = spawn('ffplay', [
    '-nodisp',
    '-autoexit',
    '-i', 'pipe:0',
    '-af', 'volume=2.0',
    '-fflags', 'nobuffer',
    '-flags', 'low_delay',
    '-framedrop',
  ], {
    stdio: ['pipe', 'ignore', 'ignore'],
  })

  ffplayProcess.on('close', (code) => {
    console.log(`[audio] ffplay exited with code ${code}`)
    ffplayProcess = null
  })

  ffplayProcess.on('error', (err) => {
    console.error('[audio] ffplay error:', err.message)
    ffplayProcess = null
  })
}

function stopFfplay() {
  if (!ffplayProcess) return
  try {
    ffplayProcess.stdin.end()
  } catch {}
  ffplayProcess = null
}

async function handlePttStart() {
  if (talking) return
  talking = true
  console.log('[audio] PTT start — opening audio stream')
  startFfplay()
}

async function handlePttStop() {
  if (!talking) return
  talking = false
  console.log('[audio] PTT stop — closing audio stream')
  stopFfplay()
}

function handleAudioChunk(raw) {
  if (!talking || !ffplayProcess) return
  try {
    if (ffplayProcess.stdin.writable) {
      ffplayProcess.stdin.write(raw)
    }
  } catch (err) {
    console.error('[audio] Error writing chunk:', err.message)
  }
}

function scheduleReconnect() {
  if (shuttingDown) return
  clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(() => connect(), reconnectDelayMs)
}

function connect() {
  if (shuttingDown) return

  const url = wsUrlWithAuth(RELAY_WS_URL)
  console.log('[audio] Connecting to relay')

  const socket = new WebSocket(url)
  ws = socket

  socket.on('open', () => {
    console.log('[audio] Connected to relay')
  })

  socket.on('message', (raw, isBinary) => {
    if (isBinary) {
      handleAudioChunk(raw)
      return
    }

    const msg = safeParse(raw)
    if (!msg || typeof msg.type !== 'string') return

    if (msg.type === 'audio.ptt_start') {
      void handlePttStart()
      return
    }

    if (msg.type === 'audio.ptt_stop') {
      void handlePttStop()
      return
    }
  })

  socket.on('close', () => {
    if (ws === socket) ws = null
    console.log('[audio] Relay connection closed')
    scheduleReconnect()
  })

  socket.on('error', (err) => {
    console.error('[audio] WebSocket error:', err.message)
  })
}

async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  clearTimeout(reconnectTimer)
  console.log(`[audio] ${signal} received, shutting down`)
  await handlePttStop()
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    ws.close()
  }
}

process.on('SIGINT',  () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

connect()