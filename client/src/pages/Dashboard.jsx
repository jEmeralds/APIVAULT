// client/src/pages/Dashboard.jsx
// Complete user dashboard — Marketplace, Usage, Billing, Docs, Settings
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'

const BASE = import.meta.env.VITE_API_URL || ''

// ─── Constants ────────────────────────────────────────────────────────────

const CAT_STYLE = {
  ai:       { badge: 'bg-purple-50 text-purple-700 border-purple-100',   label: 'AI' },
  payments: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Payments' },
  comms:    { badge: 'bg-blue-50 text-blue-700 border-blue-100',          label: 'Comms' },
  data:     { badge: 'bg-amber-50 text-amber-700 border-amber-100',       label: 'Data' },
  dev:      { badge: 'bg-orange-50 text-orange-700 border-orange-100',    label: 'Dev' },
}

const PLAN_CATS = { dev: ['ai','dev'], creator: ['ai','comms'], business: ['payments','comms','data'] }

const API_DOCS = {
  openweather: {
    endpoints: [
      { method: 'GET', path: '/weather', desc: 'Current weather for a location',
        params: [{ name: 'q', desc: 'City name', example: 'Nairobi' }, { name: 'units', desc: 'metric | imperial', example: 'metric' }] },
      { method: 'GET', path: '/forecast', desc: '5-day weather forecast',
        params: [{ name: 'q', desc: 'City name', example: 'Nairobi' }, { name: 'cnt', desc: 'Number of entries', example: '10' }] },
    ],
    tryPath: '/weather?q=Nairobi&units=metric',
  },
  newsapi: {
    endpoints: [
      { method: 'GET', path: '/top-headlines', desc: 'Top headlines by country or category',
        params: [{ name: 'country', desc: '2-letter country code', example: 'us' }, { name: 'category', desc: 'tech|business|sports', example: 'technology' }, { name: 'pageSize', desc: 'Results per page', example: '5' }] },
      { method: 'GET', path: '/everything', desc: 'Search all news articles',
        params: [{ name: 'q', desc: 'Keywords to search', example: 'Kenya economy' }, { name: 'sortBy', desc: 'relevancy|popularity|publishedAt', example: 'publishedAt' }] },
    ],
    tryPath: '/top-headlines?country=us&pageSize=3',
  },
  github: {
    endpoints: [
      { method: 'GET', path: '/users/:username', desc: 'Get a GitHub user profile',
        params: [{ name: ':username', desc: 'GitHub username', example: 'torvalds' }] },
      { method: 'GET', path: '/repos/:owner/:repo', desc: 'Get repository info',
        params: [{ name: ':owner', desc: 'Owner username', example: 'facebook' }, { name: ':repo', desc: 'Repo name', example: 'react' }] },
      { method: 'GET', path: '/search/repositories', desc: 'Search repositories',
        params: [{ name: 'q', desc: 'Search query', example: 'machine-learning stars:>5000' }] },
    ],
    tryPath: '/users/octocat',
  },
  gpt4o: {
    endpoints: [
      { method: 'POST', path: '/chat/completions', desc: 'Chat completions with GPT-4o',
        params: [{ name: 'model', desc: 'Model ID', example: 'gpt-4o' }, { name: 'messages', desc: 'Conversation messages array', example: '[{"role":"user","content":"Hello"}]' }] },
    ],
    tryPath: null,
  },
  restcountries: {
    endpoints: [
      { method: 'GET', path: '/name/:country', desc: 'Search country by name',
        params: [{ name: ':country', desc: 'Country name', example: 'kenya' }] },
      { method: 'GET', path: '/alpha/:code', desc: 'Get country by ISO code',
        params: [{ name: ':code', desc: '2 or 3 letter ISO code', example: 'KE' }] },
      { method: 'GET', path: '/region/:region', desc: 'Get all countries in a region',
        params: [{ name: ':region', desc: 'africa|europe|asia|americas|oceania', example: 'africa' }] },
    ],
    tryPath: '/name/kenya',
  },
  ipgeo: {
    endpoints: [
      { method: 'GET', path: '/json/:ip', desc: 'Get location info for an IP address',
        params: [{ name: ':ip', desc: 'IPv4 address', example: '8.8.8.8' }] },
      { method: 'GET', path: '/json', desc: 'Get location of the caller IP', params: [] },
    ],
    tryPath: '/json/8.8.8.8',
  },
  exchangerates: {
    endpoints: [
      { method: 'GET', path: '/latest/:base', desc: 'Get latest exchange rates',
        params: [{ name: ':base', desc: 'Base currency code', example: 'USD' }] },
      { method: 'GET', path: '/history/:base', desc: 'Get historical rates',
        params: [{ name: ':base', desc: 'Base currency code', example: 'KES' }] },
    ],
    tryPath: '/latest/USD',
  },
  jokeapi: {
    endpoints: [
      { method: 'GET', path: '/joke/Any', desc: 'Get a random joke',
        params: [{ name: 'type', desc: 'single | twopart', example: 'single' }, { name: 'amount', desc: 'Number of jokes', example: '1' }] },
      { method: 'GET', path: '/joke/Programming', desc: 'Get a programming joke', params: [] },
    ],
    tryPath: '/joke/Programming?type=single',
  },
  dictionary: {
    endpoints: [
      { method: 'GET', path: '/entries/en/:word', desc: 'Get definition of an English word',
        params: [{ name: ':word', desc: 'Word to look up', example: 'entrepreneur' }] },
    ],
    tryPath: '/entries/en/hello',
  },
  default: {
    endpoints: [{ method: 'GET', path: '/', desc: 'Forward requests to the upstream API', params: [] }],
    tryPath: '/',
  },
}

// ─── Primitives ───────────────────────────────────────────────────────────

function Badge({ cat }) {
  const s = CAT_STYLE[cat] || CAT_STYLE.dev
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${s.badge}`}>{s.label}</span>
}

function Spinner({ size = 4 }) {
  return <div className={`w-${size} h-${size} border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin`} />
}

function CopyBtn({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000) }}
      className="text-xs px-2.5 py-1 rounded-md border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors">
      {done ? '✓ Copied' : label}
    </button>
  )
}

function CustomAmount({ onBuy }) {
  const [val, setVal]       = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr]       = useState('')
  const num = parseFloat(val)
  const valid = !isNaN(num) && num >= 1 && num <= 500

  async function buy() {
    if (!valid) return
    setLoading(true); setErr('')
    try { await onBuy(Math.round(num)) }
    catch (e) { setErr(e.message) }
    setLoading(false)
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">$</span>
          <input
            type="number" min="1" max="500" placeholder="Enter amount"
            value={val} onChange={e => { setVal(e.target.value); setErr('') }}
            onKeyDown={e => e.key === 'Enter' && buy()}
            className="w-full pl-7 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-300"
          />
        </div>
        <button onClick={buy} disabled={!valid || loading}
          className="px-4 py-2.5 bg-gray-900 text-white text-sm rounded-lg font-medium
            hover:bg-gray-800 disabled:opacity-40 transition-all whitespace-nowrap">
          {loading ? '...' : 'Pay now'}
        </button>
      </div>
      {err && <div className="text-xs text-red-500 mt-1.5">{err}</div>}
      {val && !valid && num < 1 && <div className="text-xs text-gray-400 mt-1.5">Minimum amount is $1</div>}
      {val && !valid && num > 500 && <div className="text-xs text-gray-400 mt-1.5">Maximum amount is $500</div>}
      <div className="text-xs text-gray-300 mt-1.5">Min $1 · Max $500 · Charged in KES</div>
    </div>
  )
}

function Notice({ msg, ok, onClose }) {
  if (!msg) return null
  return (
    <div className={`mb-5 flex items-center gap-3 p-3.5 rounded-xl border text-sm
      ${ok ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
      <div className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="text-lg leading-none opacity-40 hover:opacity-100">×</button>
    </div>
  )
}

// ─── Marketplace ──────────────────────────────────────────────────────────

function buildSnippet(slug, path, method = 'GET', body = null, lang = 'js', vaultKey = null) {
  const API_BASE = 'https://apivault-production-736c.up.railway.app'
  const key = vaultKey || 'YOUR_VAULT_KEY'

  if (lang === 'js') return [
    `const res = await fetch('${API_BASE}/proxy/${slug}${path}', {`,
    `  method: '${method}',`,
    `  headers: {`,
    `    'x-vault-key': '${key}',`,
    `    'Content-Type': 'application/json',`,
    `  },`,
    body ? `  body: JSON.stringify(${JSON.stringify(body, null, 2)}),` : null,
    `});`,
    `const data = await res.json();`,
    `console.log(data);`,
  ].filter(Boolean).join('\n')

  if (lang === 'python') return [
    `import requests`,
    ``,
    `res = requests.${method.toLowerCase()}(`,
    `    '${API_BASE}/proxy/${slug}${path}',`,
    `    headers={`,
    `        'x-vault-key': '${key}',`,
    `        'Content-Type': 'application/json',`,
    `    },`,
    body ? `    json=${JSON.stringify(body)},` : null,
    `)`,
    `print(res.json())`,
  ].filter(l => l !== null).join('\n')

  return [
    `curl '${API_BASE}/proxy/${slug}${path}' \\`,
    `  -X ${method} \\`,
    `  -H 'x-vault-key: ${key}'`,
    body ? `  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(body)}'` : null,
  ].filter(Boolean).join('\n')
}

function APICard({ a, onRequest, requesting, expanded, onExpand, vaultKey }) {
  const [lang, setLang]       = useState('js')
  const [trying, setTrying]   = useState(false)
  const [result, setResult]   = useState(null)
  const isOpen = expanded === a.slug
  const doc    = API_DOCS[a.slug] || API_DOCS.default
  const tryPath = doc.tryPath

  async function tryIt() {
    if (!tryPath) return
    setTrying(true); setResult(null)
    try {
      const uuid = vaultKey?.replace('sk-vault-', '')
      const res  = await fetch(`${BASE}/proxy/${a.slug}${tryPath}`, {
        headers: { 'x-vault-key': uuid }
      })
      const data = await res.json()
      setResult({ ok: res.ok, status: res.status, data })
    } catch (e) { setResult({ ok: false, error: e.message }) }
    setTrying(false)
  }

  return (
    <div className={`bg-white border rounded-xl transition-all
      ${isOpen ? 'border-gray-900 shadow-md' : 'border-gray-100 hover:border-gray-200'}`}>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-gray-900 truncate">{a.name}</div>
            {a.description && <div className="text-xs text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{a.description}</div>}
            <div className="font-mono text-xs text-gray-300 mt-1">/proxy/{a.slug}</div>
          </div>
          <Badge cat={a.category} />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <div>
            <span className="font-mono text-sm font-semibold text-gray-900">
              {a.user_price > 0 ? `$${a.user_price.toFixed(4)}` : 'Free'}
            </span>
            <span className="text-xs text-gray-400 ml-1">/ call</span>
          </div>

          {a.has_access ? (
            <button onClick={() => onExpand(a.slug)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-all
                ${isOpen ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-700 hover:border-gray-900'}`}>
              {isOpen ? '✕ Close' : '⚡ Use API'}
            </button>
          ) : a.request_status === 'pending' ? (
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 text-xs rounded-lg font-medium">Requested</span>
          ) : a.request_status === 'approved' ? (
            <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-100 text-xs rounded-lg font-medium">Approved</span>
          ) : (
            <button onClick={() => onRequest(a.slug)} disabled={requesting === a.slug}
              className="px-2.5 py-1 border border-gray-200 text-xs rounded-lg text-gray-600
                hover:border-gray-900 hover:text-gray-900 transition-all disabled:opacity-50">
              {requesting === a.slug ? '...' : 'Request access'}
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-gray-100">
          {/* Lang selector + code */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-1 p-1 bg-gray-800 rounded-lg">
                {[['js','JS'], ['python','Python'], ['curl','cURL']].map(([id, label]) => (
                  <button key={id} onClick={() => setLang(id)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                      lang === id ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-gray-200'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {vaultKey && <span className="text-xs text-green-400">✓ Key loaded</span>}
                <CopyBtn text={buildSnippet(a.slug, tryPath || '/', 'GET', null, lang, vaultKey)} />
              </div>
            </div>
            <div className="bg-gray-950 rounded-xl p-4 overflow-x-auto">
              <pre className="text-xs text-gray-300 font-mono leading-relaxed whitespace-pre">
                {buildSnippet(a.slug, tryPath || '/', 'GET', null, lang, vaultKey)}
              </pre>
            </div>
          </div>

          {/* Try it */}
          {tryPath && (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-3 mb-3">
                <button onClick={tryIt} disabled={trying || !vaultKey}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700
                    disabled:opacity-50 transition-colors font-medium flex items-center gap-2">
                  {trying ? <><Spinner size={3} /><span>Running...</span></> : '▶ Run live'}
                </button>
                <span className="text-xs text-gray-400">
                {vaultKey ? 'Key loaded · Uses your credits' : 'Go to Billing to reveal your key first'}
              </span>
              </div>

              {result && (
                <div className={`rounded-xl p-3.5 border ${result.ok ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  <div className={`text-xs font-semibold mb-2 ${result.ok ? 'text-green-700' : 'text-red-600'}`}>
                    {result.ok ? `✓ ${result.status} OK` : `✗ ${result.status || 'Error'}`}
                  </div>
                  <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap overflow-x-auto max-h-48">
                    {JSON.stringify(result.data || result.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Marketplace({ marketplace, me, vaultKey }) {
  const [catFilter, setCatFilter] = useState('all')
  const [expanded, setExpanded]   = useState(null)
  const [requesting, setReq]      = useState(null)
  const [notice, setNotice]       = useState(null)

  const cats     = ['all', ...new Set(marketplace.map(a => a.category))]
  const filtered = catFilter === 'all' ? marketplace : marketplace.filter(a => a.category === catFilter)
  const myAPIs   = marketplace.filter(a => a.has_access)

  async function requestAPI(slug) {
    setReq(slug)
    try {
      await api.requestAPI(slug)
      setNotice({ ok: true, msg: 'Access requested. Admin will review shortly.' })
    } catch (e) { setNotice({ ok: false, msg: e.message }) }
    setReq(null)
  }

  return (
    <div>
      <Notice msg={notice?.msg} ok={notice?.ok} onClose={() => setNotice(null)} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="font-semibold text-gray-900 text-lg">API Marketplace</h1>
          <p className="text-sm text-gray-400 mt-0.5">{myAPIs.length} active · {marketplace.length} total</p>
        </div>
        <span className="text-xs font-semibold px-3 py-1.5 bg-gray-900 text-white rounded-lg capitalize w-fit">{me.plan} plan</span>
      </div>

      {/* Plan banner */}
      <div className="mb-5 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-blue-900 capitalize">{me.plan} plan includes</div>
            <div className="text-xs text-blue-600 mt-0.5">
              {PLAN_CATS[me.plan]?.map(c => CAT_STYLE[c]?.label || c).join(', ')} APIs
              {me.plan !== 'business' && ' · Request access to unlock other categories'}
            </div>
          </div>
          <div className="text-xs font-semibold text-blue-600">{myAPIs.length}/{marketplace.length} APIs active</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1">
        {cats.map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all capitalize flex-shrink-0 ${
              catFilter === c ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}>
            {c === 'all' ? `All (${marketplace.length})` : `${CAT_STYLE[c]?.label || c} (${marketplace.filter(a => a.category === c).length})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(a => (
          <APICard key={a.slug} a={a}
            onRequest={requestAPI} requesting={requesting}
            expanded={expanded} onExpand={s => setExpanded(expanded === s ? null : s)}
            vaultKey={vaultKey}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Usage ────────────────────────────────────────────────────────────────

function BarChart({ data, valueKey, labelKey, color, formatVal }) {
  if (!data?.length) return <div className="text-xs text-gray-300 py-6 text-center">No data yet</div>
  const max = Math.max(...data.map(d => d[valueKey])) || 1
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex-1 group relative">
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block
            bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
            {d[labelKey]}: {formatVal ? formatVal(d[valueKey]) : d[valueKey]}
          </div>
          <div className={`w-full rounded-sm ${color} opacity-70 hover:opacity-100 transition-opacity`}
            style={{ height: `${Math.max((d[valueKey] / max) * 72, 2)}px` }} />
        </div>
      ))}
    </div>
  )
}

function Usage({ stats, usage }) {
  if (!stats) return <div className="flex justify-center py-16"><Spinner size={6} /></div>
  return (
    <div>
      <h1 className="font-semibold text-gray-900 text-lg mb-6">Usage</h1>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: '7-day calls', value: stats.total_calls?.toLocaleString() || '0' },
          { label: '7-day spend', value: `$${parseFloat(stats.total_spent || 0).toFixed(4)}` },
          { label: 'Top APIs',    value: stats.top_apis?.length || 0 },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">{s.label}</div>
            <div className="text-xl font-semibold text-gray-900">{s.value}</div>
          </div>
        ))}
      </div>

      {stats.daily?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-medium text-gray-500 mb-3">Daily calls — 7 days</div>
            <BarChart data={stats.daily} valueKey="calls" labelKey="date" color="bg-indigo-400" />
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-medium text-gray-500 mb-3">Daily spend — 7 days</div>
            <BarChart data={stats.daily} valueKey="spent" labelKey="date" color="bg-emerald-400" formatVal={v => `$${v.toFixed(4)}`} />
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden overflow-x-auto">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">Recent calls</span>
          <span className="text-xs text-gray-400">{usage.length} records</span>
        </div>
        <table className="w-full text-sm min-w-[380px]">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50">
              {['Time', 'API', 'Status', 'Charged'].map(h => (
                <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-2.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usage.slice(0, 20).map((u, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{new Date(u.ts).toLocaleTimeString()}</td>
                <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{u.api_registry?.name}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border
                    ${u.http_status < 300 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {u.http_status}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">${parseFloat(u.charged || 0).toFixed(4)}</td>
              </tr>
            ))}
            {!usage.length && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-300 text-sm">No API calls yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Billing ──────────────────────────────────────────────────────────────

function Billing({ me, setMe, vaultKey, setVaultKey }) {
  const [notice, setNotice] = useState(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('reference')
    if (!ref) return
    api.verifyPayment(ref)
      .then(r => {
        setNotice({ ok: r.ok, msg: r.ok ? `$${r.amount} credits added!` : 'Payment could not be verified.' })
        window.history.replaceState({}, '', '/app')
        api.me().then(m => setMe(m))
      })
      .catch(() => setNotice({ ok: false, msg: 'Verification failed.' }))
  }, [])

  return (
    <div className="max-w-lg">
      <h1 className="font-semibold text-gray-900 text-lg mb-6">Billing & Credits</h1>
      <Notice msg={notice?.msg} ok={notice?.ok} onClose={() => setNotice(null)} />

      {/* Balance card */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-gray-400 mb-1">Available credits</div>
            <div className="text-4xl font-bold tracking-tight text-gray-900">
              ${parseFloat(me?.credits || 0).toFixed(2)}
            </div>
          </div>
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl
            ${(me?.credits || 0) < 1 ? 'bg-red-50' : 'bg-green-50'}`}>
            {(me?.credits || 0) < 1 ? '⚠️' : '💳'}
          </div>
        </div>
        <div className="h-2 bg-gray-100 rounded-full">
          <div className={`h-2 rounded-full transition-all ${(me?.credits || 0) < 1 ? 'bg-red-400' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(((me?.credits || 0) / 50) * 100, 100)}%` }} />
        </div>
        {(me?.credits || 0) < 1 && (
          <div className="text-xs text-red-500 mt-2 font-medium">⚠ Low balance — top up to continue using APIs</div>
        )}
      </div>

      {/* Buy credits */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <div className="text-sm font-semibold text-gray-900 mb-1">Add credits</div>
        <div className="text-xs text-gray-400 mb-4">Secure payment via Paystack · Credits never expire</div>

        {/* Quick amounts */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[5, 10, 25, 50, 100, 200].map(amt => (
            <button key={amt}
              onClick={async () => {
                try { const { url } = await api.buyCredits(amt); window.location.href = url }
                catch (e) { setNotice({ ok: false, msg: e.message }) }
              }}
              className="py-3 border border-gray-200 rounded-xl text-center transition-all
                hover:border-gray-900 hover:bg-gray-900 hover:text-white group">
              <div className="text-xs text-gray-400 group-hover:text-gray-300">Add</div>
              <div className="text-base font-bold text-gray-900 group-hover:text-white">${amt}</div>
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="border-t border-gray-50 pt-3">
          <div className="text-xs text-gray-400 mb-2">Or enter a custom amount</div>
          <CustomAmount onBuy={async (amt) => {
            try { const { url } = await api.buyCredits(amt); window.location.href = url }
            catch (e) { setNotice({ ok: false, msg: e.message }) }
          }} />
        </div>
      </div>

      {/* Vault key */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="text-sm font-semibold text-gray-900 mb-1">Your vault key</div>
        <div className="text-xs text-gray-400 mb-3">
          Include in every API request as the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono">x-vault-key</code> header
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 font-mono text-xs text-gray-700 truncate">
            {vaultKey || 'sk-vault-••••••••••••••••••••••••••••••••••••'}
          </div>
          <button onClick={async () => {
            const { key: k } = await api.revealKey()
            setVaultKey(k); setRevealed(true)
            navigator.clipboard?.writeText(k)
          }} className="px-3 py-2.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-800 transition-colors font-medium whitespace-nowrap">
            {revealed ? '✓ Copied' : 'Reveal & copy'}
          </button>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
          🔒 Keep this key secret. Anyone with this key can make API calls billed to your account.
        </div>
      </div>
    </div>
  )
}

// ─── Docs ─────────────────────────────────────────────────────────────────

function Docs({ marketplace, vaultKey }) {
  const [sel, setSel]   = useState(null)
  const [lang, setLang] = useState('js')
  const live = marketplace.filter(a => a.status === 'live')

  useEffect(() => { if (live.length && !sel) setSel(live[0]?.slug) }, [live])

  const a   = live.find(x => x.slug === sel)
  const doc = a ? (API_DOCS[a.slug] || API_DOCS.default) : null

  function makeCode(ep) {
    const hasPathParams = ep.params.some(p => p.name.startsWith(':'))
    const queryParams   = ep.params.filter(p => !p.name.startsWith(':'))
    const pathResolved  = ep.path.replace(/:(\w+)/g, (_, k) => {
      const p = ep.params.find(x => x.name === `:${k}`)
      return p?.example || k
    })
    const qs = ep.method === 'GET' && queryParams.length
      ? '?' + queryParams.map(p => `${p.name}=${p.example}`).join('&')
      : ''
    return buildSnippet(a.slug, pathResolved + qs, ep.method, ep.method !== 'GET' ? {} : null, lang, vaultKey)
  }

  return (
    <div>
      <h1 className="font-semibold text-gray-900 text-lg mb-1">Documentation</h1>
      <p className="text-xs text-gray-400 mb-6">
        Base URL: <code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-700">https://apivault-production-736c.up.railway.app</code>
      </p>

      <div className="flex gap-5">
        {/* Sidebar */}
        <div className="w-40 flex-shrink-0">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Live APIs</div>
          <div className="space-y-1">
            {live.map(x => (
              <button key={x.slug} onClick={() => setSel(x.slug)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  sel === x.slug ? 'bg-gray-900 text-white font-medium' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                {x.name}
              </button>
            ))}
            {!live.length && <div className="text-xs text-gray-300 px-2 py-2">No active APIs</div>}
          </div>
        </div>

        {/* Doc content */}
        <div className="flex-1 min-w-0">
          {a && doc ? (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-bold text-gray-900 text-xl">{a.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">{a.description}</p>
                </div>
                <Badge cat={a.category} />
              </div>

              {/* Auth section */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-5">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Authentication</div>
                <p className="text-sm text-gray-600 mb-2">Add your vault key to every request header:</p>
                <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm text-emerald-400">
                  x-vault-key: YOUR_VAULT_KEY
                </div>
                <p className="text-xs text-gray-400 mt-2">Get your vault key from the Billing tab.</p>
              </div>

              {/* Pricing */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pricing</div>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-gray-900 font-mono">
                    {a.user_price > 0 ? `$${a.user_price.toFixed(4)}` : 'Free'}
                  </div>
                  <div className="text-sm text-gray-500">per API call · Deducted from your credits balance</div>
                </div>
              </div>

              {/* Language picker */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-4">
                {[['js','JavaScript'], ['python','Python'], ['curl','cURL']].map(([id, lbl]) => (
                  <button key={id} onClick={() => setLang(id)}
                    className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                      lang === id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {lbl}
                  </button>
                ))}
              </div>

              {/* Endpoints */}
              <div className="space-y-4">
                {doc.endpoints.map((ep, i) => (
                  <div key={i} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-3 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono
                        ${ep.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {ep.method}
                      </span>
                      <code className="font-mono text-sm text-gray-800">/proxy/{a.slug}{ep.path}</code>
                      <span className="text-xs text-gray-400">{ep.desc}</span>
                    </div>

                    {ep.params.length > 0 && (
                      <div className="px-4 py-3 border-b border-gray-50">
                        <div className="text-xs font-semibold text-gray-400 mb-2">Parameters</div>
                        <div className="space-y-2">
                          {ep.params.map(p => (
                            <div key={p.name} className="flex items-start gap-3 text-xs">
                              <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 flex-shrink-0">{p.name}</code>
                              <span className="text-gray-500 flex-1">{p.desc}</span>
                              <span className="text-gray-300 hidden sm:block font-mono">{p.example}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-gray-400">Code example</div>
                        <CopyBtn text={makeCode(ep)} />
                      </div>
                      <div className="bg-gray-950 rounded-xl p-4 overflow-x-auto">
                        <pre className="text-xs text-gray-300 font-mono leading-relaxed whitespace-pre">{makeCode(ep)}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-300">
              <div className="text-5xl mb-4">📖</div>
              <div className="text-sm">Select an API from the sidebar</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Settings ─────────────────────────────────────────────────────────────

function Settings({ me }) {
  const [form, setForm]   = useState({ current: '', next: '', confirm: '' })
  const [msg, setMsg]     = useState(null)
  const [saving, setSaving] = useState(false)
  const nav = useNavigate()

  async function changePassword(e) {
    e.preventDefault()
    if (form.next !== form.confirm) { setMsg({ ok: false, text: 'Passwords do not match' }); return }
    if (form.next.length < 8)       { setMsg({ ok: false, text: 'Password must be at least 8 characters' }); return }
    setSaving(true)
    try {
      const res = await fetch(`${BASE}/user/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ current_password: form.current, new_password: form.next }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setMsg({ ok: true, text: 'Password changed successfully' })
      setForm({ current: '', next: '', confirm: '' })
    } catch (e) { setMsg({ ok: false, text: e.message }) }
    setSaving(false)
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-semibold text-gray-900 text-lg mb-6">Settings</h1>

      {/* Account info */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <div className="text-sm font-semibold text-gray-900 mb-4">Account info</div>
        <div className="space-y-0">
          {[
            { label: 'Email',      value: me?.email },
            { label: 'Plan',       value: me?.plan,    mono: false, pill: true },
            { label: 'Credits',    value: `$${parseFloat(me?.credits || 0).toFixed(2)}`, mono: true },
            { label: 'Member since', value: me?.created_at ? new Date(me.created_at).toLocaleDateString() : '—' },
          ].map((r, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-500">{r.label}</span>
              {r.pill
                ? <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 rounded-lg capitalize">{r.value}</span>
                : <span className={`text-xs font-medium text-gray-900 ${r.mono ? 'font-mono' : ''}`}>{r.value}</span>
              }
            </div>
          ))}
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <div className="text-sm font-semibold text-gray-900 mb-4">Change password</div>
        <form onSubmit={changePassword} className="space-y-3">
          {[
            { label: 'Current password', key: 'current', ph: '••••••••' },
            { label: 'New password',     key: 'next',    ph: 'Min 8 characters' },
            { label: 'Confirm new',      key: 'confirm', ph: '••••••••' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{f.label}</label>
              <input type="password" placeholder={f.ph} value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-300 transition-all" />
            </div>
          ))}

          {msg && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border text-xs
              ${msg.ok ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
              {msg.text}
            </div>
          )}

          <button type="submit" disabled={saving || !form.current || !form.next || !form.confirm}
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg
              hover:bg-gray-800 disabled:opacity-40 transition-all mt-1">
            {saving ? 'Saving...' : 'Update password'}
          </button>
        </form>
      </div>

      {/* Session */}
      <div className="bg-white border border-red-100 rounded-xl p-5">
        <div className="text-sm font-semibold text-red-500 mb-4">Session</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900">Sign out</div>
            <div className="text-xs text-gray-400 mt-0.5">Clears your local session</div>
          </div>
          <button onClick={() => { localStorage.clear(); nav('/') }}
            className="px-4 py-2 border border-red-200 text-red-600 text-xs rounded-lg
              hover:bg-red-50 transition-colors font-medium">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'usage',       label: 'Usage' },
  { id: 'billing',     label: 'Billing' },
  { id: 'docs',        label: 'Docs' },
  { id: 'settings',    label: 'Settings' },
]

export function Dashboard() {
  const [me, setMe]             = useState(null)
  const [marketplace, setMkt]   = useState([])
  const [stats, setStats]       = useState(null)
  const [usage, setUsage]       = useState([])
  const [tab, setTab]           = useState('marketplace')
  const [vaultKey, setVaultKey] = useState(null)
  const nav = useNavigate()

  useEffect(() => {
    Promise.all([api.me(), api.marketplace(), api.usageStats(), api.usage(), api.revealKey()])
      .then(([m, mkt, s, u, k]) => {
        setMe(m); setMkt(mkt); setStats(s); setUsage(u)
        if (k?.key) setVaultKey(k.key)
      })
      .catch(() => { localStorage.clear(); nav('/') })
  }, [])

  if (!me) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Spinner size={6} />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="border-b border-gray-100 bg-white sticky top-0 z-20">
        <div className="flex items-center px-4 h-14 gap-2 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-5 h-5 rounded bg-gray-900 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight">APIvault</span>
          </div>

          <div className="flex gap-0.5 ml-3 overflow-x-auto scrollbar-hide flex-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors flex-shrink-0 ${
                  tab === t.id ? 'bg-gray-900 text-white font-medium' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <div className="hidden sm:block text-right">
              <div className={`text-xs font-bold ${(me.credits || 0) < 1 ? 'text-red-500' : 'text-gray-900'}`}>
                ${parseFloat(me.credits).toFixed(2)}
              </div>
              <div className="text-xs text-gray-400">credits</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {tab === 'marketplace' && <Marketplace marketplace={marketplace} me={me} vaultKey={vaultKey} />}
        {tab === 'usage'       && <Usage stats={stats} usage={usage} />}
        {tab === 'billing'     && <Billing me={me} setMe={setMe} vaultKey={vaultKey} setVaultKey={setVaultKey} />}
        {tab === 'docs'        && <Docs marketplace={marketplace} vaultKey={vaultKey} />}
        {tab === 'settings'    && <Settings me={me} />}
      </div>
    </div>
  )
}