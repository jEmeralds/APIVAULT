// client/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { Onboarding } from './Onboarding.jsx'

const BASE = import.meta.env.VITE_API_URL || ''

// ── Category colours ──────────────────────────────────────────────────────────
const CAT_COLOR = {
  ai:       'purple',
  data:     'amber',
  dev:      'orange',
  payments: 'green',
  comms:    'blue',
  finance:  'green',
  geo:      'teal',
  health:   'pink',
  media:    'fuchsia',
}

const CAT_STYLE = {
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-100' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-100'  },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-100' },
  green:   { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-100'  },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100'   },
  teal:    { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-100'   },
  pink:    { bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-100'   },
  fuchsia: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-100'},
  gray:    { bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-100'   },
}

// ── Task buckets — plain-language front door instead of raw categories ────────
// Each bucket groups technical categories under a task a non-developer would
// actually search for. "all" always exists as the escape hatch.
const TASKS = [
  { id: 'all',     label: 'Everything',              icon: '✨', cats: null },
  { id: 'ai',      label: 'Ask AI a question',        icon: '🤖', cats: ['ai'] },
  { id: 'money',   label: 'Money & payments',          icon: '💸', cats: ['payments', 'finance'] },
  { id: 'comms',   label: 'Send a message',            icon: '💬', cats: ['comms'] },
  { id: 'info',    label: 'Look up facts & places',    icon: '🌍', cats: ['data', 'geo', 'health'] },
  { id: 'media',   label: 'Media & fun',               icon: '🎬', cats: ['media'] },
  { id: 'dev',     label: 'Developer tools',           icon: '🛠️', cats: ['dev'] },
]

function bucketForCategory(cat) {
  return TASKS.find(t => t.cats && t.cats.includes(cat))?.id || 'dev'
}

// ── Plain-language outcomes — what each API actually does for you ─────────────
// Falls back to the registry's own description, then a generic phrase.
const OUTCOMES = {
  openweather:   'Get the current weather for any city',
  newsapi:       'Get today\'s top news headlines',
  github:        'Look up a GitHub profile or repository',
  restcountries: 'Get facts about any country',
  ipgeo:         'Find the location of an IP address',
  exchangerates: 'Convert between currencies',
  jokeapi:       'Get a programming joke',
  dictionary:    'Look up the definition of a word',
  claude:        'Ask an AI a question and get an answer',
  openlib:       'Search millions of books',
  nasa:          'Get NASA\'s photo of the day',
  worldbank:     'Get country economic data',
  pokemon:       'Look up any Pokémon',
  rickmorty:     'Look up Rick and Morty characters',
  catfacts:      'Get a random cat fact',
  dogapi:        'Get a random dog photo',
  adviceslip:    'Get a random piece of advice',
  agify:         'Guess someone\'s age from their name',
  genderize:     'Guess someone\'s gender from their name',
  nationalize:   'Guess someone\'s nationality from their name',
  diseasesh:     'Get global disease statistics',
  spacex:        'Get the latest SpaceX launch',
  bored:         'Get a random activity idea',
  randomuser:    'Generate a random fake person',
  quotable:      'Get a random inspirational quote',
  opentrivia:    'Get trivia questions',
  covid19:       'Get COVID-19 case statistics',
  httpbin:       'Test HTTP requests',
  'lorem-picsum':'Get random placeholder photos',
  cataas:        'Get a random cat photo',
  dummyjson:     'Get sample product data for testing',
  fakerapi:      'Generate fake test data',
  chucknorris:   'Get a random Chuck Norris joke',
  ipapi:         'Find the location of an IP address',
  openmeteo:     'Get live weather by coordinates',
  nominatim:     'Turn an address into map coordinates',
  timezone:      'Get the current time in any timezone',
  frankfurter:   'Convert between currencies',
  coingecko:     'Get live crypto prices',
  feargreed:     'Get the crypto market sentiment index',
  coincap:       'Get live crypto market data',
  openfda:       'Look up drug label information',
  itunesearch:   'Search music, apps, and podcasts on iTunes',
}

function outcomeFor(a) {
  return OUTCOMES[a.slug] || a.description || `Connect to ${a.name}`
}

// ── API docs config ───────────────────────────────────────────────────────────
const API_DOCS = {
  openweather:   { tryPath: '/weather?q=Nairobi&units=metric' },
  newsapi:       { tryPath: '/top-headlines?country=us&pageSize=3' },
  github:        { tryPath: '/users/octocat' },
  restcountries: { tryPath: '/name/kenya' },
  ipgeo:         { tryPath: '/json/8.8.8.8' },
  exchangerates: { tryPath: '/latest/USD' },
  jokeapi:       { tryPath: '/joke/Programming?type=single' },
  dictionary:    { tryPath: '/entries/en/hello' },
  claude: {
    tryPath: '/messages', tryMethod: 'POST',
    tryBody: { model: 'claude-haiku-4-5-20251001', max_tokens: 100, messages: [{ role: 'user', content: 'Say hello in one sentence.' }] }
  },
  openlib:       { tryPath: '/search.json?q=javascript&limit=3' },
  nasa:          { tryPath: '/planetary/apod?count=1' },
  worldbank:     { tryPath: '/country/KE?format=json' },
  pokemon:       { tryPath: '/pokemon/pikachu' },
  rickmorty:     { tryPath: '/character/1' },
  catfacts:      { tryPath: '/fact' },
  dogapi:        { tryPath: '/breeds/image/random' },
  adviceslip:    { tryPath: '/advice' },
  agify:         { tryPath: '/?name=michael' },
  genderize:     { tryPath: '/?name=alex' },
  nationalize:   { tryPath: '/?name=chen' },
  diseasesh:     { tryPath: '/all' },
  spacex:        { tryPath: '/launches/latest' },
  bored:         { tryPath: '/activity' },
  randomuser:    { tryPath: '/?results=1&nat=us' },
  quotable:      { tryPath: '/random' },
  opentrivia:    { tryPath: '/?amount=5&type=multiple' },
  covid19:       { tryPath: '/summary' },
  httpbin:       { tryPath: '/get' },
  'lorem-picsum':{ tryPath: '/photos?limit=3' },
  cataas:        { tryPath: '/cat?json=true' },
  dummyjson:     { tryPath: '/products?limit=3' },
  fakerapi:      { tryPath: '/persons?_quantity=2' },
  chucknorris:   { tryPath: '/jokes/random' },
  ipapi:         { tryPath: '/8.8.8.8/json' },
  openmeteo:     { tryPath: '/forecast?latitude=1.28&longitude=36.82&current_weather=true' },
  nominatim:     { tryPath: '/search?q=Nairobi&format=json&limit=1' },
  timezone:      { tryPath: '/Africa/Nairobi' },
  frankfurter:   { tryPath: '/latest?from=USD&to=KES,EUR,GBP' },
  coingecko:     { tryPath: '/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&page=1' },
  feargreed:     { tryPath: '/?limit=1' },
  coincap:       { tryPath: '/assets?limit=5' },
  openfda:       { tryPath: '/drug/label.json?limit=2' },
  itunesearch:   { tryPath: '/search?term=drake&limit=3' },
}

// ── Code builder ──────────────────────────────────────────────────────────────
function buildSnippet(slug, path, method = 'GET', lang = 'js', vaultKey, body) {
  const API_BASE   = 'https://api.apivault.uk'
  const displayKey = vaultKey ? vaultKey.replace('sk-vault-', '') : 'YOUR_VAULT_KEY'
  const isPost     = method === 'POST'
  const bodyStr    = body ? JSON.stringify(body, null, 2) : ''

  if (lang === 'js') {
    if (isPost) return `const res = await fetch('${API_BASE}/proxy/${slug}${path}', {
  method: 'POST',
  headers: {
    'x-vault-key': '${displayKey}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(${bodyStr})
})
const data = await res.json()`
    return `const res = await fetch('${API_BASE}/proxy/${slug}${path}', {
  headers: { 'x-vault-key': '${displayKey}' }
})
const data = await res.json()`
  }

  if (lang === 'python') {
    if (isPost) return `import requests
res = requests.post(
  '${API_BASE}/proxy/${slug}${path}',
  headers={'x-vault-key': '${displayKey}'},
  json=${bodyStr}
)
data = res.json()`
    return `import requests
res = requests.get(
  '${API_BASE}/proxy/${slug}${path}',
  headers={'x-vault-key': '${displayKey}'}
)
data = res.json()`
  }

  if (isPost) return `curl -X POST '${API_BASE}/proxy/${slug}${path}' \\
  -H 'x-vault-key: ${displayKey}' \\
  -H 'Content-Type: application/json' \\
  -d '${bodyStr}'`
  return `curl '${API_BASE}/proxy/${slug}${path}' \\
  -H 'x-vault-key: ${displayKey}'`
}

// ── Friendly result formatter ──────────────────────────────────────────────────
// Turns a raw API response into a short list of plain-language facts instead
// of a wall of JSON. Falls back to raw JSON (collapsed) if nothing matches.
function friendlyFormat(data) {
  if (data === null || data === undefined) return null
  const item = Array.isArray(data) ? data[0] : data
  if (!item || typeof item !== 'object') {
    return [{ k: 'Result', v: String(data).slice(0, 200) }]
  }

  // Known common shapes first
  if (item.rates && typeof item.rates === 'object') {
    return Object.entries(item.rates).slice(0, 4).map(([k, v]) => ({ k, v: String(v) }))
  }
  if (item.joke) return [{ k: 'Joke', v: item.joke.slice(0, 200) }]
  if (item.value?.joke) return [{ k: 'Joke', v: item.value.joke.slice(0, 200) }]
  if (item.fact) return [{ k: 'Fact', v: item.fact.slice(0, 200) }]
  if (item.slip?.advice) return [{ k: 'Advice', v: item.slip.advice.slice(0, 200) }]
  if (item.activity) return [{ k: 'Activity', v: item.activity.slice(0, 200) }]
  if (item.name && typeof item.name === 'object' && item.name.common) {
    return [
      { k: 'Country', v: `${item.flag || ''} ${item.name.common}`.trim() },
      { k: 'Capital', v: Array.isArray(item.capital) ? item.capital[0] : item.capital },
      { k: 'Population', v: item.population ? `${(item.population / 1e6).toFixed(1)}M` : undefined },
    ].filter(r => r.v)
  }
  if (typeof item.name === 'string' && item.population) {
    return [
      { k: 'Country', v: `${item.flag || ''} ${item.name}`.trim() },
      { k: 'Capital', v: Array.isArray(item.capital) ? item.capital[0] : item.capital },
      { k: 'Population', v: `${(item.population / 1e6).toFixed(1)}M` },
    ].filter(r => r.v)
  }
  if (item.content?.[0]?.text) return [{ k: 'Answer', v: item.content[0].text.slice(0, 300) }]
  if (item.message?.content?.[0]?.text) return [{ k: 'Answer', v: item.message.content[0].text.slice(0, 300) }]

  // Generic — first few primitive fields
  const rows = []
  for (const [key, val] of Object.entries(item)) {
    if (rows.length >= 4) break
    if (typeof val === 'string' && val.length > 0) rows.push({ k: key, v: val.slice(0, 140) })
    else if (typeof val === 'number' || typeof val === 'boolean') rows.push({ k: key, v: String(val) })
  }
  return rows.length ? rows : null
}

// ── Primitives ────────────────────────────────────────────────────────────────
function Spin({ s = 5 }) {
  return <div className={`w-${s} h-${s} border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin`} />
}

function CopyBtn({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000) }}
      className="text-xs px-2.5 py-1 rounded-md border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors">
      {done ? '✓ Copied' : 'Copy'}
    </button>
  )
}

// ── API Card — plain-language, try-it-first ────────────────────────────────────
function APICard({ a, expanded, onExpand, vaultKey, onAddCredits }) {
  const [lang,       setLang]       = useState('js')
  const [running,    setRunning]    = useState(false)
  const [result,     setResult]     = useState(null)
  const [showCode,   setShowCode]   = useState(false)
  const isOpen = expanded === a.slug
  const doc    = API_DOCS[a.slug]
  const color  = CAT_COLOR[a.category] || 'gray'
  const cs     = CAT_STYLE[color] || CAT_STYLE.gray
  const outcome = outcomeFor(a)

  async function run() {
    if (!doc?.tryPath || !vaultKey) return
    setRunning(true); setResult(null)
    try {
      const uuid  = vaultKey?.replace('sk-vault-', '')
      const isPost = doc?.tryMethod === 'POST'
      const res   = await fetch(`${BASE}/proxy/${a.slug}${doc.tryPath}`, {
        method: isPost ? 'POST' : 'GET',
        headers: { 'x-vault-key': uuid, ...(isPost ? { 'Content-Type': 'application/json' } : {}) },
        body: isPost && doc?.tryBody ? JSON.stringify(doc.tryBody) : undefined,
      })
      const data = await res.json()
      setResult({ ok: res.ok, status: res.status, data, friendly: friendlyFormat(data) })
    } catch (e) { setResult({ ok: false, error: e.message }) }
    setRunning(false)
  }

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-200 ${isOpen ? 'border-gray-300 shadow-lg' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}>
      <div className="p-4">
        {/* Top row: category + price */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${cs.bg} ${cs.text}`}>
            {a.category}
          </span>
          <div className="flex items-center gap-1.5">
            {a.state === 'active' && a.user_price === 0 && (
              <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full">FREE</span>
            )}
            {a.state === 'active' && a.user_price > 0 && (
              <span className="text-[10px] font-mono text-gray-500">${a.user_price.toFixed(4)}/call</span>
            )}
          </div>
        </div>

        {/* Name + plain-language outcome (replaces raw /proxy/slug as the headline) */}
        <h3 className="font-bold text-gray-900 text-sm mb-1">{a.name}</h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-4">{outcome}</p>

        {/* Action button */}
        {a.state === 'active' && (
          <button onClick={() => onExpand(a.slug)}
            className={`w-full py-2 rounded-xl text-xs font-bold border transition-all ${
              isOpen
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-200 text-gray-700 hover:border-gray-900 hover:bg-gray-900 hover:text-white'
            }`}>
            {isOpen ? '✕ Close' : '⚡ Try it'}
          </button>
        )}
        {a.state === 'needs_credits' && (
          <button onClick={onAddCredits}
            className="w-full py-2 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors">
            Add credits to use →
          </button>
        )}
        {a.state === 'coming_soon' && (
          <div className="w-full py-2 rounded-xl text-xs font-medium text-center text-gray-300 bg-gray-50 border border-gray-100">
            Coming soon
          </div>
        )}
      </div>

      {/* Expanded panel — try it first, code hidden behind a toggle */}
      {isOpen && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center gap-3">
            <button onClick={run} disabled={running || !vaultKey || !doc?.tryPath}
              className="px-4 py-2 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-40 font-semibold flex items-center gap-2 transition-colors">
              {running ? <><Spin s={3}/><span>Trying it...</span></> : '▶ See it in action'}
            </button>
            <span className="text-xs text-gray-400">
              {!vaultKey ? 'Go to Billing → Reveal key to try it' : a.user_price === 0 ? 'Free · no credits used' : `$${a.user_price.toFixed(4)} per try`}
            </span>
          </div>

          {/* Friendly result */}
          {result && (
            <div className={`rounded-xl p-4 border ${result.ok ? 'bg-white border-green-100' : 'bg-red-50 border-red-100'}`}>
              {result.ok ? (
                result.friendly ? (
                  <div className="space-y-2">
                    {result.friendly.map((row, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="text-xs text-gray-400 w-24 flex-shrink-0 capitalize">{row.k}</span>
                        <span className="text-sm text-gray-800 font-medium">{row.v}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">It worked, but the response didn't have anything simple to show here. Check "View code" below for the raw response.</p>
                )
              ) : (
                <div className="text-xs font-semibold text-red-600">✗ {result.status || 'Error'} — {result.error || 'Something went wrong'}</div>
              )}
            </div>
          )}

          {/* View code — collapsed by default, for developers */}
          <div>
            <button onClick={() => setShowCode(s => !s)}
              className="text-xs text-gray-400 hover:text-gray-600 font-medium flex items-center gap-1 transition-colors">
              {showCode ? '▾' : '▸'} {showCode ? 'Hide code' : '</> View code'}
            </button>
            {showCode && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 p-1 bg-gray-800 rounded-lg">
                    {[['js','JS'],['python','Python'],['curl','cURL']].map(([id,lbl]) => (
                      <button key={id} onClick={() => setLang(id)}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${lang===id?'bg-gray-600 text-white':'text-gray-400 hover:text-gray-200'}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {vaultKey && <span className="text-[10px] text-green-500 font-medium">✓ Key loaded</span>}
                    <CopyBtn text={buildSnippet(a.slug, doc?.tryPath || '/', doc?.tryMethod || 'GET', lang, vaultKey, doc?.tryBody)} />
                  </div>
                </div>
                <div className="bg-gray-950 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-xs text-gray-300 font-mono leading-relaxed whitespace-pre">
                    {buildSnippet(a.slug, doc?.tryPath || '/', doc?.tryMethod || 'GET', lang, vaultKey, doc?.tryBody)}
                  </pre>
                </div>
                {result && (
                  <div className="bg-gray-950 rounded-xl p-4 overflow-x-auto">
                    <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wide">Raw response</p>
                    <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {JSON.stringify(result.data || result.error, null, 2)}
                    </pre>
                  </div>
                )}
                <p className="font-mono text-[10px] text-gray-300">/proxy/{a.slug}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Marketplace — guided discovery instead of a full inventory dump ───────────
function Marketplace({ apis, me, vaultKey, onAddCredits }) {
  const [task,       setTask]       = useState('all')
  const [search,     setSearch]     = useState('')
  const [expanded,   setExpanded]   = useState(null)
  const [showCats,   setShowCats]   = useState(false)
  const [catFilter,  setCatFilter]  = useState('all')
  const [requesting, setRequesting] = useState(false)
  const [requestSent, setRequestSent] = useState(false)

  const cats   = ['all', ...new Set(apis.map(a => a.category).sort())]
  const active = apis.filter(a => a.state === 'active')
  const hasLow = parseFloat(me?.credits || 0) < 1

  const activeTask = TASKS.find(t => t.id === task)

  const filtered = apis
    .filter(a => {
      if (search.trim()) return true // search overrides task/category filtering below
      if (task !== 'all' && activeTask?.cats && !activeTask.cats.includes(a.category)) return false
      if (showCats && catFilter !== 'all' && a.category !== catFilter) return false
      return true
    })
    .filter(a => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return a.name.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) || outcomeFor(a).toLowerCase().includes(q)
    })

  const showDiscovery = search.trim().length > 1 && filtered.length === 0

  async function requestAPI() {
    setRequesting(true)
    try { await api.requestAPI(search.trim()); setRequestSent(true) } catch {}
    setRequesting(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">API Marketplace</h1>
          <p className="text-sm text-gray-400 mt-0.5">{active.length} APIs ready to use · {apis.filter(a=>a.state==='coming_soon').length} coming soon</p>
        </div>
        <div className={`text-lg font-bold ${hasLow ? 'text-red-500' : 'text-gray-900'}`}>
          ${parseFloat(me?.credits || 0).toFixed(2)} <span className="text-xs font-normal text-gray-400">credits</span>
        </div>
      </div>

      {/* Low credits banner */}
      {hasLow && apis.some(a => a.state === 'needs_credits') && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-amber-800">Free APIs are active · Some APIs need credits</div>
            <div className="text-xs text-amber-600 mt-0.5">Add $1 or more to unlock paid APIs like Claude</div>
          </div>
          <button onClick={onAddCredits} className="flex-shrink-0 px-4 py-2 bg-amber-500 text-white text-xs rounded-lg font-bold hover:bg-amber-600 transition-colors">
            Add credits →
          </button>
        </div>
      )}

      {/* Guided entry: "What are you trying to do?" */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-gray-500 mb-2.5">What are you trying to do?</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TASKS.map(t => (
            <button key={t.id} onClick={() => { setTask(t.id); setSearch('') }}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs rounded-xl border transition-all flex-shrink-0 font-medium ${
                task === t.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}>
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search — secondary, for when someone already knows the name */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input value={search} onChange={e => { setSearch(e.target.value); setRequestSent(false) }}
          placeholder="Or search by name — e.g. weather, crypto, jokes..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-300 bg-white"/>
        {search && (
          <button onClick={() => { setSearch(''); setRequestSent(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-lg">×</button>
        )}
      </div>

      {/* Advanced: browse by raw category — collapsed, for power users */}
      <div className="mb-6">
        <button onClick={() => setShowCats(s => !s)} className="text-xs text-gray-400 hover:text-gray-600 font-medium">
          {showCats ? '▾' : '▸'} Browse by category instead
        </button>
        {showCats && (
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
            {cats.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all capitalize flex-shrink-0 ${
                  catFilter === c ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}>
                {c === 'all' ? `All (${apis.length})` : `${c} (${apis.filter(a=>a.category===c).length})`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Discovery prompt */}
      {showDiscovery && (
        <div className="mb-6 p-5 border-2 border-dashed border-gray-200 rounded-xl text-center">
          <div className="text-2xl mb-2">📌</div>
          <div className="font-semibold text-gray-900 mb-1">"{search}" not in the vault yet</div>
          <div className="text-sm text-gray-400 mb-4">Request it and we'll add it. You'll be notified when it's live.</div>
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

      {/* Empty state when a task bucket has nothing active yet */}
      {!showDiscovery && filtered.length === 0 && (
        <div className="p-8 text-center text-gray-300 text-sm">
          Nothing here yet for this — try "Everything" or search by name above.
        </div>
      )}

      {/* Grid */}
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

// ── Usage ─────────────────────────────────────────────────────────────────────
function Usage({ stats, usage }) {
  if (!stats) return <div className="flex justify-center py-16"><Spin s={6}/></div>
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Usage</h1>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: '7-day calls', value: stats.total_calls?.toLocaleString() || '0' },
          { label: '7-day spend', value: `$${parseFloat(stats.total_spent||0).toFixed(4)}` },
          { label: 'APIs used',   value: stats.top_apis?.length || 0 },
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

// ── Billing ───────────────────────────────────────────────────────────────────
function CustomAmount({ onBuy }) {
  const [val, setVal] = useState('')
  const [loading, setL] = useState(false)
  const [err, setErr] = useState('')
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
            className="w-full pl-7 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-300"/>
        </div>
        <button onClick={buy} disabled={!valid || loading}
          className="px-4 py-2.5 bg-gray-900 text-white text-sm rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-40 transition-all whitespace-nowrap">
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
  const [notice,   setNotice]   = useState(null)
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
        <div className={`mb-4 p-3 rounded-xl border text-sm ${notice.ok ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
          {notice.msg}
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-bold text-gray-900">Credit balance</div>
          <div className={`text-2xl font-bold ${credits < 1 ? 'text-red-500' : 'text-gray-900'}`}>
            ${credits.toFixed(2)}
          </div>
        </div>
        <CustomAmount onBuy={buy} />
        <div className="mt-3 flex gap-2">
          {[5, 10, 25].map(amt => (
            <button key={amt} onClick={() => buy(amt)}
              className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs rounded-lg hover:border-gray-400 transition-colors font-medium">
              ${amt}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <div className="text-sm font-bold text-gray-900 mb-3">Your vault key</div>
        <p className="text-xs text-gray-400 mb-3">Use this key in every API request. It's the only credential you need.</p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 font-mono text-xs text-gray-700 flex items-center justify-between gap-3">
          <span className="truncate">{revealed && vaultKey ? `sk-vault-${vaultKey}` : '••••••••••••••••••••••••••••••••••••••'}</span>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={async () => {
              if (!revealed) {
                try { const k = await api.revealKey(); if (k?.key) { setVaultKey(k.key); setRevealed(true) } }
                catch {}
              } else setRevealed(false)
            }} className="text-xs text-gray-500 hover:text-gray-700 transition-colors font-medium">
              {revealed ? 'Hide' : 'Reveal'}
            </button>
            {revealed && vaultKey && (
              <button onClick={() => navigator.clipboard?.writeText(`sk-vault-${vaultKey}`)}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors">Copy</button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-300 mt-2">Keep this secret — treat it like a password.</p>
      </div>
    </div>
  )
}

// ── Docs ──────────────────────────────────────────────────────────────────────
function Docs({ apis, vaultKey }) {
  const [selected, setSelected] = useState(null)
  const [lang,     setLang]     = useState('js')
  const active = apis.filter(a => a.state === 'active')
  const a = selected ? apis.find(x => x.slug === selected) : null
  const doc = selected ? API_DOCS[selected] : null

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">API Documentation</h1>
      <div className="flex gap-6 h-[calc(100vh-200px)] min-h-[400px]">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0 overflow-y-auto space-y-0.5">
          {active.map(x => (
            <button key={x.slug} onClick={() => setSelected(x.slug)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                selected === x.slug ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}>
              {x.name}
            </button>
          ))}
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {a && doc ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{a.name}</h2>
                {a.description && <p className="text-sm text-gray-500 mt-1">{a.description}</p>}
                <div className="mt-2 font-mono text-xs bg-gray-100 px-3 py-1.5 rounded-lg inline-block text-gray-600">
                  Base: https://api.apivault.uk/proxy/{a.slug}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Example</div>
                  <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                    {[['js','JS'],['python','Python'],['curl','cURL']].map(([id,lbl]) => (
                      <button key={id} onClick={() => setLang(id)}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${lang===id?'bg-white shadow-sm text-gray-900':'text-gray-500 hover:text-gray-700'}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-950 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-xs text-gray-300 font-mono leading-relaxed whitespace-pre">
                    {buildSnippet(a.slug, doc.tryPath || '/', doc.tryMethod || 'GET', lang, vaultKey, doc.tryBody)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <div className="text-5xl mb-4">📖</div>
              <div className="text-sm">Select an API from the sidebar</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────
function Settings({ me }) {
  const [form,   setForm]   = useState({ current:'', next:'', confirm:'' })
  const [msg,    setMsg]    = useState(null)
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
          { label:'Credits',      value: `$${parseFloat(me?.credits||0).toFixed(2)}` },
          { label:'Member since', value: me?.created_at ? new Date(me.created_at).toLocaleDateString() : '—' },
        ].map(r => (
          <div key={r.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-400">{r.label}</span>
            <span className="text-xs font-medium text-gray-700">{r.value}</span>
          </div>
        ))}
      </div>
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <div className="text-sm font-bold text-gray-900 mb-4">Change password</div>
        {msg && (
          <div className={`mb-3 p-3 rounded-lg text-xs ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {msg.text}
          </div>
        )}
        <form onSubmit={changePassword} className="space-y-3">
          {[
            { name:'current', label:'Current password', placeholder:'Current password' },
            { name:'next',    label:'New password',     placeholder:'Min 8 characters' },
            { name:'confirm', label:'Confirm new',      placeholder:'Repeat new password' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
              <input type="password" placeholder={f.placeholder} value={form[f.name]}
                onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"/>
            </div>
          ))}
          <button type="submit" disabled={saving || !form.current || !form.next || !form.confirm}
            className="w-full py-2.5 bg-gray-900 text-white text-sm rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-40 transition-colors">
            {saving ? 'Saving...' : 'Update password'}
          </button>
        </form>
      </div>
      <button onClick={() => { localStorage.clear(); nav('/') }}
        className="w-full py-2.5 border border-gray-200 text-gray-500 text-sm rounded-xl hover:border-red-200 hover:text-red-500 transition-colors">
        Sign out
      </button>
    </div>
  )
}

// ── Dashboard shell ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'usage',       label: 'Usage'       },
  { id: 'billing',     label: 'Billing'     },
  { id: 'docs',        label: 'Docs'        },
  { id: 'settings',    label: 'Settings'    },
]

export function Dashboard() {
  const nav = useNavigate()
  const [me,       setMe]       = useState(null)
  const [apis,     setApis]     = useState([])
  const [stats,    setStats]    = useState(null)
  const [usage,    setUsage]    = useState([])
  const [tab,      setTab]      = useState('marketplace')
  const [vaultKey, setVaultKey] = useState(null)
  const [navOpen,  setNavOpen]  = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    Promise.all([api.me(), api.marketplace(), api.usageStats(), api.usage(), api.revealKey().catch(() => null)])
      .then(([m, mkt, s, u, k]) => {
        setMe(m); setApis(mkt); setStats(s); setUsage(u)
        if (k?.key) setVaultKey(k.key)
        const onboarded = localStorage.getItem('onboarded_' + m.id)
        if (!onboarded && u.length === 0) setShowOnboarding(true)
      })
      .catch(() => { localStorage.clear(); nav('/') })
  }, [])

  if (!me) return <div className="min-h-screen bg-white flex items-center justify-center"><Spin s={6}/></div>

  if (showOnboarding) return (
    <Onboarding me={me} vaultKey={vaultKey} onComplete={() => {
      localStorage.setItem('onboarded_' + me.id, '1')
      setShowOnboarding(false)
    }}/>
  )

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Nav */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between relative">
          <button onClick={() => nav('/')}
            className="flex items-center gap-2 flex-shrink-0 hover:opacity-60 transition-opacity">
            <div className="w-5 h-5 rounded bg-gray-900 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white"/>
            </div>
            <span className="font-bold text-sm tracking-tight">APIvault</span>
          </button>

          {/* Desktop tabs */}
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

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:block text-right">
              <div className={`text-xs font-bold ${parseFloat(me.credits) < 1 ? 'text-red-500' : 'text-gray-900'}`}>
                ${parseFloat(me.credits).toFixed(2)}
              </div>
              <div className="text-[10px] text-gray-400">credits</div>
            </div>
            <button onClick={() => setNavOpen(o => !o)} aria-label="Toggle menu"
              className="md:hidden flex flex-col justify-center items-center gap-[5px] w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors">
              <span className={`block h-0.5 w-5 bg-gray-700 rounded transition-all ${navOpen ? 'rotate-45 translate-y-[7px]' : ''}`}/>
              <span className={`block h-0.5 w-5 bg-gray-700 rounded transition-all ${navOpen ? 'opacity-0' : ''}`}/>
              <span className={`block h-0.5 w-5 bg-gray-700 rounded transition-all ${navOpen ? '-rotate-45 -translate-y-[7px]' : ''}`}/>
            </button>
          </div>
        </div>

        {navOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col gap-0.5">
              {TABS.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setNavOpen(false) }}
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
        {tab==='marketplace' && <Marketplace apis={apis} me={me} vaultKey={vaultKey} onAddCredits={() => setTab('billing')}/>}
        {tab==='usage'       && <Usage stats={stats} usage={usage}/>}
        {tab==='billing'     && <Billing me={me} setMe={setMe} vaultKey={vaultKey} setVaultKey={setVaultKey}/>}
        {tab==='docs'        && <Docs apis={apis} vaultKey={vaultKey}/>}
        {tab==='settings'    && <Settings me={me}/>}
      </div>
    </div>
  )
}