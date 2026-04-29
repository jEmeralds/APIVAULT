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

  // Resolve API config + decrypted master key
  const api = await registry.resolve(service)
  if (!api) return res.status(404).json({ error: `API '${service}' not found or paused` })

  // Pool circuit breaker
  const poolOk = await pools.check(api.pool_id)
  if (!poolOk) return res.status(503).json({ error: 'Service temporarily unavailable', retry_after: 300 })

  // Calculate what to charge user
  const charged = parseFloat((api.cost_per_call * (1 + api.markup / 100)).toFixed(8))

  // Atomic credit deduct — BEFORE upstream call
  const deducted = await billing.deduct(user.id, charged)
  if (!deducted) return res.status(402).json({ error: 'Insufficient credits. Top up to continue.' })

  // Strip internal headers, build upstream request
  const upstreamPath = req.path.replace(`/${service}`, '') || '/'
  const queryString  = Object.keys(req.query).length
    ? '?' + new URLSearchParams(req.query).toString()
    : ''
  const upstreamUrl  = api.upstream_url.replace(/\/$/, '') + upstreamPath + queryString

  // Different APIs use different auth header formats
  const authHeader = api.auth_header || 'Authorization'
  const authPrefix = api.auth_prefix || 'Bearer '
  const headers = {
    [authHeader]: `${authPrefix}${api.masterKey}`,
    'Content-Type': 'application/json',
  }
  // NewsAPI uses X-Api-Key with no prefix
  if (api.slug === 'newsapi') {
    delete headers['Authorization']
    headers['X-Api-Key'] = api.masterKey
  }
  // GitHub public API needs no auth for basic calls
  if (api.masterKey === 'no-key-required') {
    delete headers['Authorization']
  }
  // Forward safe user headers (e.g. Accept, Accept-Language)
  if (req.headers['accept'])          headers['Accept']          = req.headers['accept']
  if (req.headers['accept-language']) headers['Accept-Language'] = req.headers['accept-language']

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
    // Network error or timeout — refund user
    await billing.refund(user.id, charged, `timeout:${service}`)
    return res.status(504).json({ error: 'Upstream timeout or unreachable' })
  }

  // Upstream 5xx — our fault zone, refund user
  if (upstreamRes.status >= 500) {
    await billing.refund(user.id, charged, `upstream_5xx:${service}`)
    await billing.log(user.id, api.id, api.cost_per_call, 0, upstreamRes.status)
    return res.status(502).json({ error: 'Upstream server error', detail: upstreamData })
  }

  // Upstream 4xx — user error, no refund (they sent a bad request)
  // Log, debit pool for what we spent, return the error as-is
  await Promise.all([
    billing.log(user.id, api.id, api.cost_per_call, charged, upstreamRes.status),
    pools.debit(api.pool_id, api.cost_per_call),
  ])

  res.status(upstreamRes.status).json(upstreamData)
})