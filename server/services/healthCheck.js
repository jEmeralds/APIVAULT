// server/services/healthCheck.js
import { db } from '../db.js'
import { registry } from './registry.js'
import { buildUpstreamRequest } from './upstreamRequest.js'
import { notifyAdmin } from './notify.js'

// Fail this many CONSECUTIVE times before flagging as degraded.
// Avoids flapping the ticker/marketplace off for one transient network blip
// (which is exactly the kind of noisy alert nobody trusts after a week).
const HEALTH_FAIL_THRESHOLD = 2
const CHECK_TIMEOUT_MS = 10_000

async function checkOne(slug) {
  const api = await registry.resolve(slug)
  if (!api || !api.try_path) return null // nothing to check against

  const { url, headers } = buildUpstreamRequest(api, api.try_path)
  const method = api.try_method || 'GET'

  let ok = false
  let reason = ''

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' && method !== 'HEAD' && api.try_body ? JSON.stringify(api.try_body) : undefined,
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      reason = `HTTP ${res.status}`
    } else if (data && data.success === false) {
      // Catches the exact shape restcountries returned when it deprecated its API:
      // { success: false, errors: [...] } with a 200-level status.
      reason = data.errors?.[0]?.message || 'API reported success:false'
    } else if (data && data.error) {
      reason = typeof data.error === 'string' ? data.error : 'API reported an error field'
    } else {
      ok = true
    }
  } catch (err) {
    reason = err.name === 'TimeoutError' ? 'Timed out' : (err.message || 'Network error')
  }

  return { slug: api.slug, name: api.name, id: api.id, ok, reason }
}

async function applyResult(row, result) {
  if (!result) return

  const now = new Date().toISOString()

  if (result.ok) {
    // Recovery — only notify if it was previously degraded, don't spam on every healthy check
    if (row.health_status === 'degraded') {
      await notifyAdmin({
        type: 'health_recovered',
        apiId: row.id,
        subject: `✅ ${row.name} is back up`,
        message: `${row.name} (${row.slug}) passed its health check again after being degraded.`,
      })
    }
    await db.from('api_registry').update({
      health_status: 'ok',
      health_fail_count: 0,
      last_health_check: now,
    }).eq('id', row.id)
    return
  }

  const failCount = (row.health_fail_count || 0) + 1
  const shouldDegrade = failCount >= HEALTH_FAIL_THRESHOLD && row.health_status !== 'degraded'

  await db.from('api_registry').update({
    health_status: failCount >= HEALTH_FAIL_THRESHOLD ? 'degraded' : row.health_status,
    health_fail_count: failCount,
    last_health_check: now,
  }).eq('id', row.id)

  if (shouldDegrade) {
    await notifyAdmin({
      type: 'health_degraded',
      apiId: row.id,
      subject: `⚠️ ${row.name} is failing health checks`,
      message: `${row.name} (${row.slug}) has failed its health check ${failCount} times in a row. Reason: ${result.reason}. It's been hidden from the showcase ticker and marketplace discovery until it recovers — paid API calls are unaffected.`,
    })
  }
}

export const healthCheck = {
  async runOnce() {
    const { data: rows, error } = await db
      .from('api_registry')
      .select('id, slug, name, try_path, health_status, health_fail_count')
      .eq('status', 'live')
      .not('try_path', 'is', null)

    if (error) {
      console.error('healthCheck: failed to load registry rows', error.message)
      return
    }

    for (const row of rows) {
      try {
        const result = await checkOne(row.slug)
        await applyResult(row, result)
      } catch (err) {
        console.error(`healthCheck: unexpected error checking ${row.slug}`, err.message)
      }
    }
  },

  startCron(intervalMs = 20 * 60 * 1000) { // every 20 minutes by default
    // Run once shortly after boot, then on the interval
    setTimeout(() => this.runOnce().catch(err => console.error('healthCheck: initial run failed', err.message)), 30_000)
    setInterval(() => this.runOnce().catch(err => console.error('healthCheck: scheduled run failed', err.message)), intervalMs)
  },
}