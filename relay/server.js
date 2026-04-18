import express from 'express'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import cors from 'cors'

const {
  PASSWORD_HASH,
  JWT_SECRET,
  ROBOT_SECRET,
  ROBOT_SECRETS_JSON,
  DEFAULT_ROBOT_ID = 'panynj',
  PORT = 8080,
} = process.env

if (!PASSWORD_HASH || !JWT_SECRET || (!ROBOT_SECRET && !ROBOT_SECRETS_JSON)) {
  console.error(
    'Missing required env vars: PASSWORD_HASH, JWT_SECRET, and ROBOT_SECRET (or ROBOT_SECRETS_JSON)',
  )
  process.exit(1)
}

let robotSecretsById = null
if (ROBOT_SECRETS_JSON) {
  try {
    const parsed = JSON.parse(ROBOT_SECRETS_JSON)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('ROBOT_SECRETS_JSON must be a JSON object')
    }
    robotSecretsById = parsed
  } catch (err) {
    console.error('Invalid ROBOT_SECRETS_JSON:', err.message)
    process.exit(1)
  }
}

const NEW_COMMANDS = new Set(['nav.goal', 'nav.cancel', 'teleop.cmd_vel', 'estop.set'])

const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

app.post('/login', async (req, res) => {
  const { password } = req.body ?? {}
  if (!password) return res.status(400).json({ message: 'Password required' })

  const ok = await bcrypt.compare(password, PASSWORD_HASH)
  if (!ok) return res.status(401).json({ message: 'Invalid password' })

  const token = jwt.sign({ role: 'operator' }, JWT_SECRET, { expiresIn: '8h' })
  return res.json({ token })
})

const server = createServer(app)
const wss = new WebSocketServer({ server })

const robotSockets = new Map() // robotId -> WebSocket
const browserSockets = new Set()
const connectionMeta = new WeakMap()

function nowIso() {
  return new Date().toISOString()
}

function safeJsonParse(raw) {
  const asText = (() => {
    if (typeof raw === 'string') return raw
    if (raw == null) return ''
    if (Buffer.isBuffer(raw)) return raw.toString('utf8')
    if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8')
    return String(raw)
  })()

  try {
    return JSON.parse(asText)
  } catch {
    return null
  }
}

function sendJson(ws, msg) {
  if (ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify(msg))
}

function makeRelayMessage(type, payload = {}) {
  return {
    type,
    robotId: 'relay',
    ts: nowIso(),
    source: 'relay',
    payload,
  }
}

function onlineRobotIds() {
  return [...robotSockets.entries()]
    .filter(([, ws]) => ws.readyState === WebSocket.OPEN)
    .map(([robotId]) => robotId)
}

function broadcastToBrowsers(message) {
  const data = JSON.stringify(message)
  browserSockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data)
  })
}

function broadcastRobotStatus(changedRobotId, online) {
  const robots = onlineRobotIds()
  const anyOnline = robots.length > 0
  broadcastToBrowsers({
    type: 'robot_status',
    robotId: changedRobotId,
    online: anyOnline,
    robotOnline: online,
    anyOnline,
    robots,
    ts: nowIso(),
    source: 'relay',
  })

  broadcastToBrowsers(
    makeRelayMessage('relay.robot_status', {
      robotId: changedRobotId,
      online: anyOnline,
      robotOnline: online,
      anyOnline,
      robots,
    }),
  )
}

function closeAuthError(ws, message) {
  sendJson(ws, { type: 'auth_error', message })
  sendJson(
    ws,
    makeRelayMessage('relay.error', {
      code: 'auth_error',
      message,
    }),
  )
  ws.close()
}

function headerString(req, headerName) {
  const value = req.headers[headerName]
  if (Array.isArray(value)) return value[0] ?? ''
  return typeof value === 'string' ? value : ''
}

function verifyOperatorToken(token) {
  if (!token) return false
  try {
    jwt.verify(token, JWT_SECRET)
    return true
  } catch {
    return false
  }
}

function resolveRobotIdForSecret(secret, requestedRobotId) {
  if (!secret) return null

  if (robotSecretsById) {
    if (requestedRobotId && robotSecretsById[requestedRobotId] === secret) {
      return requestedRobotId
    }

    const match = Object.entries(robotSecretsById).find(([, value]) => value === secret)
    if (match) return match[0]
  }

  if (ROBOT_SECRET && secret === ROBOT_SECRET) {
    return requestedRobotId || DEFAULT_ROBOT_ID
  }

  return null
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'on', 'active'].includes(normalized)) return true
    if (['false', '0', 'no', 'off', 'inactive'].includes(normalized)) return false
  }
  return fallback
}

function parseNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function normalizeBrowserCommand(raw) {
  if (!raw || typeof raw !== 'object') return null
  const type = String(raw.type ?? '')
  const payload = raw.payload && typeof raw.payload === 'object' ? raw.payload : {}

  const robotId =
    raw.robotId ??
    payload.robotId ??
    raw.robot_id ??
    raw.targetRobotId ??
    null

  const base = {
    robotId,
    source: 'browser',
    ts: typeof raw.ts === 'string' ? raw.ts : nowIso(),
  }

  if (NEW_COMMANDS.has(type)) {
    if (type === 'nav.goal') {
      return {
        ...base,
        type: 'nav.goal',
        payload: {
          x: parseNumber(payload.x ?? raw.x, 0),
          y: parseNumber(payload.y ?? raw.y, 0),
          theta: parseNumber(payload.theta ?? raw.theta, 0),
        },
      }
    }

    if (type === 'nav.cancel') {
      return { ...base, type: 'nav.cancel', payload: {} }
    }

    if (type === 'teleop.cmd_vel') {
      const linearX = payload.linear?.x ?? raw.linear?.x ?? raw.linear ?? raw.vx
      const angularZ = payload.angular?.z ?? raw.angular?.z ?? raw.angular ?? raw.vtheta
      return {
        ...base,
        type: 'teleop.cmd_vel',
        payload: {
          linear: { x: parseNumber(linearX, 0) },
          angular: { z: parseNumber(angularZ, 0) },
        },
      }
    }

    if (type === 'estop.set') {
      return {
        ...base,
        type: 'estop.set',
        payload: { active: parseBoolean(payload.active, false) },
      }
    }
  }

  // Legacy browser command compatibility layer.
  if (type === 'nav_goal') {
    return {
      ...base,
      type: 'nav.goal',
      payload: {
        x: parseNumber(payload.x ?? raw.x, 0),
        y: parseNumber(payload.y ?? raw.y, 0),
        theta: parseNumber(payload.theta ?? raw.theta, 0),
      },
    }
  }

  if (type === 'cmd_vel') {
    const linearX = payload.linear?.x ?? raw.linear?.x ?? raw.linear ?? raw.vx
    const angularZ = payload.angular?.z ?? raw.angular?.z ?? raw.angular ?? raw.vtheta
    return {
      ...base,
      type: 'teleop.cmd_vel',
      payload: {
        linear: { x: parseNumber(linearX, 0) },
        angular: { z: parseNumber(angularZ, 0) },
      },
    }
  }

  if (type === 'estop') {
    return {
      ...base,
      type: 'estop.set',
      payload: {
        active: parseBoolean(payload.active ?? raw.active, true),
      },
    }
  }

  if (type === 'nav_cancel') {
    return { ...base, type: 'nav.cancel', payload: {} }
  }

  return null
}

function resolveTargetRobotId(requestedRobotId) {
  if (requestedRobotId) {
    const ws = robotSockets.get(requestedRobotId)
    if (ws?.readyState === WebSocket.OPEN) return requestedRobotId
    return null
  }

  const defaultWs = robotSockets.get(DEFAULT_ROBOT_ID)
  if (defaultWs?.readyState === WebSocket.OPEN) return DEFAULT_ROBOT_ID

  const online = onlineRobotIds()
  if (online.length === 1) return online[0]
  return null
}

function normalizeRobotMessage(raw, fallbackRobotId) {
  if (!raw || typeof raw !== 'object' || typeof raw.type !== 'string') return null

  const msg = { ...raw }
  if (!msg.robotId) msg.robotId = fallbackRobotId
  if (!msg.ts) msg.ts = nowIso()
  if (!msg.source) msg.source = 'robot'

  if (!msg.payload || typeof msg.payload !== 'object') {
    const payload = {}
    for (const [key, value] of Object.entries(msg)) {
      if (['type', 'robotId', 'ts', 'source', 'token', 'secret'].includes(key)) continue
      payload[key] = value
    }
    msg.payload = payload
  }

  // Compatibility helper: old frontends often read fields at top-level.
  if (msg.payload && typeof msg.payload === 'object') {
    for (const [key, value] of Object.entries(msg.payload)) {
      if (!(key in msg)) msg[key] = value
    }
  }

  return msg
}

function legacyAliases(robotMsg) {
  if (robotMsg.type !== 'telemetry.nav') return []
  return [
    {
      type: 'telemetry',
      robotId: robotMsg.robotId,
      ts: robotMsg.ts,
      source: robotMsg.source,
      payload: robotMsg.payload,
      ...(robotMsg.payload ?? {}),
    },
  ]
}

wss.on('connection', (ws, req) => {
  const params = new URL(req.url, 'ws://localhost').searchParams

  const queryRobotSecret = params.get('robot_secret') ?? ''
  console.log(`[relay] Connection url: ${req.url.substring(0,120)} robot_secret_present: ${!!queryRobotSecret} robot_id: ${params.get('robot_id')}`)
  const queryRobotId = params.get('robot_id') || params.get('robotId') || null
  const headerRobotSecret = headerString(req, 'x-robot-secret')
  const headerRobotId = headerString(req, 'x-robot-id') || null
  const queryToken = params.get('token') ?? ''
  const queryOperatorToken = params.get('operator_token') ?? ''
  const bearerHeader = headerString(req, 'authorization')
  const bearerToken = bearerHeader.toLowerCase().startsWith('bearer ')
    ? bearerHeader.slice(7).trim()
    : ''

  const robotSecretCandidates = []
  if (queryRobotSecret) robotSecretCandidates.push({ secret: queryRobotSecret, robotId: queryRobotId })
  if (headerRobotSecret) robotSecretCandidates.push({ secret: headerRobotSecret, robotId: headerRobotId || queryRobotId })
  // Legacy robot auth path: ?token=<ROBOT_SECRET>
  if (queryToken && !queryOperatorToken) {
    robotSecretCandidates.push({ secret: queryToken, robotId: queryRobotId })
  }

  for (const candidate of robotSecretCandidates) {
    const robotId = resolveRobotIdForSecret(candidate.secret, candidate.robotId)
    if (!robotId) continue

    const existing = robotSockets.get(robotId)
    if (existing && existing !== ws && existing.readyState === WebSocket.OPEN) {
      existing.close()
    }

    robotSockets.set(robotId, ws)
    connectionMeta.set(ws, { role: 'robot', robotId })

    console.log(`[relay] Robot connected: ${robotId}`)
    sendJson(
      ws,
      makeRelayMessage('relay.connected', {
        role: 'robot',
        robotId,
      }),
    )
    broadcastRobotStatus(robotId, true)

    ws.on('message', (raw) => {
      const msg = safeJsonParse(raw)
      if (!msg) return

      const normalized = normalizeRobotMessage(msg, robotId)
      if (!normalized) return

      
      // Handle specific message types for sensors and broadcast to the site 
      if (msg.type === 'sensor_data' || msg.type === 'sound_data' || msg.type === 'gas_data' || msg.type === 'fan_data' || msg.type === 'light_data') {
        broadcastToBrowsers({
          type: msg.type,
          robotId,
          ts: nowIso(),
          source: 'robot',
          payload: msg.data,
        })
      }

      broadcastToBrowsers(normalized)
      for (const alias of legacyAliases(normalized)) {
        broadcastToBrowsers(alias)
      }
    })

    ws.on('close', () => {
      const current = robotSockets.get(robotId)
      if (current === ws) {
        robotSockets.delete(robotId)
      }
      console.log(`[relay] Robot disconnected: ${robotId}`)
      broadcastRobotStatus(robotId, false)
    })

    ws.on('error', (err) => {
      console.error(`[relay] Robot WS error (${robotId}):`, err.message)
    })
    return
  }

  const operatorToken = queryOperatorToken || queryToken || bearerToken
  if (!verifyOperatorToken(operatorToken)) {
    closeAuthError(ws, 'Invalid or expired operator token')
    return
  }

  browserSockets.add(ws)
  connectionMeta.set(ws, { role: 'browser', operatorToken })
  console.log(`[relay] Browser connected — ${browserSockets.size} active`)

  sendJson(
    ws,
    makeRelayMessage('relay.connected', {
      role: 'browser',
      robots: onlineRobotIds(),
    }),
  )

  sendJson(ws, {
    type: 'robot_status',
    online: onlineRobotIds().length > 0,
    robots: onlineRobotIds(),
    ts: nowIso(),
    source: 'relay',
  })

  ws.on('message', (raw) => {
    const msg = safeJsonParse(raw)
    if (!msg || typeof msg !== 'object') return

    const tokenFromMsg = typeof msg.token === 'string' ? msg.token : ''
    const meta = connectionMeta.get(ws)
    const tokenToVerify = tokenFromMsg || meta?.operatorToken || ''
    if (!verifyOperatorToken(tokenToVerify)) {
      closeAuthError(ws, 'Session expired')
      return
    }

    const normalized = normalizeBrowserCommand(msg)
    if (!normalized) return

    const targetRobotId = resolveTargetRobotId(normalized.robotId)
    if (!targetRobotId) {
      sendJson(
        ws,
        makeRelayMessage('relay.error', {
          code: 'robot_unavailable',
          message: normalized.robotId
            ? `Robot "${normalized.robotId}" is offline`
            : 'No target robot online',
        }),
      )
      return
    }

    normalized.robotId = targetRobotId

    const robotWs = robotSockets.get(targetRobotId)
    if (robotWs?.readyState === WebSocket.OPEN) {
      sendJson(robotWs, normalized)
      return
    }

    sendJson(
      ws,
      makeRelayMessage('relay.error', {
        code: 'robot_unavailable',
        message: `Robot "${targetRobotId}" is offline`,
      }),
    )
  })

  ws.on('close', () => {
    browserSockets.delete(ws)
    console.log(`[relay] Browser disconnected — ${browserSockets.size} remaining`)
  })

  ws.on('error', (err) => {
    console.error('[relay] Browser WS error:', err.message)
  })
})

server.listen(PORT, () => {
  console.log(`[relay] ARES relay running on :${PORT}`)
})
