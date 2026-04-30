// client/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'

// ─── Constants ────────────────────────────────────────────────────────────

const CAT_COLOR = {
  ai:       { dot: 'bg-purple-400', badge: 'bg-purple-50 text-purple-700 border-purple-100' },
  payments: { dot: 'bg-green-400',  badge: 'bg-green-50  text-green-700  border-green-100'  },
  comms:    { dot: 'bg-blue-400',   badge: 'bg-blue-50   text-blue-700   border-blue-100'   },
  data:     { dot: 'bg-amber-400',  badge: 'bg-amber-50  text-amber-700  border-amber-100'  },
  dev:      { dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 border-orange-100' },
}

const PLAN_CATS = {
  dev:      ['ai', 'dev'],
  creator:  ['ai', 'comms'],
  business: ['payments', 'comms', 'data'],
}

// ─── Small components ─────────────────────────────────────────────────────

function Badge({ cat }) {
  const c = CAT_COLOR[cat] || CAT_COLOR.dev
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${c.badge}`}>
      {cat}
    </span>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
    </div>
  )
}

// ─── Mini bar chart ───────────────────────────────────────────────────────

function BarChart({ data, valueKey, labelKey, color = 'bg-indigo-500', formatValue }) {
  if (!data?.length) return <div className="text-xs text-gray-300 py-4 text-center">No data yet</div>
  const max = Math.max(...data.map(d => d[valueKey])) || 1
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-sm transition-all"
            style={{ height: `${Math.max((d[valueKey] / max) * 56, 2)}px` }}
            title={`${d[labelKey]}: ${formatValue ? formatValue(d[valueKey]) : d[valueKey]}`}>
            <div className={`w-full h-full rounded-sm ${color} opacity-80`} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Marketplace card ─────────────────────────────────────────────────────

function APICard({ api: a, onRequest, requesting, expanded, onExpand, onTry, trying, tryResult }) {
  const statusColor = {
    pending:  'text-amber-600 bg-amber-50 border-amber-100',
    approved: 'text-green-600 bg-green-50 border-green-100',
  }
  const isExpanded = expanded === a.slug
  const result = tryResult?.[a.slug]

  const testPaths = {
    openweather: '/weather?q=Nairobi',
    newsapi:     '/top-headlines?country=us&pageSize=2',
    github:      '/users/octocat',
  }

  return (
    <div className={`bg-white border rounded-xl transition-all
      ${isExpanded ? 'border-gray-900 shadow-sm' : a.has_access ? 'border-gray-100' : 'border-gray-100 opacity-80'}`}>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 mr-2">
            <div className="font-medium text-sm text-gray-900">{a.name}</div>
            {a.description && (
              <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{a.description}</div>
            )}
            <div className="font-mono text-xs text-gray-300 mt-1">/proxy/{a.slug}</div>
          </div>
          <Badge cat={a.category} />
        </div>

        <div className="flex items-center justify-between mt-3">
          <div>
            <div className="text-xs text-gray-400">Your price</div>
            <div className="font-mono text-sm font-medium text-gray-900">
              {a.user_price > 0 ? `$${a.user_price.toFixed(4)}` : 'Free'}
              <span className="text-xs text-gray-400 font-normal ml-1">/ {a.billing_unit || 'request'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {a.has_access ? (
              <button onClick={() => onExpand(a.slug)}
                className={`px-2.5 py-1 border text-xs rounded-lg font-medium transition-all
                  ${isExpanded ? 'border-gray-900 bg-gray-900 text-white' : 'bg-green-50 text-green-700 border-green-100 hover:border-gray-900 hover:bg-gray-900 hover:text-white'}`}>
                {isExpanded ? 'Close' : 'Use API'}
              </button>
            ) : a.request_status ? (
              <span className={`px-2.5 py-1 border text-xs rounded-lg font-medium ${statusColor[a.request_status] || 'text-gray-500 bg-gray-50 border-gray-100'}`}>
                {a.request_status === 'pending' ? 'Requested' : 'Approved'}
              </span>
            ) : (
              <button onClick={() => onRequest(a.slug)} disabled={requesting === a.slug}
                className="px-2.5 py-1 border border-gray-200 text-xs rounded-lg text-gray-600
                  hover:border-gray-900 hover:text-gray-900 transition-all disabled:opacity-50">
                {requesting === a.slug ? 'Requesting...' : 'Request access'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded — code snippet + try it */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4">
          <div className="text-xs font-medium text-gray-500 mb-2">Quick start</div>

          {/* Code snippet */}
          <div className="bg-gray-950 rounded-xl p-3.5 mb-3 overflow-x-auto">
            <div className="font-mono text-xs leading-relaxed">
              <div className="text-gray-500 mb-2">// JavaScript / Node.js</div>
              <div className="text-gray-100">
                <span className="text-blue-400">const</span> res = <span className="text-blue-400">await</span>{' '}
                <span className="text-yellow-300">fetch</span>(<span className="text-green-300">{`\`\${API_BASE}/proxy/${a.slug}${testPaths[a.slug] || ''}\``}</span>, {'{'}
              </div>
              <div className="text-gray-100 ml-4">
                headers: {'{ '}<span className="text-green-300">'x-vault-key'</span>:{' '}
                <span className="text-amber-300">'YOUR_VAULT_KEY'</span> {' }'}
              </div>
              <div className="text-gray-100">{'})'};</div>
              <div className="text-gray-100 mt-1">
                <span className="text-blue-400">const</span> data = <span className="text-blue-400">await</span> res.<span className="text-yellow-300">json</span>();
              </div>
            </div>
          </div>

          {/* Try it button */}
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => onTry(a)} disabled={trying === a.slug}
              className="px-3.5 py-2 bg-indigo-600 text-white text-xs rounded-lg
                hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium">
              {trying === a.slug ? 'Running...' : '▶ Try it live'}
            </button>
            <span className="text-xs text-gray-400">Makes a real call using your credits</span>
          </div>

          {/* Result */}
          {result && !result.loading && (
            <div className={`rounded-xl p-3 border text-xs font-mono overflow-x-auto
              ${result.ok ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <div className={`mb-1 font-medium ${result.ok ? 'text-green-700' : 'text-red-600'}`}>
                {result.ok ? `✓ ${result.status} OK` : `✗ ${result.status || 'Error'}`}
              </div>
              <pre className="text-gray-600 whitespace-pre-wrap text-xs overflow-x-auto max-h-48">
                {JSON.stringify(result.data || result.error, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────

export function Dashboard() {
  const [me, setMe]             = useState(null)
  const [marketplace, setMkt]   = useState([])
  const [stats, setStats]       = useState(null)
  const [usage, setUsage]       = useState([])
  const [tab, setTab]           = useState('marketplace')
  const [key, setKey]           = useState(null)
  const [notice, setNotice]     = useState(null)
  const [requesting, setReq]    = useState(null)
  const [catFilter, setCatFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [tryResult, setTryResult] = useState({})
  const [trying, setTrying]     = useState(null)
  const nav = useNavigate()

  useEffect(() => {
    Promise.all([api.me(), api.marketplace(), api.usageStats(), api.usage()])
      .then(([m, mkt, s, u]) => { setMe(m); setMkt(mkt); setStats(s); setUsage(u) })
      .catch(() => { localStorage.clear(); nav('/') })

    // Paystack callback
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('reference')
    if (ref) {
      api.verifyPayment(ref)
        .then(r => {
          setNotice({ ok: r.ok, msg: r.ok ? `$${r.amount} credits added.` : 'Payment could not be verified.' })
          window.history.replaceState({}, '', '/app')
          api.me().then(m => setMe(m))
        })
        .catch(() => setNotice({ ok: false, msg: 'Verification failed.' }))
    }
  }, [])

  async function tryAPI(a) {
    if (!a.has_access) return
    setTrying(a.slug)
    setTryResult(r => ({ ...r, [a.slug]: { loading: true } }))
    try {
      const BASE_URL = import.meta.env.VITE_API_URL || ''
      const { key: vaultKey } = await api.revealKey()
      const uuid = vaultKey.replace('sk-vault-', '')

      // Build a sensible test URL for each API
      const testPaths = {
        openweather: '/weather?q=Nairobi',
        newsapi:     '/top-headlines?country=us&pageSize=2',
        github:      '/users/octocat',
        default:     '/',
      }
      const path = testPaths[a.slug] || testPaths.default
      const res = await fetch(`${BASE_URL}/proxy/${a.slug}${path}`, {
        headers: { 'x-vault-key': uuid }
      })
      const data = await res.json()
      setTryResult(r => ({ ...r, [a.slug]: { ok: res.ok, status: res.status, data } }))
    } catch (e) {
      setTryResult(r => ({ ...r, [a.slug]: { ok: false, error: e.message } }))
    }
    setTrying(null)
  }

  async function requestAPI(slug) {
    setReq(slug)
    try {
      await api.requestAPI(slug)
      const updated = await api.marketplace()
      setMkt(updated)
      setNotice({ ok: true, msg: 'Access requested. Admin will review shortly.' })
    } catch (e) {
      setNotice({ ok: false, msg: e.message })
    }
    setReq(null)
  }

  function signOut() { localStorage.clear(); nav('/') }

  if (!me) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
    </div>
  )

  const myAPIs      = marketplace.filter(a => a.has_access)
  const cats        = ['all', ...new Set(marketplace.map(a => a.category))]
  const filtered    = catFilter === 'all' ? marketplace : marketplace.filter(a => a.category === catFilter)

  return (
    <div className="min-h-screen bg-[#fafafa]">

      {/* Top nav */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center px-4 h-14 gap-2">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-5 h-5 rounded bg-gray-900 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight">APIvault</span>
          </div>

          <div className="flex gap-1 ml-2 overflow-x-auto scrollbar-hide">
            {[
              { id: 'marketplace', label: 'Marketplace' },
              { id: 'usage',       label: 'Usage' },
              { id: 'credits',     label: 'Credits' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors flex-shrink-0 ${
                  tab === t.id
                    ? 'bg-gray-900 text-white font-medium'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="text-right">
              <div className="text-xs font-medium text-gray-900">${parseFloat(me.credits).toFixed(2)}</div>
              <div className="text-xs text-gray-400">credits</div>
            </div>
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-md capitalize hidden sm:block">{me.plan}</span>
            <button onClick={signOut} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* Notice */}
        {notice && (
          <div className={`mb-6 flex items-center gap-3 p-3.5 rounded-xl border text-sm
            ${notice.ok ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
            <span className="flex-1">{notice.msg}</span>
            <button onClick={() => setNotice(null)} className="opacity-50 hover:opacity-100 text-lg leading-none">×</button>
          </div>
        )}

        {/* ── Marketplace ───────────────────────────────────────────────── */}
        {tab === 'marketplace' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-5 gap-2">
              <div>
                <h1 className="font-semibold text-gray-900 text-lg">API Marketplace</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {myAPIs.length} active · {marketplace.length} total available
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Plan:</span>
                <span className="text-xs font-medium px-2.5 py-1 bg-gray-900 text-white rounded-lg capitalize">
                  {me.plan}
                </span>
              </div>
            </div>

            {/* Plan info banner */}
            <div className="mb-4 p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-blue-900 capitalize">{me.plan} plan</div>
                  <div className="text-xs text-blue-600 mt-0.5">
                    Includes: {PLAN_CATS[me.plan]?.join(', ')} APIs.
                    {me.plan !== 'business' && ' Request access to unlock other categories.'}
                  </div>
                </div>
                <div className="text-xs text-blue-500">
                  {myAPIs.length} / {marketplace.length} APIs active
                </div>
              </div>
            </div>

            {/* Category filter */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {cats.map(c => (
                <button key={c} onClick={() => setCatFilter(c)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all capitalize ${
                    catFilter === c
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  }`}>
                  {c === 'all' ? `All (${marketplace.length})` : `${c} (${marketplace.filter(a => a.category === c).length})`}
                </button>
              ))}
            </div>

            {/* API grid */}
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-300">No APIs in this category yet</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map(a => (
                  <APICard key={a.slug} api={a}
                    onRequest={requestAPI} requesting={requesting}
                    expanded={expanded} onExpand={s => setExpanded(expanded === s ? null : s)}
                    onTry={tryAPI} trying={trying} tryResult={tryResult}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Usage ─────────────────────────────────────────────────────── */}
        {tab === 'usage' && (
          <div>
            <h1 className="font-semibold text-gray-900 text-lg mb-6">Usage</h1>

            {!stats ? <Spinner /> : (
              <>
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: '7-day calls',  value: stats.total_calls?.toLocaleString() },
                    { label: '7-day spend',  value: `$${parseFloat(stats.total_spent || 0).toFixed(4)}` },
                    { label: 'Active APIs',  value: myAPIs.length },
                  ].map(s => (
                    <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4">
                      <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                      <div className="text-xl font-semibold text-gray-900">{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Daily calls chart */}
                {stats.daily?.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4">
                    <div className="text-xs font-medium text-gray-500 mb-4">Daily calls — last 7 days</div>
                    <BarChart data={stats.daily} valueKey="calls" labelKey="date" color="bg-indigo-500" />
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-gray-300">{stats.daily[0]?.date}</span>
                      <span className="text-xs text-gray-300">{stats.daily[stats.daily.length - 1]?.date}</span>
                    </div>
                  </div>
                )}

                {/* Top APIs */}
                {stats.top_apis?.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4">
                    <div className="text-xs font-medium text-gray-500 mb-3">Top APIs</div>
                    {stats.top_apis.map(a => (
                      <div key={a.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <span className="text-sm text-gray-700">{a.name}</span>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>{a.calls} calls</span>
                          <span className="font-mono">${a.spent.toFixed(4)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent calls table */}
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <span className="text-xs font-medium text-gray-500">Recent calls</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-50 bg-gray-50">
                        {['Time', 'API', 'Status', 'Charged'].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-2">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {usage.slice(0, 20).map((u, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-400">
                            {new Date(u.ts).toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">
                            {u.api_registry?.name}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border
                              ${u.http_status < 300 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                              {u.http_status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs">
                            ${parseFloat(u.charged || 0).toFixed(4)}
                          </td>
                        </tr>
                      ))}
                      {!usage.length && (
                        <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-300 text-sm">No calls yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Credits ───────────────────────────────────────────────────── */}
        {tab === 'credits' && (
          <div className="max-w-sm w-full">
            <h1 className="font-semibold text-gray-900 text-lg mb-6">Credits</h1>

            <div className="bg-white border border-gray-100 rounded-xl p-5 mb-3">
              <div className="text-xs text-gray-400 mb-1">Current balance</div>
              <div className="text-3xl font-semibold tracking-tight">${parseFloat(me.credits).toFixed(2)}</div>
              <div className="h-1.5 bg-gray-100 rounded-full mt-3">
                <div className="h-1.5 bg-green-500 rounded-full transition-all"
                  style={{ width: `${Math.min(me.credits / 50 * 100, 100)}%` }} />
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-5 mb-3">
              <div className="text-xs text-gray-400 mb-1">Buy credits via Paystack</div>
              <div className="text-xs text-gray-300 mb-3">Payments processed in KES</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[5, 10, 25, 50].map(amt => (
                  <button key={amt}
                    onClick={async () => {
                      try {
                        const { url } = await api.buyCredits(amt)
                        window.location.href = url
                      } catch (e) { setNotice({ ok: false, msg: e.message }) }
                    }}
                    className="py-2.5 border border-gray-200 rounded-lg text-sm font-medium
                      hover:border-gray-900 hover:text-gray-900 transition-all text-gray-600">
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="text-xs text-gray-400 mb-3">Your vault key</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2.5 font-mono text-xs text-gray-600 truncate">
                  {key || 'sk-vault-••••••••••••••••••••••••••••••••••••'}
                </div>
                <button
                  onClick={async () => {
                    const { key: k } = await api.revealKey()
                    setKey(k)
                    if (navigator.clipboard) navigator.clipboard.writeText(k)
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 transition-colors whitespace-nowrap">
                  {key ? 'Copied' : 'Reveal'}
                </button>
              </div>
              <p className="text-xs text-gray-300 mt-2">
                Use in the <code className="bg-gray-100 px-1 rounded">x-vault-key</code> header for all API calls
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}