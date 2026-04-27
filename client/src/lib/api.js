// client/src/lib/api.js
const BASE = import.meta.env.VITE_API_URL || ''

function token() { return localStorage.getItem('token') || '' }

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export const api = {
  // Auth
  login: (email, password) => fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }).then(r => r.json()),

  // User
  me:           ()      => req('GET',  '/user/me'),
  myAPIs:       ()      => req('GET',  '/user/apis'),
  marketplace:  ()      => req('GET',  '/user/marketplace'),
  usage:        ()      => req('GET',  '/user/usage'),
  usageStats:   ()      => req('GET',  '/user/usage/stats'),
  requestAPI:   (slug)  => req('POST', '/user/request-api', { slug }),
  revealKey:    ()      => req('POST', '/user/key/reveal'),

  // Credits
  buyCredits:    (amount)    => req('POST', '/checkout', { amount }),
  verifyPayment: (reference) => req('GET',  `/checkout/verify?reference=${reference}`),

  // Admin
  overview:  ()              => req('GET',   '/admin/overview'),
  allAPIs:   ()              => req('GET',   '/admin/apis'),
  addAPI:    (body)          => req('POST',  '/admin/apis', body),
  editAPI:   (id, body)      => req('PATCH', `/admin/apis/${id}`, body),
  rotateKey: (slug, k)       => req('POST',  `/admin/apis/${slug}/rotate-key`, { key: k }),

  allUsers:  ()              => req('GET',   '/admin/users'),
  addUser:   (body)          => req('POST',  '/admin/users', body),
  editUser:  (id, body)      => req('PATCH', `/admin/users/${id}`, body),
  adjCreds:  (id, amt, rsn)  => req('POST',  `/admin/users/${id}/adjust-credits`, { amount: amt, reason: rsn }),
  setAccess: (id, cats, lim) => req('PATCH', `/admin/users/${id}/access`, { categories: cats, daily_limit: lim }),

  allPools:  ()              => req('GET',  '/admin/pools'),
  topUp:     (id, amt)       => req('POST', `/admin/pools/${id}/topup`, { amount: amt }),

  alerts:    ()              => req('GET',   '/admin/alerts'),
  resolve:   (id)            => req('PATCH', `/admin/alerts/${id}/resolve`),

  logs:      (n = 100)       => req('GET',  `/admin/logs?limit=${n}`),
  billing:       ()          => req('GET',  '/admin/billing'),
  billingCharts: ()          => req('GET',  '/admin/billing/charts'),
  allRequests:   ()          => req('GET',  '/admin/requests'),
  approveReq:    (id)        => req('PATCH', `/admin/requests/${id}/approve`),
  denyReq:       (id)        => req('PATCH', `/admin/requests/${id}/deny`),

  health:    ()              => req('GET',  '/health'),
}