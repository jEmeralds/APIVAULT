// server/routes/proxy.js
import { Router } from 'express'
import { auth }     from '../middleware/auth.js'
import { limiter }  from '../middleware/rateLimit.js'
import { billing }  from '../services/billing.js'
import { pools }    from '../services/pools.js'
import { registry } from '../services/registry.js'

export const proxyRoute = Router()

proxyRoute.all('/:service/*', auth, async (req, res) => {
  const { service } = req.params
  const user = req.user

  // Per-user throttle + daily cap
  if (limiter.isThrottled(user.id, service))  return res.status(429).json({ error: 'Rate limit: 60 calls/min per API' })
  if (limiter.isDailyCapped(user.id))          return res.status(429).json({ error: 'Daily call limit reached' })

  // Resolve API config + master key
  const api = await registry.resolve(service)
  if (!api) return res.status(404).json({ error: `API '${service}' not found or paused` })

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

  // Build upstream request
  const upstreamPath = req.path.replace(`/${service}`, '') || '/'
  const queryString  = Object.keys(req.query).length
    ? '?' + new URLSearchParams(req.query).toString()
    : ''
  const upstreamUrl  = api.upstream_url.replace(/\/$/, '') + upstreamPath + queryString

  // Build headers — different APIs use different auth formats
  const headers = {
    'Content-Type': 'application/json',
  }

  const masterKey = api.masterKey

  if (masterKey && masterKey !== 'no-key-required' && masterKey !== 'pending-setup') {
    const authHeader = api.auth_header || 'Authorization'
    const authPrefix = api.auth_prefix || 'Bearer '

    // Per-API auth overrides
    if (api.slug === 'newsapi') {
      headers['X-Api-Key'] = masterKey
    } else if (api.slug === 'openweather') {
      // OpenWeather uses ?appid= query param — append it
      const sep = upstreamUrl.includes('?') ? '&' : '?'
      const finalUrl = upstreamUrl + sep + 'appid=' + masterKey
      return proxyRequest(req, res, api, user, finalUrl, headers, charged, isFree)
    } else if (api.slug === 'nasa') {
      // NASA uses ?api_key= query param
      const sep = upstreamUrl.includes('?') ? '&' : '?'
      const finalUrl = upstreamUrl + sep + 'api_key=' + masterKey
      return proxyRequest(req, res, api, user, finalUrl, headers, charged, isFree)
    } else if (api.slug === 'ipgeo') {
      // ip-api.com uses no auth at all
      return proxyRequest(req, res, api, user, upstreamUrl, headers, charged, isFree)
    } else {
      headers[authHeader] = `${authPrefix}${masterKey}`
    }
  }

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
      signal:  AbortSignal.timeout(30_000),
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