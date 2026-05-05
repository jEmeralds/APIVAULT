// server/middleware/auth.js
import { db } from '../db.js'
import { limiter } from './rateLimit.js'

// Resolves vault key → user row. Attaches req.user.
export async function auth(req, res, next) {
  const rawKey = req.headers['x-vault-key']
  if (!rawKey) return res.status(401).json({ error: 'No vault key provided' })

  // Strip sk-vault- prefix if present (display format)
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

// Admin-only routes
export async function adminAuth(req, res, next) {
  const rawKey = req.headers['x-vault-key']
  if (!rawKey) return res.status(401).json({ error: 'No key' })

  // Strip sk-vault- prefix if present
  const key = rawKey.startsWith('sk-vault-') ? rawKey.slice(9) : rawKey

  const { data: user } = await db
    .from('users')
    .select('id, role, status')
    .eq('vault_key', key)
    .single()

  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
  if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' })

  req.user = user
  next()
}