// server/routes/admin.js
import { Router }        from 'express'
import { jwtAdminAuth }  from './auth.js'
import { billing }       from '../services/billing.js'
import { pools }         from '../services/pools.js'
import { registry }      from '../services/registry.js'
import { db }            from '../db.js'

export const adminRoute = Router()
adminRoute.use(jwtAdminAuth)

// ─── Overview ──────────────────────────────────────────────────────────────
adminRoute.get('/overview', async (req, res) => {
  const today = new Date().toISOString().split('T')[0]
  const [apis, users, todayUsage, alerts, poolData, topApis, burnRate] = await Promise.all([
    db.from('api_registry').select('id', { count: 'exact', head: true }),
    db.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('usage_log').select('charged, cost, http_status').gte('ts', today),
    db.from('admin_alerts').select('*').eq('resolved', false).order('ts', { ascending: false }).limit(10),
    db.from('pools').select('*'),
    db.rpc('top_apis_today', { lim: 5 }),
    db.rpc('daily_burn_rate'),
  ])
  const usage    = todayUsage.data || []
  const revenue  = usage.reduce((s, r) => s + (r.charged || 0), 0)
  const cost     = usage.reduce((s, r) => s + (r.cost    || 0), 0)
  res.json({
    api_count:     apis.count,
    user_count:    users.count,
    today_revenue: parseFloat(revenue.toFixed(4)),
    today_profit:  parseFloat((revenue - cost).toFixed(4)),
    today_calls:   usage.length,
    today_errors:  usage.filter(r => r.http_status >= 400).length,
    burn_rate_24h: parseFloat((burnRate.data || 0).toFixed(4)),
    top_apis:      topApis.data || [],
    alerts:        alerts.data  || [],
    pools:         poolData.data || [],
  })
})

// ─── APIs ──────────────────────────────────────────────────────────────────
adminRoute.get('/apis', async (req, res) => {
  const { data } = await db.from('api_registry').select('*, pools(name,label)').order('category')
  res.json(data || [])
})

adminRoute.post('/apis', async (req, res) => {
  const result = await registry.pull({ ...req.body, requestedBy: req.user.id })
  if (result.error) return res.status(400).json(result)
  res.status(201).json(result)
})

adminRoute.patch('/apis/:id', async (req, res) => {
  const allowed = ['name', 'cost_per_call', 'markup', 'status', 'pool_id', 'category', 'description']
  const update  = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))
  const { data, error } = await db.from('api_registry').update(update).eq('id', req.params.id).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

adminRoute.post('/apis/:slug/rotate-key', async (req, res) => {
  const { key } = req.body
  if (!key) return res.status(400).json({ error: 'key required' })

  // Store key directly as master_key_ref (plaintext for now)
  // TODO: move to Supabase Vault when available
  const { error } = await db.from('api_registry')
    .update({ master_key_ref: key })
    .eq('slug', req.params.slug)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// ─── Users ─────────────────────────────────────────────────────────────────
adminRoute.get('/users', async (req, res) => {
  const { data } = await db.from('users')
    .select('id, email, credits, plan, role, status, created_at')
    .order('created_at', { ascending: false })
  res.json(data || [])
})

adminRoute.post('/users', async (req, res) => {
  const { email, password, plan = 'dev' } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  // Delegate to auth register
  const r = await fetch(`http://localhost:${process.env.PORT || 3000}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, plan })
  })
  const data = await r.json()
  res.status(r.status).json(data)
})

adminRoute.patch('/users/:id', async (req, res) => {
  const allowed = ['status', 'plan', 'role']
  const update  = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))
  const { data, error } = await db.from('users').update(update).eq('id', req.params.id).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

adminRoute.post('/users/:id/adjust-credits', async (req, res) => {
  const { amount, reason } = req.body
  if (typeof amount !== 'number') return res.status(400).json({ error: 'amount required' })
  await billing.adjust(req.params.id, amount, reason || 'admin_adjustment')
  res.json({ ok: true })
})

adminRoute.patch('/users/:id/access', async (req, res) => {
  const { categories, daily_limit } = req.body
  await db.from('user_api_access')
    .upsert({ user_id: req.params.id, categories, daily_limit }, { onConflict: 'user_id' })
  res.json({ ok: true })
})

// ─── Pools ─────────────────────────────────────────────────────────────────
adminRoute.get('/pools', async (req, res) => {
  const { data } = await db.from('pools').select('*').order('name')
  res.json(data || [])
})

adminRoute.post('/pools/:id/topup', async (req, res) => {
  const { amount } = req.body
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' })
  await pools.topUp(req.params.id, parseFloat(amount))
  res.json({ ok: true })
})

// ─── Alerts ────────────────────────────────────────────────────────────────
adminRoute.get('/alerts', async (req, res) => {
  const { data } = await db.from('admin_alerts')
    .select('*').eq('resolved', false).order('ts', { ascending: false })
  res.json(data || [])
})

adminRoute.patch('/alerts/:id/resolve', async (req, res) => {
  await db.from('admin_alerts').update({ resolved: true }).eq('id', req.params.id)
  res.json({ ok: true })
})

// ─── Logs ──────────────────────────────────────────────────────────────────
adminRoute.get('/logs', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500)
  const { data } = await db.from('usage_log')
    .select('ts, charged, cost, http_status, users(email), api_registry(name, category)')
    .order('ts', { ascending: false }).limit(limit)
  res.json(data || [])
})

// ─── Billing ───────────────────────────────────────────────────────────────
adminRoute.get('/billing', async (req, res) => {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const { data } = await db.from('usage_log').select('charged, cost').gte('ts', monthStart)
  const rows    = data || []
  const revenue = rows.reduce((s, r) => s + (r.charged || 0), 0)
  const costSum = rows.reduce((s, r) => s + (r.cost    || 0), 0)
  res.json({
    mtd_revenue: parseFloat(revenue.toFixed(2)),
    mtd_cost:    parseFloat(costSum.toFixed(2)),
    mtd_profit:  parseFloat((revenue - costSum).toFixed(2)),
    margin_pct:  revenue > 0 ? parseFloat(((1 - costSum / revenue) * 100).toFixed(1)) : 0,
    call_count:  rows.length,
  })
})

// ─── API Requests ──────────────────────────────────────────────────────────

adminRoute.get('/requests', async (req, res) => {
  // Fetch requests and users separately — no FK between api_requests and api_registry
  const { data: requests } = await db
    .from('api_requests')
    .select('*, users(email)')
    .order('ts', { ascending: false })

  if (!requests?.length) return res.json([])

  // Fetch API details by slugs
  const slugs = [...new Set(requests.map(r => r.slug))]
  const { data: apis } = await db.from('api_registry')
    .select('slug, name, category').in('slug', slugs)
  const apiMap = {}
  apis?.forEach(a => { apiMap[a.slug] = a })

  res.json(requests.map(r => ({
    id:           r.id,
    slug:         r.slug,
    name:         apiMap[r.slug]?.name || r.name,
    api_category: apiMap[r.slug]?.category,
    email:        r.users?.email,
    requested_by: r.requested_by,
    status:       r.status,
    ts:           r.ts,
  })))
})

adminRoute.patch('/requests/:id/approve', async (req, res) => {
  const { data: request } = await db.from('api_requests')
    .select('*, users(id)').eq('id', req.params.id).single()
  if (!request) return res.status(404).json({ error: 'Not found' })

  // Get API category from registry using slug
  const { data: apiData } = await db.from('api_registry')
    .select('category').eq('slug', request.slug).single()

  // Grant category access to user
  const { data: access } = await db.from('user_api_access')
    .select('categories').eq('user_id', request.users.id).maybeSingle()
  const cats = [...new Set([...(access?.categories || ['ai','dev']), apiData?.category])]
  await db.from('user_api_access')
    .upsert({ user_id: request.users.id, categories: cats }, { onConflict: 'user_id' })

  await db.from('api_requests').update({ status: 'approved' }).eq('id', req.params.id)
  res.json({ ok: true })
})

adminRoute.patch('/requests/:id/deny', async (req, res) => {
  await db.from('api_requests').update({ status: 'rejected' }).eq('id', req.params.id)
  res.json({ ok: true })
})

// ─── Billing with charts ───────────────────────────────────────────────────

adminRoute.get('/billing/charts', async (req, res) => {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const sevenAgo   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [monthData, weekData, topApis, burnRate] = await Promise.all([
    db.from('usage_log').select('charged, cost').gte('ts', monthStart),
    db.from('usage_log').select('charged, cost, ts, api_registry(name)').gte('ts', sevenAgo).order('ts'),
    db.rpc('top_apis_today', { lim: 5 }),
    db.rpc('daily_burn_rate'),
  ])

  const rows    = monthData.data || []
  const revenue = rows.reduce((s, r) => s + (r.charged || 0), 0)
  const cost    = rows.reduce((s, r) => s + (r.cost    || 0), 0)

  // Build daily breakdown from week data
  const byDay = {}
  ;(weekData.data || []).forEach(r => {
    const day = r.ts.split('T')[0]
    if (!byDay[day]) byDay[day] = { date: day, revenue: 0, cost: 0, calls: 0 }
    byDay[day].revenue += r.charged || 0
    byDay[day].cost    += r.cost    || 0
    byDay[day].calls++
  })

  res.json({
    mtd_revenue:  parseFloat(revenue.toFixed(2)),
    mtd_cost:     parseFloat(cost.toFixed(2)),
    mtd_profit:   parseFloat((revenue - cost).toFixed(2)),
    margin_pct:   revenue > 0 ? parseFloat(((1 - cost / revenue) * 100).toFixed(1)) : 0,
    call_count:   rows.length,
    burn_rate_24h: parseFloat((burnRate.data || 0).toFixed(4)),
    daily:        Object.values(byDay),
    top_apis:     topApis.data || [],
  })
})