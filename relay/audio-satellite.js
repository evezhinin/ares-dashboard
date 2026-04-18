import { spawn } from 'child_process'
import { WebSocket } from 'ws'

const {
  RELAY_WS_URL,
  AUDIO_SECRET,
  AUDIO_ID = 'pi-speaker',
  PTT_START_CMD = '',
  PTT_STOP_CMD = '',
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

function runCommand(label, command) {
  if (!command) {
    console.log(`[audio] ${label}: no command configured`)
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const child = spawn('sh', ['-lc', command], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stderr = ''
    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
      process.stderr.write(chunk)
    })

    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`[audio] ${label} command failed (exit ${code})`)
        if (stderr.trim()) console.error(stderr.trim())
      }
      resolve()
    })
  })
}

async function handlePttStart() {
  if (talking) return
  talking = true
  console.log('[audio] PTT start')
  await runCommand('ptt_start', PTT_START_CMD)
}

async function handlePttStop() {
  if (!talking) return
  talking = false
  console.log('[audio] PTT stop')
  await runCommand('ptt_stop', PTT_STOP_CMD)
}

function scheduleReconnect() {
  if (shuttingDown) return
  clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(() => {
    connect()
  }, reconnectDelayMs)
}

function connect() {
  if (shuttingDown) return

  const url = wsUrlWithAuth(RELAY_WS_URL)
  console.log(`[audio] Connecting to ${url.replace(AUDIO_SECRET, '***')}`)

  const socket = new WebSocket(url)
  ws = socket

  socket.on('open', () => {
    console.log('[audio] Connected to relay')
  })

  socket.on('message', (raw) => {
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

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})

connect()
