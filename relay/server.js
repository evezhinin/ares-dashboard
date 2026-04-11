import express from 'express'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import cors from 'cors'

// ── Env validation ───────────────────────────────────────
const { PASSWORD_HASH, JWT_SECRET, ROBOT_SECRET, PORT = 8080 } = process.env

if (!PASSWORD_HASH || !JWT_SECRET || !ROBOT_SECRET) {
  console.error('Missing required env vars: PASSWORD_HASH, JWT_SECRET, ROBOT_SECRET')
  process.exit(1)
}

// ── HTTP server ──────────────────────────────────────────
const app = express()
app.use(cors())
app.use(express.json())

// Health check — Fly.io uses this to verify the app is up
app.get('/health', (_req, res) => res.json({ ok: true }))

// Login — verify bcrypt password, return JWT
app.post('/login', async (req, res) => {
  const { password } = req.body ?? {}
  if (!password) return res.status(400).json({ message: 'Password required' })

  const match = await bcrypt.compare(password, PASSWORD_HASH)
  if (!match) return res.status(401).json({ message: 'Invalid password' })

  const token = jwt.sign({ role: 'operator' }, JWT_SECRET, { expiresIn: '8h' })
  res.json({ token })
})

// ── WebSocket server ─────────────────────────────────────
const server = createServer(app)
const wss = new WebSocketServer({ server })

let robotWs = null          // single robot bridge connection
const browsers = new Set()  // all authenticated browser connections

function broadcast(msg) {
  const data = JSON.stringify(msg)
  browsers.forEach((b) => {
    if (b.readyState === WebSocket.OPEN) b.send(data)
  })
}

wss.on('connection', (ws, req) => {
  const params = new URL(req.url, 'ws://localhost').searchParams
  const token  = params.get('token') ?? ''

  // ── Robot bridge ────────────────────────────────────────
  if (token === ROBOT_SECRET) {
    // Only one bridge at a time — close any stale connection
    if (robotWs && robotWs.readyState === WebSocket.OPEN) {
      robotWs.close()
    }
    robotWs = ws
    console.log('[relay] Robot bridge connected')
    broadcast({ type: 'robot_status', online: true })

    ws.on('message', (data) => {
      // Forward every robot message (telemetry, robot_status) to all browsers
      browsers.forEach((b) => {
        if (b.readyState === WebSocket.OPEN) b.send(data)
      })
    })

    ws.on('close', () => {
      robotWs = null
      console.log('[relay] Robot bridge disconnected')
      broadcast({ type: 'robot_status', online: false })
    })

    ws.on('error', (err) => console.error('[relay] Robot WS error:', err.message))
    return
  }

  // ── Browser client ──────────────────────────────────────
  // Validate JWT on initial connection
  try {
    jwt.verify(token, JWT_SECRET)
  } catch {
    ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid or expired token' }))
    ws.close()
    return
  }

  browsers.add(ws)
  console.log(`[relay] Browser connected — ${browsers.size} active`)

  // Tell the browser the current robot status immediately
  ws.send(JSON.stringify({
    type: 'robot_status',
    online: robotWs?.readyState === WebSocket.OPEN,
  }))

  ws.on('message', (data) => {
    let msg
    try { msg = JSON.parse(data) } catch { return }

    // Validate JWT on every command — catches expiry mid-session
    try {
      jwt.verify(msg.token ?? token, JWT_SECRET)
    } catch {
      ws.send(JSON.stringify({ type: 'auth_error', message: 'Session expired' }))
      ws.close()
      return
    }

    // Only forward recognised command types
    const allowed = ['cmd_vel', 'estop', 'nav_goal']
    if (!allowed.includes(msg.type)) return

    // Strip the token before forwarding to the robot
    const { token: _t, ...payload } = msg

    if (robotWs?.readyState === WebSocket.OPEN) {
      robotWs.send(JSON.stringify(payload))
    }
  })

  ws.on('close', () => {
    browsers.delete(ws)
    console.log(`[relay] Browser disconnected — ${browsers.size} remaining`)
  })

  ws.on('error', (err) => console.error('[relay] Browser WS error:', err.message))
})

// ── Start ────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`[relay] ARES relay running on :${PORT}`)
})
