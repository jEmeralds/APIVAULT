// server/routes/user.js
import { Router }  from 'express'
import { jwtAuth } from './auth.js'
import { db }      from '../db.js'

export const userRoute = Router()
userRoute.use(jwtAuth)

// GET /user/me
userRoute.get('/me', async (req, res) => {
  const { data } = await db.from('users')
    .select('id, email, credits, plan, role, created_at')
    .eq('id', req.user.id).single()
  res.json(data)
})

// GET /user/usage — last 50 calls with cost breakdown
userRoute.get('/usage', async (req, res) => {
  const { data } = await db.from('usage_log')
    .select('ts, charged, cost, profit, http_status, api_registry(name, category)')
    .eq('user_id', req.user.id)
    .order('ts', { ascending: false })
    .limit(50)
  res.json(data || [])
})

// GET /user/usage/stats — summary for charts
userRoute.get('/usage/stats', async (req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await db.from('usage_log')
    .select('ts, charged, http_status, api_registry(name, category)')
    .eq('user_id', req.user.id)
    .gte('ts', sevenDaysAgo)
    .order('ts', { ascending: true })

  const rows = data || []

  // Group by day
  const byDay = {}
  rows.forEach(r => {
    const day = r.ts.split('T')[0]
    if (!byDay[day]) byDay[day] = { date: day, calls: 0, spent: 0 }
    byDay[day].calls++
    byDay[day].spent += r.charged || 0
  })

  // Top APIs
  const byAPI = {}
  rows.forEach(r => {
    const name = r.api_registry?.name || 'Unknown'
    if (!byAPI[name]) byAPI[name] = { name, calls: 0, spent: 0 }
    byAPI[name].calls++
    byAPI[name].spent += r.charged || 0
  })

  res.json({
    daily:   Object.values(byDay),
    top_apis: Object.values(byAPI).sort((a, b) => b.calls - a.calls).slice(0, 5),
    total_calls: rows.length,
    total_spent: rows.reduce((s, r) => s + (r.charged || 0), 0),
  })
})

// GET /user/apis — all live APIs user can access
userRoute.get('/apis', async (req, res) => {
  const { data: user } = await db.from('users').select('credits').eq('id', req.user.id).single()
  const credits = parseFloat(user?.credits || 0)

  const { data } = await db.from('api_registry')
    .select('slug, name, category, cost_per_call, markup, billing_unit, status, description')
    .eq('status', 'live')
    .order('name')

  // Return APIs user can actually use
  const accessible = (data || []).filter(api => {
    const price = parseFloat((api.cost_per_call * (1 + api.markup / 100)).toFixed(6))
    return price === 0 || credits > 0
  })
  res.json(accessible)
})

// GET /user/marketplace
// Simple access model:
// - live + free cost  → active for everyone
// - live + paid cost  → active only if user has credits
// - paused            → coming soon
userRoute.get('/marketplace', async (req, res) => {
  const { data: user } = await db.from('users')
    .select('credits').eq('id', req.user.id).single()
  const credits = parseFloat(user?.credits || 0)

  const { data: apis } = await db.from('api_registry')
    .select('slug, name, category, cost_per_call, markup, billing_unit, status, description')
    .in('status', ['live', 'paused'])
    .order('name')

  const result = (apis || []).map(api => {
    const userPrice = parseFloat((api.cost_per_call * (1 + api.markup / 100)).toFixed(6))
    const isLive    = api.status === 'live'
    const isFree    = userPrice === 0

    let state        = 'coming_soon' // paused
    let has_access   = false

    if (isLive) {
      if (isFree) {
        state = 'active'      // free + live = always active
        has_access = true
      } else if (credits > 0) {
        state = 'active'      // paid + live + has credits = active
        has_access = true
      } else {
        state = 'needs_credits' // paid + live + no credits
      }
    }

    return { ...api, user_price: userPrice, has_access, state }
  })

  res.json(result)
})

// POST /user/request-api — request access to a specific API
userRoute.post('/request-api', async (req, res) => {
  const { slug } = req.body
  if (!slug) return res.status(400).json({ error: 'slug required' })

  // Check API exists
  const { data: api } = await db.from('api_registry')
    .select('slug, name').eq('slug', slug).single()
  if (!api) return res.status(404).json({ error: 'API not found' })

  // Check not already requested
  const { data: existing } = await db.from('api_requests')
    .select('id, status').eq('slug', slug).eq('requested_by', req.user.id).maybeSingle()
  if (existing) return res.json({ ok: true, status: existing.status, already: true })

  // Create request
  await db.from('api_requests').insert({
    slug,
    name:         api.name,
    requested_by: req.user.id,
    status:       'pending',
  })

  // Alert admin
  const { data: user } = await db.from('users').select('email').eq('id', req.user.id).single()
  await db.from('admin_alerts').insert({
    type:    'api_requested',
    message: `${user.email} requested access to ${api.name}`,
  })

  res.json({ ok: true, status: 'pending' })
})

// GET /user/key — masked vault key
userRoute.get('/key', async (req, res) => {
  const { data } = await db.from('users').select('vault_key').eq('id', req.user.id).single()
  const k = data.vault_key.toString()
  res.json({ key: `sk-vault-${k.substring(0, 8)}••••••••••••••••••••••••••••` })
})

// POST /user/key/reveal
userRoute.post('/key/reveal', async (req, res) => {
  const { data } = await db.from('users').select('vault_key').eq('id', req.user.id).single()
  res.json({ key: `sk-vault-${data.vault_key}` })
})

// POST /user/change-password
userRoute.post('/change-password', async (req, res) => {
  const { current_password, new_password } = req.body
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' })
  if (new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })

  const { data: user } = await db.from('users')
    .select('password_hash, password_salt')
    .eq('id', req.user.id).single()

  const { createHmac, randomBytes } = await import('crypto')
  const currentHash = createHmac('sha256', user.password_salt).update(current_password).digest('hex')
  if (currentHash !== user.password_hash) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }

  const newSalt = randomBytes(32).toString('hex')
  const newHash = createHmac('sha256', newSalt).update(new_password).digest('hex')

  await db.from('users').update({ password_hash: newHash, password_salt: newSalt }).eq('id', req.user.id)
  res.json({ ok: true })
})