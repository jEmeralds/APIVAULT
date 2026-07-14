// server/services/upstreamRequest.js
// Single source of truth for "how do we call this upstream API."
// Used by both the live proxy route (server/routes/proxy.js) and the
// health check service (server/services/healthCheck.js) so the two
// can never drift out of sync on auth handling.

// Builds { url, headers } for a given API config + path/query.
// Does NOT make the request — callers decide how (fetch, timeout, etc.)
export function buildUpstreamRequest(api, path, query = {}) {
  const upstreamPath = ('/' + (path || '')).replace('//', '/') || '/'
  const queryString  = Object.keys(query).length
    ? '?' + new URLSearchParams(query).toString()
    : ''
  let upstreamUrl = api.upstream_url.replace(/\/$/, '') + upstreamPath + queryString

  const headers = {
    'Content-Type': 'application/json',
  }

  const masterKey = api.masterKey

  if (masterKey && masterKey !== 'no-key-required' && masterKey !== 'pending-setup') {
    const authHeader = api.auth_header || 'Authorization'
    const authPrefix = api.auth_prefix || 'Bearer '

    // Per-API auth overrides — kept identical to proxy.js's prior inline logic
    if (api.slug === 'newsapi') {
      headers['X-Api-Key'] = masterKey
    } else if (api.slug === 'openweather') {
      const sep = upstreamUrl.includes('?') ? '&' : '?'
      upstreamUrl = upstreamUrl + sep + 'appid=' + masterKey
    } else if (api.slug === 'nasa') {
      const sep = upstreamUrl.includes('?') ? '&' : '?'
      upstreamUrl = upstreamUrl + sep + 'api_key=' + masterKey
    } else if (api.slug === 'ipgeo') {
      // Matches original proxy.js behavior exactly: ipgeo returns early
      // without adding any auth header (key is not sent as a header for this API).
    } else if (api.slug === 'claude') {
      headers['x-api-key'] = masterKey
      headers['anthropic-version'] = '2023-06-01'
      delete headers['Authorization']
    } else if (api.slug === 'gemini') {
      const sep = upstreamUrl.includes('?') ? '&' : '?'
      upstreamUrl = upstreamUrl + sep + 'key=' + masterKey
    } else {
      headers[authHeader] = `${authPrefix}${masterKey}`
    }
  }

  return { url: upstreamUrl, headers }
}
