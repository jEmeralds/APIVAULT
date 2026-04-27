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

// GET /user/apis — APIs on user's current plan (live only)
userRoute.get('/apis', async (req, res) => {
  const { data: access } = await db.from('user_api_access')
    .select('categories').eq('user_id', req.user.id).maybeSingle()
  const categories = access?.categories || ['ai', 'dev']

  const { data } = await db.from('api_registry')
    .select('slug, name, category, cost_per_call, markup, billing_unit, status')
    .in('category', categories)
    .eq('status', 'live')
    .order('category')
  res.json(data || [])
})

// GET /user/marketplace — ALL APIs regardless of plan, with access info
userRoute.get('/marketplace', async (req, res) => {
  const { data: access } = await db.from('user_api_access')
    .select('categories').eq('user_id', req.user.id).maybeSingle()
  const myCategories = access?.categories || ['ai', 'dev']

  // Get all live + paused APIs
  const { data: apis } = await db.from('api_registry')
    .select('slug, name, category, cost_per_call, markup, billing_unit, status')
    .in('status', ['live', 'paused'])
    .order('category')

  // Get user's existing requests
  const { data: requests } = await db.from('api_requests')
    .select('slug, status')
    .eq('requested_by', req.user.id)

  const requestMap = {}
  requests?.forEach(r => { requestMap[r.slug] = r.status })

  // Annotate each API with access info
  const result = (apis || []).map(api => ({
    ...api,
    user_price:   parseFloat((api.cost_per_call * (1 + api.markup / 100)).toFixed(6)),
    has_access:   myCategories.includes(api.category) && api.status === 'live',
    request_status: requestMap[api.slug] || null,
  }))

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