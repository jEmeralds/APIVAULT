// server/routes/auth.js
// Email + password dashboard login — separate from vault key API auth
import { Router }   from 'express'
import { db }       from '../db.js'
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

export const authRoute = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production'

// Simple JWT implementation — no extra dependencies
function signToken(payload) {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body    = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url')
  const sig     = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

function verifyToken(token) {
  try {
    const [header, body, sig] = token.split('.')
    const expected = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
    const valid    = timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    if (!valid) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (Date.now() - payload.iat > 24 * 60 * 60 * 1000) return null  // 24h expiry
    return payload
  } catch { return null }
}

function hashPassword(password, salt) {
  return createHmac('sha256', salt).update(password).digest('hex')
}

// POST /auth/login
authRoute.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const { data: user } = await db
    .from('users')
    .select('id, email, role, status, password_hash, password_salt, plan')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const hash = hashPassword(password, user.password_salt)
  if (hash !== user.password_hash) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Account suspended' })
  }

  const token = signToken({ id: user.id, role: user.role, email: user.email })
  res.json({ token, role: user.role, email: user.email })
})

// POST /auth/register (admin creates users — not self-serve for now)
authRoute.post('/register', async (req, res) => {
  const { email, password, plan = 'dev' } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  if (password.length < 8)  return res.status(400).json({ error: 'Password must be at least 8 characters' })

  const salt = randomBytes(32).toString('hex')
  const hash = hashPassword(password, salt)

  const { data, error } = await db.from('users').insert({
    email:         email.toLowerCase().trim(),
    password_hash: hash,
    password_salt: salt,
    plan,
    role:   'user',
    status: 'active',
  }).select('id, email, role, vault_key').single()

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Email already registered' })
    return res.status(500).json({ error: 'Registration failed' })
  }

  res.status(201).json({ ok: true, id: data.id, email: data.email, vault_key: data.vault_key })
})

// Middleware: verify JWT from Authorization header
export function jwtAuth(req, res, next) {
  const header = req.headers['authorization']
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' })
  const payload = verifyToken(header.slice(7))
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' })
  req.user = payload
  next()
}

export function jwtAdminAuth(req, res, next) {
  jwtAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    next()
  })
}