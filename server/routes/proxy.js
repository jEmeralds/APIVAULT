// server/routes/proxy.js
import { Router } from 'express'
import { auth }     from '../middleware/auth.js'
import { limiter }  from '../middleware/rateLimit.js'
import { billing }  from '../services/billing.js'
import { pools }    from '../services/pools.js'
import { registry } from '../services/registry.js'
import { buildUpstreamRequest } from '../services/upstreamRequest.js'

export const proxyRoute = Router()

proxyRoute.all('/:service/*?', auth, async (req, res) => {
  const { service } = req.params
  const user = req.user

  // Per-user throttle + daily cap
  if (limiter.isThrottled(user.id, service))  return res.status(429).json({ error: 'Rate limit: 60 calls/min per API' })
  if (limiter.isDailyCapped(user.id))          return res.status(429).json({ error: 'Daily call limit reached' })

  // Resolve API config + master key
  const api = await registry.resolve(service)
  if (!api) return res.status(404).json({ error: `API '${service}' not found or paused` })

  // Scoped key enforcement — only applies if this request came in on a scoped
  // key (req.keyScope is an array). Default keys have req.keyScope === undefined
  // and skip this entirely, so nothing changes for the vast majority of requests.
  if (Array.isArray(req.keyScope) && !req.keyScope.includes(service)) {
    return res.status(403).json({ error: `This key is not scoped for '${service}'` })
  }

  const isFree = api.cost_per_call === 0 || api.cost_per_call === '0'

  // Pool circuit breaker — skip for free APIs (no pool spend)
  if (!isFree) {
    const poolOk = await pools.check(api.pool_id)
    if (!poolOk) return res.status(503).json({ error: 'Service temporarily unavailable', retry_after: 300 })
  }

  // Calculate what to charge user
  const charged = isFree
    ? 0
    : parseFloat((api.cost_per_call * (1 + api.markup / 100)).toFixed(8))

  // Deduct credits only for paid APIs
  if (charged > 0) {
    const deducted = await billing.deduct(user.id, charged)
    if (!deducted) return res.status(402).json({ error: 'Insufficient credits. Top up to continue.' })
  }

  // Build upstream request via shared module (also used by healthCheck.js)
  const upstreamPath = ('/' + (req.params[0] || '')).replace('//', '/') || '/'
  const { url: upstreamUrl, headers } = buildUpstreamRequest(api, upstreamPath, req.query)

  // Forward safe user headers
  if (req.headers['accept'])          headers['Accept']          = req.headers['accept']
  if (req.headers['accept-language']) headers['Accept-Language'] = req.headers['accept-language']

  return proxyRequest(req, res, api, user, upstreamUrl, headers, charged, isFree)
})

// ─── Shared proxy executor ────────────────────────────────────────────────

async function proxyRequest(req, res, api, user, upstreamUrl, headers, charged, isFree) {
  let upstreamRes, upstreamData

  try {
    upstreamRes = await fetch(upstreamUrl, {
      method:  req.method,
      headers,
      body:    req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      signal:  AbortSignal.timeout(120_000),  // 2 min — AI APIs need longer
    })
    upstreamData = await upstreamRes.json().catch(() => ({}))
  } catch (err) {
    // Network error or timeout — refund if we charged
    if (charged > 0) await billing.refund(user.id, charged, `timeout:${api.slug}`)
    return res.status(504).json({ error: 'Upstream timeout or unreachable' })
  }

  // Upstream 5xx — our fault zone, refund user
  if (upstreamRes.status >= 500) {
    if (charged > 0) await billing.refund(user.id, charged, `upstream_5xx:${api.slug}`)
    await billing.log(user.id, api.id, api.cost_per_call, 0, upstreamRes.status)
    return res.status(502).json({ error: 'Upstream server error', detail: upstreamData })
  }

  // Log + debit pool
  await Promise.all([
    billing.log(user.id, api.id, api.cost_per_call, charged, upstreamRes.status),
    isFree ? Promise.resolve() : pools.debit(api.pool_id, api.cost_per_call),
  ])

  res.status(upstreamRes.status).json(upstreamData)
}
