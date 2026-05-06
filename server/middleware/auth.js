// server/middleware/auth.js
import { db } from '../db.js'
import { limiter } from './rateLimit.js'
import { createHmac, timingSafeEqual } from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production'

// ─── JWT verification (same logic as auth.js route) ───────────────────────
function verifyJWT(token) {
  try {
    const [header, body, sig] = token.split('.')
    const expected = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (Date.now() - payload.iat > 7 * 24 * 60 * 60 * 1000) return null
    return payload
  } catch { return null }
}

// ─── JWT auth — for user dashboard routes (/user/*, /checkout) ───────────
// Reads Bearer token from Authorization header
export async function jwtAuth(req, res, next) {
  const header = req.headers['authorization']
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const payload = verifyJWT(header.slice(7))
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' })

  // Fetch fresh user data from DB
  const { data: user, error } = await db
    .from('users')
    .select('id, email, credits, status, role, plan, vault_key')
    .eq('id', payload.id)
    .single()

  if (error || !user) return res.status(401).json({ error: 'User not found' })

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Account suspended. Contact support.' })
  }

  req.user = user
  next()
}

// ─── Vault key auth — for proxy/API routes (/proxy/*) ────────────────────
// Reads x-vault-key header
export async function auth(req, res, next) {
  const rawKey = req.headers['x-vault-key']
  if (!rawKey) return res.status(401).json({ error: 'No vault key provided' })

  const key = rawKey.startsWith('sk-vault-') ? rawKey.slice(9) : rawKey

  if (limiter.isBadKeyBlocked(req.ip)) {
    return res.status(429).json({ error: 'Too many failed attempts. Try again in 1 hour.' })
  }

  const { data: user, error } = await db
    .from('users')
    .select('id, credits, status, role, plan')
    .eq('vault_key', key)
    .single()

  if (error || !user) {
    limiter.recordBadKey(req.ip)
    return res.status(401).json({ error: 'Invalid vault key' })
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Account suspended. Contact support.' })
  }

  req.user = user
  next()
}

// ─── Admin auth — JWT-based, checks role === 'admin' ─────────────────────
export async function adminAuth(req, res, next) {
  const header = req.headers['authorization']
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const payload = verifyJWT(header.slice(7))
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' })

  const { data: user } = await db
    .from('users')
    .select('id, email, role, status, plan')
    .eq('id', payload.id)
    .single()

  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
  if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' })

  req.user = user
  next()
}