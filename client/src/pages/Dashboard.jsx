// client/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { Onboarding } from './Onboarding.jsx'

const BASE = import.meta.env.VITE_API_URL || ''

// ─── API docs config ──────────────────────────────────────────────────────
const API_DOCS = {
  openweather:  { tryPath: '/weather?q=Nairobi&units=metric',           endpoints: [{ method:'GET', path:'/weather',   desc:'Current weather',          params:[{name:'q',desc:'City name',example:'Nairobi'},{name:'units',desc:'metric|imperial',example:'metric'}] },{ method:'GET', path:'/forecast', desc:'5-day forecast',           params:[{name:'q',desc:'City name',example:'Nairobi'}] }] },
  newsapi:      { tryPath: '/top-headlines?country=us&pageSize=3',       endpoints: [{ method:'GET', path:'/top-headlines', desc:'Top news headlines',    params:[{name:'country',desc:'2-letter code',example:'us'},{name:'pageSize',desc:'Results count',example:'5'}] },{ method:'GET', path:'/everything',    desc:'Search all articles',    params:[{name:'q',desc:'Keywords',example:'Kenya economy'}] }] },
  github:       { tryPath: '/users/octocat',                             endpoints: [{ method:'GET', path:'/users/:username', desc:'User profile',        params:[{name:':username',desc:'GitHub username',example:'torvalds'}] },{ method:'GET', path:'/repos/:owner/:repo', desc:'Repository info',      params:[{name:':owner',desc:'Owner',example:'facebook'},{name:':repo',desc:'Repo',example:'react'}] }] },
  restcountries:{ tryPath: '/name/kenya',                                endpoints: [{ method:'GET', path:'/name/:country',  desc:'Country by name',     params:[{name:':country',desc:'Country name',example:'kenya'}] },{ method:'GET', path:'/region/:region', desc:'Countries by region', params:[{name:':region',desc:'Region name',example:'africa'}] }] },
  ipgeo:        { tryPath: '/json/8.8.8.8',                              endpoints: [{ method:'GET', path:'/json/:ip',       desc:'IP location lookup',   params:[{name:':ip',desc:'IPv4 address',example:'8.8.8.8'}] }] },
  exchangerates:{ tryPath: '/latest/USD',                                endpoints: [{ method:'GET', path:'/latest/:base',   desc:'Live exchange rates',  params:[{name:':base',desc:'Base currency',example:'USD'}] }] },
  jokeapi:      { tryPath: '/joke/Programming?type=single',              endpoints: [{ method:'GET', path:'/joke/:category', desc:'Get a joke',           params:[{name:':category',desc:'Category',example:'Programming'}] }] },
  dictionary:   { tryPath: '/entries/en/hello',                          endpoints: [{ method:'GET', path:'/entries/en/:word', desc:'Word definition',    params:[{name:':word',desc:'English word',example:'developer'}] }] },
}

// ─── Primitives ───────────────────────────────────────────────────────────
function Spin({ s = 5 }) {
  return <div className={`w-${s} h-${s} border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin`} />
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

function Tag({ children, color = 'gray' }) {
  const cls = {
    gray:    'bg-gray-100 text-gray-500',
    green:   'bg-green-50 text-green-700',
    amber:   'bg-amber-50 text-amber-700',
    blue:    'bg-blue-50 text-blue-700',
    purple:  'bg-purple-50 text-purple-700',
    orange:  'bg-orange-50 text-orange-700',
    teal:    'bg-teal-50 text-teal-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    rose:    'bg-rose-50 text-rose-700',
    pink:    'bg-pink-50 text-pink-700',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${cls[color] || cls.gray}`}>{children}</span>
}

const CAT_COLOR = { ai:'purple', data:'amber', dev:'orange', payments:'green', comms:'blue', geo:'teal', finance:'emerald', health:'rose', media:'pink' }

function buildCode(slug, path, method = 'GET', lang = 'js', vaultKey = null) {
  const API_BASE = 'https://apivault-production-736c.up.railway.app'
  const key = vaultKey || 'YOUR_VAULT_KEY'
  if (lang === 'js') return `const res = await fetch('${API_BASE}/proxy/${slug}${path}', {
  headers: { 'x-vault-key': '${key}' }
})
const data = await res.json()
console.log(data)`

  if (lang === 'python') return `import requests
res = requests.get('${API_BASE}/proxy/${slug}${path}',
  headers={'x-vault-key': '${key}'})
print(res.json())`

  return `curl '${API_BASE}/proxy/${slug}${path}' \\
  -H 'x-vault-key: ${key}'`
}

// ─── API Card ─────────────────────────────────────────────────────────────
function APICard({ a, expanded, onExpand, vaultKey, onAddCredits }) {
  const [lang, setLang]     = useState('js')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const isOpen = expanded === a.slug
  const doc = API_DOCS[a.slug]

  async function run() {
    if (!doc?.tryPath) return
    setRunning(true); setResult(null)
    try {
      const uuid = vaultKey?.replace('sk-vault-', '')
      const res  = await fetch(`${BASE}/proxy/${a.slug}${doc.tryPath}`, {
        headers: { 'x-vault-key': uuid }
      })
      const data = await res.json()
      setResult({ ok: res.ok, status: res.status, data })
    } catch (e) { setResult({ ok: false, error: e.message }) }
    setRunning(false)
  }

  function StateButton() {
    if (a.state === 'active') {
      return (
        <button onClick={() => onExpand(a.slug)}
          className={`px-3 py-1.5 text-xs rounded-lg font-semibold border transition-all
            ${isOpen ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-700 hover:border-gray-900'}`}>
          {isOpen ? '✕ Close' : '⚡ Use API'}
        </button>
      )
    }
    if (a.state === 'needs_credits') {
      return (
        <button onClick={onAddCredits}
          className="px-3 py-1.5 text-xs rounded-lg font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors">
          Add credits →
        </button>
      )
    }
    if (!a.ready) {
      return <span className="text-xs text-gray-300 font-medium italic">Key not configured</span>
    }
    return <span className="text-xs text-gray-300 font-medium">Coming soon</span>
  }

  return (
    <div className={`bg-white border rounded-xl transition-all duration-200 ${isOpen ? 'border-gray-900 shadow-md' : 'border-gray-100 hover:border-gray-200'}`}>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-sm text-gray-900">{a.name}</span>
              {a.state === 'active' && a.user_price === 0 && <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded">FREE</span>}
            </div>
            {a.description && <p className="text-xs text-gray-400 leading-relaxed">{a.description}</p>}
            <div className="font-mono text-[10px] text-gray-300 mt-1">/proxy/{a.slug}</div>
          </div>
          <Tag color={CAT_COLOR[a.category] || 'gray'}>{a.category}</Tag>
        </div>

        <div className="pt-3 border-t border-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-sm font-bold text-gray-900">
                {a.user_price > 0 ? `$${a.user_price.toFixed(4)}` : 'Free'}
              </span>
              <span className="text-xs text-gray-400 ml-1">/ call</span>
            </div>
            <StateButton />
          </div>

          {a.state === 'needs_credits' && (
            <div className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
              <span>⚠</span>
              <span>You have ${parseFloat(a.credits_available||0).toFixed(2)} credits · This API costs ${a.user_price.toFixed(4)}/call · <button onClick={onAddCredits} className="underline font-semibold">Add credits</button></span>
            </div>
          )}
          {a.state === 'coming_soon' && !a.ready && (
            <div className="mt-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-2.5 py-1.5">
              API is live but master key not yet configured by admin
            </div>
          )}
          {a.state === 'coming_soon' && a.ready && (
            <div className="mt-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-2.5 py-1.5">
              This API is being set up — check back soon
            </div>
          )}
        </div>
      </div>

      {isOpen && doc && (
        <div className="border-t border-gray-100">
          <div className="p-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-1 p-1 bg-gray-800 rounded-lg">
                {[['js','JS'],['python','Python'],['curl','cURL']].map(([id,lbl]) => (
                  <button key={id} onClick={() => setLang(id)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${lang===id?'bg-gray-600 text-white':'text-gray-400 hover:text-gray-200'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {vaultKey && <span className="text-[10px] text-green-400 font-medium">✓ Key loaded</span>}
                <CopyBtn text={buildCode(a.slug, doc.tryPath || '/', 'GET', lang, vaultKey)} />
              </div>
            </div>
            <div className="bg-gray-950 rounded-xl p-4 overflow-x-auto">
              <pre className="text-xs text-gray-300 font-mono leading-relaxed whitespace-pre">{buildCode(a.slug, doc.tryPath || '/', 'GET', lang, vaultKey)}</pre>
            </div>
          </div>

          {doc.tryPath && (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-3 mb-3">
                <button onClick={run} disabled={running || !vaultKey}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-40 font-semibold flex items-center gap-2 transition-colors">
                  {running ? <><Spin s={3} /><span>Running...</span></> : '▶ Run live'}
                </button>
                <span className="text-xs text-gray-400">{vaultKey ? 'Real API call · uses credits' : 'Reveal key in Billing to run'}</span>
              </div>
              {result && (
                <div className={`rounded-xl p-3.5 border ${result.ok ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  <div className={`text-xs font-semibold mb-2 ${result.ok ? 'text-green-700' : 'text-red-600'}`}>
                    {result.ok ? `✓ ${result.status} OK` : `✗ ${result.status || 'Error'}`}
                  </div>
                  <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap overflow-x-auto max-h-48">{JSON.stringify(result.data || result.error, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Marketplace ──────────────────────────────────────────────────────────
function Marketplace({ apis, me, vaultKey, onAddCredits }) {
  const [filter, setFilter]   = useState('all')
  const [search, setSearch]   = useState('')
  const [expanded, setExpanded] = useState(null)
  const [requesting, setRequesting] = useState(false)
  const [requestSent, setRequestSent] = useState(false)

  const cats    = ['all', ...new Set(apis.map(a => a.category).sort())]
  const active  = apis.filter(a => a.state === 'active')
  const hasLow  = parseFloat(me?.credits || 0) < 1

  // Filter by category then search
  const filtered = apis
    .filter(a => filter === 'all' || a.category === filter)
    .filter(a => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return a.name.toLowerCase().includes(q) ||
             a.slug.toLowerCase().includes(q) ||
             a.category.toLowerCase().includes(q) ||
             a.description?.toLowerCase().includes(q)
    })

  // No results + search active = show discovery prompt
  const showDiscovery = search.trim().length > 1 && filtered.length === 0

  async function requestAPI() {
    setRequesting(true)
    try {
      await api.requestAPI(search.trim())
      setRequestSent(true)
    } catch(e) {}
    setRequesting(false)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">API Marketplace</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {active.length} APIs ready to use · {apis.filter(a=>a.state==='coming_soon').length} coming soon
          </p>
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold ${hasLow ? 'text-red-500' : 'text-gray-900'}`}>
            ${parseFloat(me?.credits || 0).toFixed(2)}
          </div>
          <div className="text-xs text-gray-400">credits</div>
        </div>
      </div>

      {hasLow && apis.some(a => a.state === 'needs_credits') && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-amber-800">Free APIs are active · Some APIs need credits</div>
            <div className="text-xs text-amber-600 mt-0.5">Add $1 or more to unlock paid APIs</div>
          </div>
          <button onClick={onAddCredits}
            className="flex-shrink-0 px-4 py-2 bg-amber-500 text-white text-xs rounded-lg font-bold hover:bg-amber-600 transition-colors">
            Add credits →
          </button>
        </div>
      )}

      {/* Search bar */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setRequestSent(false) }}
          placeholder="Search APIs — or type any API name to request it..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl
            focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-300 bg-white"
        />
        {search && (
          <button onClick={() => { setSearch(''); setRequestSent(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-lg leading-none">
            ×
          </button>
        )}
      </div>

      {/* Category filters */}
      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1">
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all capitalize flex-shrink-0 ${
              filter === c ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}>
            {c === 'all' ? `All (${apis.length})` : `${c} (${apis.filter(a=>a.category===c).length})`}
          </button>
        ))}
      </div>

      {/* Discovery prompt — shown when search yields no results */}
      {showDiscovery && (
        <div className="mb-6 p-5 border-2 border-dashed border-gray-200 rounded-xl text-center">
          <div className="text-2xl mb-2">🔌</div>
          <div className="font-semibold text-gray-900 mb-1">
            "{search}" not in the vault yet
          </div>
          <div className="text-sm text-gray-400 mb-4">
            Request it and we'll add it. You'll be notified when it's live.
          </div>
          {requestSent ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100 text-green-700 text-sm rounded-lg font-medium">
              ✓ Request sent — we'll notify you when it's live
            </div>
          ) : (
            <button onClick={requestAPI} disabled={requesting}
              className="px-5 py-2 bg-gray-900 text-white text-sm rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-40 transition-colors">
              {requesting ? 'Sending...' : `Request "${search}"`}
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {!showDiscovery && filtered.length === 0 && search && (
        <div className="text-center py-10 text-gray-300 text-sm">No APIs match "{search}"</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(a => (
          <APICard key={a.slug} a={a}
            expanded={expanded} onExpand={s => setExpanded(expanded === s ? null : s)}
            vaultKey={vaultKey} onAddCredits={onAddCredits} />
        ))}
      </div>
    </div>
  )
}

// ─── Usage ────────────────────────────────────────────────────────────────
function Usage({ stats, usage }) {
  if (!stats) return <div className="flex justify-center py-16"><Spin s={6} /></div>
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Usage</h1>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: '7-day calls',  value: stats.total_calls?.toLocaleString() || '0' },
          { label: '7-day spend',  value: `$${parseFloat(stats.total_spent||0).toFixed(4)}` },
          { label: 'APIs used',    value: stats.top_apis?.length || 0 },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">{s.label}</div>
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden overflow-x-auto">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500">Recent calls</span>
          <span className="text-xs text-gray-400">{usage.length} records</span>
        </div>
        <table className="w-full text-sm min-w-[380px]">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50">
              {['Time','API','Status','Cost'].map(h => (
                <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-2.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usage.slice(0,20).map((u,i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{new Date(u.ts).toLocaleTimeString()}</td>
                <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{u.api_registry?.name}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${u.http_status<300?'bg-green-50 text-green-700 border-green-100':'bg-red-50 text-red-600 border-red-100'}`}>
                    {u.http_status}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">${parseFloat(u.charged||0).toFixed(4)}</td>
              </tr>
            ))}
            {!usage.length && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-300 text-sm">No API calls yet — go to Marketplace to get started</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Billing ──────────────────────────────────────────────────────────────
function CustomAmount({ onBuy }) {
  const [val, setVal]     = useState('')
  const [loading, setL]   = useState(false)
  const [err, setErr]     = useState('')
  const num   = parseFloat(val)
  const valid = !isNaN(num) && num >= 1 && num <= 500

  async function buy() {
    if (!valid) return
    setL(true); setErr('')
    try { await onBuy(Math.round(num)) }
    catch (e) { setErr(e.message) }
    setL(false)
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
          <input type="number" min="1" max="500" placeholder="Any amount"
            value={val} onChange={e => { setVal(e.target.value); setErr('') }}
            onKeyDown={e => e.key === 'Enter' && buy()}
            className="w-full pl-7 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-300" />
        </div>
        <button onClick={buy} disabled={!valid || loading}
          className="px-4 py-2.5 bg-gray-900 text-white text-sm rounded-lg font-semibold
            hover:bg-gray-800 disabled:opacity-40 transition-all whitespace-nowrap">
          {loading ? '...' : 'Pay now'}
        </button>
      </div>
      {err && <div className="text-xs text-red-500 mt-1.5">{err}</div>}
      {val && !valid && num < 1 && <div className="text-xs text-gray-400 mt-1">Minimum is $1</div>}
      <div className="text-xs text-gray-300 mt-1.5">Min $1 · Max $500 · Charged in KES via Paystack</div>
    </div>
  )
}

function Billing({ me, setMe, vaultKey, setVaultKey }) {
  const [notice, setNotice]   = useState(null)
  const [revealed, setRevealed] = useState(false)
  const credits = parseFloat(me?.credits || 0)

  async function buy(amt) {
    try { const { url } = await api.buyCredits(amt); window.location.href = url }
    catch (e) { setNotice({ ok: false, msg: e.message }) }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Billing & Credits</h1>

      {notice && (
        <div className={`mb-4 flex items-center gap-3 p-3.5 rounded-xl border text-sm ${notice.ok?'bg-green-50 border-green-100 text-green-700':'bg-red-50 border-red-100 text-red-600'}`}>
          <span className="flex-1">{notice.msg}</span>
          <button onClick={() => setNotice(null)} className="opacity-40 hover:opacity-100 text-lg">×</button>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-gray-400 mb-1">Available credits</div>
            <div className={`text-4xl font-bold tracking-tight ${credits < 1 ? 'text-red-500' : 'text-gray-900'}`}>
              ${credits.toFixed(2)}
            </div>
          </div>
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${credits < 1 ? 'bg-red-50' : 'bg-green-50'}`}>
            {credits < 1 ? '⚠️' : '💳'}
          </div>
        </div>
        {credits < 1 && (
          <div className="text-xs text-red-500 font-medium">Free APIs still work · Add credits to use NewsAPI and upcoming paid APIs</div>
        )}
        {credits > 0 && (
          <div className="text-xs text-gray-400">
            With $1 you get ~1000 NewsAPI calls · Credits never expire
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <div className="text-sm font-bold text-gray-900 mb-1">Add credits</div>
        <div className="text-xs text-gray-400 mb-4">Secure payment via Paystack · M-Pesa and card accepted</div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[1, 5, 10, 25, 50, 100].map(amt => (
            <button key={amt} onClick={() => buy(amt)}
              className="py-3 border border-gray-200 rounded-xl text-center transition-all hover:border-gray-900 hover:bg-gray-900 hover:text-white group">
              <div className="text-[10px] text-gray-400 group-hover:text-gray-300">Add</div>
              <div className="text-base font-bold text-gray-900 group-hover:text-white">${amt}</div>
            </button>
          ))}
        </div>
        <CustomAmount onBuy={buy} />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <div className="text-sm font-bold text-gray-900 mb-3">What your credits unlock</div>
        <div className="space-y-2">
          {[
            { amt: '$1',  gets: '~1,000 NewsAPI calls' },
            { amt: '$5',  gets: '~5,000 NewsAPI calls or 625 GPT-4o calls (coming soon)' },
            { amt: '$10', gets: '~10,000 NewsAPI calls or 20 HeyGen videos (coming soon)' },
          ].map(r => (
            <div key={r.amt} className="flex items-center gap-3 text-xs">
              <span className="font-mono font-bold text-gray-900 w-8">{r.amt}</span>
              <span className="text-gray-500">{r.gets}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="text-sm font-bold text-gray-900 mb-1">Your vault key</div>
        <div className="text-xs text-gray-400 mb-3">
          Add to every API request as the <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-700">x-vault-key</code> header
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 font-mono text-xs text-gray-700 truncate">
            {vaultKey || 'sk-vault-••••••••••••••••••••••••'}
          </div>
          <button onClick={async () => {
            const { key: k } = await api.revealKey()
            setVaultKey(k); setRevealed(true)
            navigator.clipboard?.writeText(k)
          }} className="px-3 py-2.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-800 transition-colors font-semibold whitespace-nowrap">
            {revealed ? '✓ Copied' : 'Reveal & copy'}
          </button>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
          🔒 Keep this key private. Anyone with it can make API calls charged to your account.
        </div>
      </div>
    </div>
  )
}

// ─── Docs ─────────────────────────────────────────────────────────────────
function Docs({ apis, vaultKey }) {
  const [sel, setSel]   = useState(null)
  const [lang, setLang] = useState('js')
  const live = apis.filter(a => a.state === 'active')

  useEffect(() => { if (live.length && !sel) setSel(live[0]?.slug) }, [live])

  const a   = live.find(x => x.slug === sel)
  const doc = a ? API_DOCS[a.slug] : null

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Documentation</h1>
      <p className="text-xs text-gray-400 mb-6 font-mono">
        Base URL: https://apivault-production-736c.up.railway.app
      </p>

      <div className="flex gap-5">
        <div className="w-40 flex-shrink-0">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Live APIs</div>
          <div className="space-y-1">
            {live.map(x => (
              <button key={x.slug} onClick={() => setSel(x.slug)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${sel===x.slug?'bg-gray-900 text-white font-semibold':'text-gray-600 hover:bg-gray-100'}`}>
                {x.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {a && doc ? (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-bold text-gray-900 text-xl">{a.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">{a.description}</p>
                </div>
                <Tag color={CAT_COLOR[a.category] || 'gray'}>{a.category}</Tag>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-5">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Authentication</div>
                <div className="text-sm text-gray-600 mb-2">Add your vault key to every request:</div>
                <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm text-green-400">
                  x-vault-key: {vaultKey || 'YOUR_VAULT_KEY'}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5 flex items-center gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Price per call</div>
                  <div className="text-2xl font-bold text-gray-900 font-mono">
                    {a.user_price > 0 ? `$${a.user_price.toFixed(4)}` : 'Free'}
                  </div>
                </div>
                {a.user_price === 0 && (
                  <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg font-medium">
                    No credits needed — just your vault key
                  </div>
                )}
              </div>

              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-4">
                {[['js','JavaScript'],['python','Python'],['curl','cURL']].map(([id,lbl]) => (
                  <button key={id} onClick={() => setLang(id)}
                    className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${lang===id?'bg-white shadow-sm text-gray-900':'text-gray-500 hover:text-gray-700'}`}>
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {doc.endpoints.map((ep, i) => (
                  <div key={i} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-3 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono ${ep.method==='GET'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>{ep.method}</span>
                      <code className="font-mono text-sm text-gray-800">/proxy/{a.slug}{ep.path}</code>
                      <span className="text-xs text-gray-400">{ep.desc}</span>
                    </div>
                    {ep.params?.length > 0 && (
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
                        <div className="text-xs font-semibold text-gray-400">Example</div>
                        <CopyBtn text={buildCode(a.slug, ep.params?.find(p=>!p.name.startsWith(':'))
                          ? ep.path.replace(/:(\w+)/g,(_,k)=>ep.params.find(p=>p.name===`:${k}`)?.example||k) + (ep.method==='GET'&&ep.params.filter(p=>!p.name.startsWith(':')).length ? '?'+ep.params.filter(p=>!p.name.startsWith(':')).map(p=>`${p.name}=${p.example}`).join('&') : '')
                          : ep.path.replace(/:(\w+)/g,(_,k)=>ep.params?.find(p=>p.name===`:${k}`)?.example||k), ep.method, lang, vaultKey)} />
                      </div>
                      <div className="bg-gray-950 rounded-xl p-4 overflow-x-auto">
                        <pre className="text-xs text-gray-300 font-mono leading-relaxed whitespace-pre">
                          {buildCode(a.slug,
                            ep.path.replace(/:(\w+)/g,(_,k)=>ep.params?.find(p=>p.name===`:${k}`)?.example||k) +
                            (ep.method==='GET'&&ep.params?.filter(p=>!p.name.startsWith(':')).length
                              ? '?'+ep.params.filter(p=>!p.name.startsWith(':')).map(p=>`${p.name}=${p.example}`).join('&')
                              : ''),
                            ep.method, lang, vaultKey)}
                        </pre>
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
  const [form, setForm]     = useState({ current:'', next:'', confirm:'' })
  const [msg, setMsg]       = useState(null)
  const [saving, setSaving] = useState(false)
  const nav = useNavigate()

  async function changePassword(e) {
    e.preventDefault()
    if (form.next !== form.confirm) { setMsg({ ok:false, text:'Passwords do not match' }); return }
    if (form.next.length < 8)       { setMsg({ ok:false, text:'Minimum 8 characters' }); return }
    setSaving(true)
    try {
      const res = await fetch(`${BASE}/user/change-password`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ current_password: form.current, new_password: form.next }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setMsg({ ok:true, text:'Password updated successfully' })
      setForm({ current:'', next:'', confirm:'' })
    } catch (e) { setMsg({ ok:false, text:e.message }) }
    setSaving(false)
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <div className="text-sm font-bold text-gray-900 mb-4">Account</div>
        {[
          { label:'Email',        value: me?.email },
          { label:'Credits',      value: `$${parseFloat(me?.credits||0).toFixed(2)}`, mono:true },
          { label:'Member since', value: me?.created_at ? new Date(me.created_at).toLocaleDateString() : '—' },
        ].map((r,i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-500">{r.label}</span>
            <span className={`text-xs font-semibold text-gray-900 ${r.mono?'font-mono':''}`}>{r.value}</span>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <div className="text-sm font-bold text-gray-900 mb-4">Change password</div>
        <form onSubmit={changePassword} className="space-y-3">
          {[{label:'Current password',key:'current',ph:'••••••••'},{label:'New password',key:'next',ph:'Min 8 characters'},{label:'Confirm new',key:'confirm',ph:'••••••••'}].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{f.label}</label>
              <input type="password" placeholder={f.ph} value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]:e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-300" />
            </div>
          ))}
          {msg && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border text-xs ${msg.ok?'bg-green-50 border-green-100 text-green-700':'bg-red-50 border-red-100 text-red-600'}`}>
              {msg.text}
            </div>
          )}
          <button type="submit" disabled={saving || !form.current || !form.next || !form.confirm}
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-all">
            {saving ? 'Saving...' : 'Update password'}
          </button>
        </form>
      </div>

      <div className="bg-white border border-red-100 rounded-xl p-5">
        <div className="text-sm font-bold text-red-500 mb-4">Session</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900">Sign out</div>
            <div className="text-xs text-gray-400 mt-0.5">Clears your local session</div>
          </div>
          <button onClick={() => { localStorage.clear(); nav('/') }}
            className="px-4 py-2 border border-red-200 text-red-600 text-xs rounded-lg hover:bg-red-50 transition-colors font-semibold">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────
const TABS = [
  { id:'marketplace', label:'Marketplace' },
  { id:'usage',       label:'Usage' },
  { id:'billing',     label:'Billing' },
  { id:'docs',        label:'Docs' },
  { id:'settings',    label:'Settings' },
]

export function Dashboard() {
  const [me, setMe]             = useState(null)
  const [apis, setApis]         = useState([])
  const [stats, setStats]       = useState(null)
  const [usage, setUsage]       = useState([])
  const [tab, setTab]           = useState('marketplace')
  const [vaultKey, setVaultKey] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [navOpen, setNavOpen]   = useState(false)         // ← NEW
  const nav = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('reference')
    if (ref) {
      window.history.replaceState({}, '', '/app')
      api.verifyPayment(ref).then(r => { if (r?.ok) api.me().then(m => setMe(m)) }).catch(() => {})
    }

    Promise.all([api.me(), api.marketplace(), api.usageStats(), api.usage(), api.revealKey().catch(() => null)])
      .then(([m, mkt, s, u, k]) => {
        setMe(m); setApis(mkt); setStats(s); setUsage(u)
        if (k?.key) setVaultKey(k.key)
        const onboarded = localStorage.getItem('onboarded_' + m.id)
        if (!onboarded && u.length === 0) setShowOnboarding(true)
      })
      .catch(() => { localStorage.clear(); nav('/') })
  }, [])

  if (!me) return <div className="min-h-screen bg-white flex items-center justify-center"><Spin s={6} /></div>

  if (showOnboarding) return (
    <Onboarding me={me} vaultKey={vaultKey} onComplete={() => {
      localStorage.setItem('onboarded_' + me.id, '1')
      setShowOnboarding(false)
    }} />
  )

  return (
    <div className="min-h-screen bg-[#fafafa]">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between relative">

          {/* Logo */}
          <button onClick={() => nav('/')}
            className="flex items-center gap-2 flex-shrink-0 hover:opacity-60 transition-opacity">
            <div className="w-5 h-5 rounded bg-gray-900 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">APIvault</span>
          </button>

          {/* Desktop tabs — centered */}
          <div className="hidden md:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                  tab === t.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Right: credits + hamburger */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:block text-right">
              <div className={`text-xs font-bold ${parseFloat(me.credits) < 1 ? 'text-red-500' : 'text-gray-900'}`}>
                ${parseFloat(me.credits).toFixed(2)}
              </div>
              <div className="text-[10px] text-gray-400">credits</div>
            </div>
            {/* Hamburger — mobile only */}
            <button onClick={() => setNavOpen(o => !o)}
              aria-label="Toggle menu"
              className="md:hidden flex flex-col justify-center items-center gap-[5px] w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors">
              <span className={`block h-0.5 w-5 bg-gray-700 rounded transition-all duration-200 ${navOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
              <span className={`block h-0.5 w-5 bg-gray-700 rounded transition-all duration-200 ${navOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-5 bg-gray-700 rounded transition-all duration-200 ${navOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {navOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col gap-0.5">
              {TABS.map(t => (
                <button key={t.id}
                  onClick={() => { setTab(t.id); setNavOpen(false) }}
                  className={`w-full text-left px-4 py-3 text-sm rounded-lg transition-colors font-medium ${
                    tab === t.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}>
                  {t.label}
                </button>
              ))}
              <div className="px-4 py-3 border-t border-gray-100 mt-1">
                <span className={`text-xs font-semibold ${parseFloat(me.credits) < 1 ? 'text-red-500' : 'text-gray-500'}`}>
                  ${parseFloat(me.credits).toFixed(2)} credits
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {tab==='marketplace' && <Marketplace apis={apis} me={me} vaultKey={vaultKey} onAddCredits={() => setTab('billing')} />}
        {tab==='usage'       && <Usage stats={stats} usage={usage} />}
        {tab==='billing'     && <Billing me={me} setMe={setMe} vaultKey={vaultKey} setVaultKey={setVaultKey} />}
        {tab==='docs'        && <Docs apis={apis} vaultKey={vaultKey} />}
        {tab==='settings'    && <Settings me={me} />}
      </div>
    </div>
  )
}