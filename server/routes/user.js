// server/routes/user.js
import { Router }  from 'express'
import { jwtAuth } from '../middleware/auth.js'
import { db }      from '../db.js'

export const userRoute = Router()
userRoute.use(jwtAuth)

// GET /user/me
userRoute.get('/me', async (req, res) => {
  const { data } = await db.from('users')
    .select('id, email, credits, plan, role, created_at, daily_spend_cap')
    .eq('id', req.user.id).single()
  res.json(data)
})

// GET /user/usage — last 50 calls with cost breakdown
userRoute.get('/usage', async (req, res) => {
  const { data } = await db.from('usage_log')
    .select('ts, charged, cost, http_status, api_registry(name, category)')
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

  const byDay = {}
  rows.forEach(r => {
    const day = r.ts.split('T')[0]
    if (!byDay[day]) byDay[day] = { date: day, calls: 0, spent: 0 }
    byDay[day].calls++
    byDay[day].spent += r.charged || 0
  })

  const byAPI = {}
  rows.forEach(r => {
    const name = r.api_registry?.name || 'Unknown'
    if (!byAPI[name]) byAPI[name] = { name, calls: 0, spent: 0 }
    byAPI[name].calls++
    byAPI[name].spent += r.charged || 0
  })

  res.json({
    daily:       Object.values(byDay),
    top_apis:    Object.values(byAPI).sort((a, b) => b.calls - a.calls).slice(0, 5),
    total_calls: rows.length,
    total_spent: rows.reduce((s, r) => s + (r.charged || 0), 0),
  })
})

// GET /user/apis — all live APIs user can access
userRoute.get('/apis', async (req, res) => {
  const { data: user } = await db.from('users').select('credits').eq('id', req.user.id).single()
  const credits = parseFloat(user?.credits || 0)

  const { data } = await db.from('api_registry')
    .select('slug, name, category, cost_per_call, markup, status, description')
    .eq('status', 'live')
    .order('name')

  const accessible = (data || []).filter(api => {
    const price = parseFloat((api.cost_per_call * (1 + api.markup / 100)).toFixed(6))
    return price === 0 || credits > 0
  })
  res.json(accessible)
})

// GET /user/marketplace
userRoute.get('/marketplace', async (req, res) => {
  const { data: user } = await db.from('users')
    .select('credits').eq('id', req.user.id).single()
  const credits = parseFloat(user?.credits || 0)

  const { data: apis } = await db.from('api_registry')
    .select('slug, name, category, cost_per_call, markup, status, description, master_key_ref, health_status')
    .in('status', ['live', 'paused'])
    // Hide APIs currently failing their health check from marketplace discovery —
    // same rule as showcase.js. This does NOT touch 'status', so if a user already
    // has this API integrated, their real /proxy/... calls keep working unaffected;
    // it's only hidden from being newly discovered/browsed while degraded.
    .neq('health_status', 'degraded')
    .order('name')

  const result = (apis || []).map(api => {
    const userPrice = parseFloat((api.cost_per_call * (1 + api.markup / 100)).toFixed(6))
    const isLive    = api.status === 'live'
    const isFree    = userPrice === 0
    const hasKey    = api.master_key_ref &&
                      api.master_key_ref !== 'no-key-required' &&
                      api.master_key_ref !== 'pending-setup' &&
                      api.master_key_ref.length > 5
    const freeNoKey = isLive && isFree && api.master_key_ref === 'no-key-required'

    let state      = 'coming_soon'
    let has_access = false
    let ready      = false

    if (!isLive) {
      state = 'coming_soon'
    } else if (!hasKey && !freeNoKey) {
      state = 'coming_soon'
      ready = false
    } else if (isFree || freeNoKey) {
      state      = 'active'
      has_access = true
      ready      = true
    } else if (credits > 0) {
      state      = 'active'
      has_access = true
      ready      = true
    } else {
      state = 'needs_credits'
      ready = true
    }

    const { master_key_ref, health_status, ...safeApi } = api
    return { ...safeApi, user_price: userPrice, has_access, state, ready, credits_available: credits }
  })

  res.json(result)
})

// POST /user/request-api
// Handles two cases:
// 1. Known slug — request access to an existing API
// 2. Unknown name — discovery request for an API not yet in the vault
userRoute.post('/request-api', async (req, res) => {
  const { slug } = req.body
  if (!slug) return res.status(400).json({ error: 'slug required' })

  const { data: user } = await db.from('users').select('email').eq('id', req.user.id).single()

  // Check if this is a known API in the registry
  const cleanSlug = slug.toLowerCase().trim().replace(/\s+/g, '-')
  const { data: api } = await db.from('api_registry')
    .select('slug, name').eq('slug', cleanSlug).maybeSingle()

  if (api) {
    // Known API — check not already requested
    const { data: existing } = await db.from('api_requests')
      .select('id, status').eq('slug', cleanSlug).eq('requested_by', req.user.id).maybeSingle()
    if (existing) return res.json({ ok: true, status: existing.status, already: true })

    await db.from('api_requests').insert({
      slug:         cleanSlug,
      name:         api.name,
      requested_by: req.user.id,
      status:       'pending',
    })

    await db.from('admin_alerts').insert({
      type:    'api_requested',
      message: `${user.email} requested access to ${api.name}`,
    })

    return res.json({ ok: true, status: 'pending' })
  }

  // Unknown API — discovery request
  // Store as a discovery request so admin can review and add it
  const { data: existingDiscovery } = await db.from('api_requests')
    .select('id, status')
    .eq('slug', cleanSlug)
    .eq('requested_by', req.user.id)
    .maybeSingle()

  if (existingDiscovery) {
    return res.json({ ok: true, status: existingDiscovery.status, already: true })
  }

  await db.from('api_requests').insert({
    slug:         cleanSlug,
    name:         slug,           // use the raw search term as the name
    requested_by: req.user.id,
    status:       'pending',
    api_category: 'discovery',   // flag as a discovery request
  })

  await db.from('admin_alerts').insert({
    type:    'api_requested',
    message: `${user.email} requested a new API: "${slug}" — not yet in the vault`,
  })

  res.json({ ok: true, status: 'pending', discovery: true })
})

// PATCH /user/spend-cap — update the user's daily spend limit
// body: { cap: number | null }  (null explicitly removes the cap — allowed,
// but the UI should make clear this removes a safety net)
userRoute.patch('/spend-cap', async (req, res) => {
  const { cap } = req.body
  if (cap !== null && (typeof cap !== 'number' || cap < 1 || cap > 1000)) {
    return res.status(400).json({ error: 'Cap must be a number between $1 and $1000, or null to remove it' })
  }
  const { error } = await db.from('users').update({ daily_spend_cap: cap }).eq('id', req.user.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true, daily_spend_cap: cap })
})

// GET /user/keys — list all keys for this user (default + any scoped keys)
// Additive feature — most users will only ever see their one default key here.
userRoute.get('/keys', async (req, res) => {
  const { data: scopedKeys } = await db
    .from('vault_keys')
    .select('id, label, scopes, revoked, created_at, last_used_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })

  res.json({
    default_key_active: true, // the users.vault_key key always exists
    scoped_keys: scopedKeys || [],
  })
})

// POST /user/keys — create a new scoped key
// body: { label: string, scopes: string[] | null }  (null/omitted = full access)
userRoute.post('/keys', async (req, res) => {
  const { label, scopes } = req.body
  const { randomUUID } = await import('crypto')
  const newKey = randomUUID()

  const { data, error } = await db.from('vault_keys').insert({
    user_id: req.user.id,
    key:     newKey,
    label:   label || 'Untitled key',
    scopes:  Array.isArray(scopes) && scopes.length ? scopes : null,
  }).select('id, label, scopes, created_at').single()

  if (error) return res.status(500).json({ error: error.message })

  // Full key value is only ever returned once, at creation — same pattern as
  // the default vault key, which is masked everywhere except right after reveal.
  res.json({ ...data, key: `sk-vault-${newKey}` })
})

// DELETE /user/keys/:id — revoke a scoped key
userRoute.delete('/keys/:id', async (req, res) => {
  const { error } = await db
    .from('vault_keys')
    .update({ revoked: true })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id) // ensure users can only revoke their own keys
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
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
