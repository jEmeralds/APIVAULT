// client/src/pages/Docs.jsx
// Public documentation — no login required
// Accessible at apivault.uk/docs

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const BASE_URL = 'https://api.apivault.uk'

// ─── API Documentation ────────────────────────────────────────────────────

const DOCS = [
  // ── AI ──────────────────────────────────────────────────────────────────
  {
    slug: 'claude', name: 'Claude (Anthropic)', cat: 'ai', price: '$0.0048',
    desc: 'Anthropic\'s Claude AI — fast, capable language model. Great for content generation, analysis, coding, and conversation.',
    auth: 'x-api-key',
    method: 'POST',
    endpoints: [
      {
        method: 'POST', path: '/messages',
        desc: 'Send a message and get a response',
        body: {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{ role: 'user', content: 'Your message here' }]
        },
        response: { id: 'msg_01...', type: 'message', role: 'assistant', content: [{ type: 'text', text: 'Response text...' }] }
      }
    ]
  },

  // ── DATA ────────────────────────────────────────────────────────────────
  {
    slug: 'newsapi', name: 'NewsAPI', cat: 'data', price: '$0.002',
    desc: 'Live news headlines and articles from 75,000+ sources worldwide.',
    endpoints: [
      { method: 'GET', path: '/top-headlines', desc: 'Top headlines', params: [{ name: 'country', example: 'ke' }, { name: 'pageSize', example: '5' }] },
      { method: 'GET', path: '/everything', desc: 'Search all articles', params: [{ name: 'q', example: 'Kenya economy' }] },
    ]
  },
  {
    slug: 'exchangerates', name: 'Exchange Rates', cat: 'data', price: 'Free',
    desc: 'Live foreign exchange rates for 170+ currencies. Updated hourly.',
    endpoints: [
      { method: 'GET', path: '/latest/USD', desc: 'Rates from USD', params: [] },
      { method: 'GET', path: '/latest/KES', desc: 'Rates from KES', params: [] },
    ]
  },
  {
    slug: 'restcountries', name: 'REST Countries', cat: 'data', price: 'Free',
    desc: 'Country data — population, capitals, currencies, flags, languages.',
    endpoints: [
      { method: 'GET', path: '/name/kenya', desc: 'Country by name', params: [{ name: 'name', example: 'kenya' }] },
      { method: 'GET', path: '/region/africa', desc: 'Countries by region', params: [] },
      { method: 'GET', path: '/alpha/KE', desc: 'Country by code', params: [] },
    ]
  },
  {
    slug: 'openweather', name: 'OpenWeather', cat: 'data', price: '$0.001',
    desc: 'Current weather and forecasts for any city worldwide.',
    endpoints: [
      { method: 'GET', path: '/weather', desc: 'Current weather', params: [{ name: 'q', example: 'Nairobi' }, { name: 'units', example: 'metric' }] },
      { method: 'GET', path: '/forecast', desc: '5-day forecast', params: [{ name: 'q', example: 'Nairobi' }] },
    ]
  },
  {
    slug: 'pokemon', name: 'PokéAPI', cat: 'data', price: 'Free',
    desc: 'Complete Pokémon database — stats, moves, types, evolutions.',
    endpoints: [
      { method: 'GET', path: '/pokemon/pikachu', desc: 'Pokémon details', params: [] },
      { method: 'GET', path: '/type/fire', desc: 'Type information', params: [] },
    ]
  },
  {
    slug: 'nasa', name: 'NASA Open Data', cat: 'data', price: 'Free',
    desc: 'NASA\'s public APIs — astronomy photos, near-earth objects, Mars rover data.',
    endpoints: [
      { method: 'GET', path: '/planetary/apod', desc: 'Astronomy picture of the day', params: [{ name: 'count', example: '1' }] },
      { method: 'GET', path: '/neo/rest/v1/feed', desc: 'Near Earth Objects', params: [{ name: 'start_date', example: '2024-01-01' }] },
    ]
  },

  // ── DEV ─────────────────────────────────────────────────────────────────
  {
    slug: 'github', name: 'GitHub API', cat: 'dev', price: 'Free',
    desc: 'Access GitHub repositories, users, issues, and pull requests.',
    endpoints: [
      { method: 'GET', path: '/users/torvalds', desc: 'User profile', params: [] },
      { method: 'GET', path: '/repos/facebook/react', desc: 'Repository info', params: [] },
      { method: 'GET', path: '/search/repositories', desc: 'Search repos', params: [{ name: 'q', example: 'language:python' }] },
    ]
  },
  {
    slug: 'jokeapi', name: 'JokeAPI', cat: 'dev', price: 'Free',
    desc: 'Programming jokes, puns, and general humor for your apps.',
    endpoints: [
      { method: 'GET', path: '/joke/Programming', desc: 'Programming joke', params: [{ name: 'type', example: 'single' }] },
      { method: 'GET', path: '/joke/Any', desc: 'Any joke', params: [] },
    ]
  },
  {
    slug: 'dictionary', name: 'Dictionary API', cat: 'dev', price: 'Free',
    desc: 'English word definitions, phonetics, synonyms, antonyms, and examples.',
    endpoints: [
      { method: 'GET', path: '/entries/en/developer', desc: 'Word definition', params: [] },
    ]
  },
  {
    slug: 'dummyjson', name: 'DummyJSON', cat: 'dev', price: 'Free',
    desc: 'Fake JSON data for prototyping — products, users, posts, todos.',
    endpoints: [
      { method: 'GET', path: '/products', desc: 'List products', params: [{ name: 'limit', example: '5' }] },
      { method: 'GET', path: '/users', desc: 'List users', params: [] },
    ]
  },

  // ── GEO ─────────────────────────────────────────────────────────────────
  {
    slug: 'openmeteo', name: 'Open Meteo', cat: 'geo', price: 'Free',
    desc: 'Free weather API with hourly forecasts. No key required.',
    endpoints: [
      { method: 'GET', path: '/forecast', desc: 'Weather forecast', params: [{ name: 'latitude', example: '1.28' }, { name: 'longitude', example: '36.82' }, { name: 'current_weather', example: 'true' }] },
    ]
  },
  {
    slug: 'nominatim', name: 'Nominatim Geocoding', cat: 'geo', price: 'Free',
    desc: 'Convert addresses to coordinates (geocoding) and reverse.',
    endpoints: [
      { method: 'GET', path: '/search', desc: 'Geocode address', params: [{ name: 'q', example: 'Nairobi' }, { name: 'format', example: 'json' }] },
      { method: 'GET', path: '/reverse', desc: 'Reverse geocode', params: [{ name: 'lat', example: '1.28' }, { name: 'lon', example: '36.82' }, { name: 'format', example: 'json' }] },
    ]
  },

  // ── FINANCE ──────────────────────────────────────────────────────────────
  {
    slug: 'frankfurter', name: 'Frankfurter Forex', cat: 'finance', price: 'Free',
    desc: 'European Central Bank forex rates. Historical data available.',
    endpoints: [
      { method: 'GET', path: '/latest', desc: 'Latest rates', params: [{ name: 'from', example: 'USD' }, { name: 'to', example: 'KES,EUR,GBP' }] },
      { method: 'GET', path: '/2024-01-01', desc: 'Historical rates', params: [] },
    ]
  },
  {
    slug: 'coingecko', name: 'CoinGecko', cat: 'finance', price: 'Free',
    desc: 'Crypto market data — prices, market cap, volume for 10,000+ coins.',
    endpoints: [
      { method: 'GET', path: '/coins/markets', desc: 'Top coins', params: [{ name: 'vs_currency', example: 'usd' }, { name: 'per_page', example: '10' }] },
      { method: 'GET', path: '/simple/price', desc: 'Simple price', params: [{ name: 'ids', example: 'bitcoin,ethereum' }, { name: 'vs_currencies', example: 'usd' }] },
    ]
  },

  // ── HEALTH ───────────────────────────────────────────────────────────────
  {
    slug: 'openfda', name: 'Open FDA', cat: 'health', price: 'Free',
    desc: 'FDA drug labels, adverse events, and medical device data.',
    endpoints: [
      { method: 'GET', path: '/drug/label.json', desc: 'Drug labels', params: [{ name: 'search', example: 'aspirin' }, { name: 'limit', example: '5' }] },
    ]
  },

  // ── MEDIA ────────────────────────────────────────────────────────────────
  {
    slug: 'itunesearch', name: 'iTunes Search', cat: 'media', price: 'Free',
    desc: 'Search Apple\'s iTunes catalog — music, podcasts, apps, movies.',
    endpoints: [
      { method: 'GET', path: '/search', desc: 'Search iTunes', params: [{ name: 'term', example: 'drake' }, { name: 'media', example: 'music' }, { name: 'limit', example: '5' }] },
    ]
  },
]

const CAT_COLOR = {
  ai:      'bg-purple-50 text-purple-700',
  data:    'bg-amber-50 text-amber-700',
  dev:     'bg-orange-50 text-orange-700',
  finance: 'bg-emerald-50 text-emerald-700',
  geo:     'bg-teal-50 text-teal-700',
  health:  'bg-rose-50 text-rose-700',
  media:   'bg-pink-50 text-pink-700',
  comms:   'bg-blue-50 text-blue-700',
  payments:'bg-green-50 text-green-700',
}

function buildSnippet(slug, endpoint, lang = 'js') {
  const path = endpoint.path
  const params = endpoint.params?.length
    ? '?' + endpoint.params.map(p => `${p.name}=${p.example}`).join('&')
    : ''
  const isPost = endpoint.method === 'POST'
  const bodyStr = endpoint.body ? JSON.stringify(endpoint.body, null, 2) : null

  if (lang === 'js') {
    if (isPost) return `const res = await fetch('${BASE_URL}/proxy/${slug}${path}', {
  method: 'POST',
  headers: {
    'x-vault-key': 'YOUR_VAULT_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(${bodyStr})
})
const data = await res.json()`
    return `const res = await fetch('${BASE_URL}/proxy/${slug}${path}${params}', {
  headers: { 'x-vault-key': 'YOUR_VAULT_KEY' }
})
const data = await res.json()`
  }

  if (lang === 'python') {
    if (isPost) return `import requests
res = requests.post('${BASE_URL}/proxy/${slug}${path}',
  headers={
    'x-vault-key': 'YOUR_VAULT_KEY',
    'Content-Type': 'application/json'
  },
  json=${bodyStr})
data = res.json()`
    return `import requests
res = requests.get('${BASE_URL}/proxy/${slug}${path}${params}',
  headers={'x-vault-key': 'YOUR_VAULT_KEY'})
data = res.json()`
  }

  if (isPost) return `curl -X POST '${BASE_URL}/proxy/${slug}${path}' \\
  -H 'x-vault-key: YOUR_VAULT_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(endpoint.body)}'`

  return `curl '${BASE_URL}/proxy/${slug}${path}${params}' \\
  -H 'x-vault-key: YOUR_VAULT_KEY'`
}

function CopyBtn({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000) }}
      className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
      {done ? '✓ Copied' : 'Copy'}
    </button>
  )
}

export function DocsPage() {
  const nav = useNavigate()
  const [sel, setSel]   = useState('claude')
  const [lang, setLang] = useState('js')
  const [search, setSearch] = useState('')

  const filtered = DOCS.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.cat.toLowerCase().includes(search.toLowerCase())
  )

  const api = DOCS.find(d => d.slug === sel) || DOCS[0]

  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <div className="border-b border-gray-100 sticky top-0 z-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => nav('/')}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <div className="w-5 h-5 rounded bg-gray-900 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <span className="font-bold text-sm">APIvault</span>
            <span className="text-xs text-gray-400 ml-1">docs</span>
          </button>
          <div className="flex items-center gap-3">
            <a href="https://apivault.uk" className="text-xs text-gray-500 hover:text-gray-900">Home</a>
            <button onClick={() => nav('/login')}
              className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
              Get started
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8">

        {/* Sidebar */}
        <div className="w-56 flex-shrink-0">
          {/* Quick start */}
          <div className="mb-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick start</div>
            <div className="space-y-1">
              {['Authentication', 'Base URL', 'Credits & Billing'].map(item => (
                <div key={item} className="text-sm text-gray-500 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Search APIs */}
          <div className="mb-3">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search APIs..."
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-300" />
          </div>

          {/* API list grouped by category */}
          {['ai', 'data', 'dev', 'finance', 'geo', 'health', 'media'].map(cat => {
            const catApis = filtered.filter(d => d.cat === cat)
            if (!catApis.length) return null
            return (
              <div key={cat} className="mb-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 px-2 capitalize">{cat}</div>
                {catApis.map(d => (
                  <button key={d.slug} onClick={() => setSel(d.slug)}
                    className={`w-full text-left px-2 py-1.5 text-sm rounded-lg transition-colors ${
                      sel === d.slug ? 'bg-gray-900 text-white font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}>
                    {d.name}
                  </button>
                ))}
              </div>
            )
          })}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">

          {/* Quick start section */}
          <div className="mb-10 pb-10 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">APIvault Documentation</h1>
            <p className="text-gray-500 mb-6">One vault key for every API. Pay per call via M-Pesa or card.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { title: 'Base URL', value: BASE_URL, mono: true },
                { title: 'Auth header', value: 'x-vault-key: YOUR_VAULT_KEY', mono: true },
                { title: 'Live APIs', value: `${DOCS.length} APIs documented`, mono: false },
              ].map(s => (
                <div key={s.title} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div className="text-xs text-gray-400 mb-1">{s.title}</div>
                  <div className={`text-sm font-medium text-gray-900 break-all ${s.mono ? 'font-mono' : ''}`}>{s.value}</div>
                </div>
              ))}
            </div>

            <div className="bg-gray-950 rounded-xl p-4 overflow-x-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Quick start — any API in 3 lines</span>
                <CopyBtn text={`const res = await fetch('${BASE_URL}/proxy/exchangerates/latest/USD', {\n  headers: { 'x-vault-key': 'YOUR_VAULT_KEY' }\n})\nconst data = await res.json()`} />
              </div>
              <pre className="text-xs text-gray-300 font-mono leading-relaxed">{`const res = await fetch('${BASE_URL}/proxy/exchangerates/latest/USD', {
  headers: { 'x-vault-key': 'YOUR_VAULT_KEY' }
})
const data = await res.json()
// → { base: 'USD', rates: { KES: 129.5, EUR: 0.92, ... } }`}</pre>
            </div>
          </div>

          {/* Selected API docs */}
          {api && (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-gray-900">{api.name}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${CAT_COLOR[api.cat] || 'bg-gray-100 text-gray-500'}`}>
                      {api.cat}
                    </span>
                    <span className="text-xs font-mono text-gray-500">{api.price}/call</span>
                  </div>
                  <p className="text-gray-500 text-sm">{api.desc}</p>
                </div>
              </div>

              {/* Base path */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-6">
                <div className="text-xs text-gray-400 mb-1">Base path</div>
                <code className="font-mono text-sm text-gray-700">{BASE_URL}/proxy/{api.slug}</code>
              </div>

              {/* Lang tabs */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-6">
                {[['js', 'JavaScript'], ['python', 'Python'], ['curl', 'cURL']].map(([id, lbl]) => (
                  <button key={id} onClick={() => setLang(id)}
                    className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                      lang === id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {lbl}
                  </button>
                ))}
              </div>

              {/* Endpoints */}
              <div className="space-y-5">
                {api.endpoints.map((ep, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                        ep.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>{ep.method}</span>
                      <code className="font-mono text-sm text-gray-800">/proxy/{api.slug}{ep.path}</code>
                      <span className="text-xs text-gray-400">{ep.desc}</span>
                    </div>

                    {ep.params?.length > 0 && (
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="text-xs font-semibold text-gray-400 mb-2">Parameters</div>
                        <div className="space-y-1.5">
                          {ep.params.map(p => (
                            <div key={p.name} className="flex items-center gap-3 text-xs">
                              <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{p.name}</code>
                              <span className="text-gray-400">example: <span className="font-mono text-gray-600">{p.example}</span></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {ep.body && (
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="text-xs font-semibold text-gray-400 mb-2">Request body</div>
                        <pre className="text-xs font-mono text-gray-600 bg-gray-50 rounded-lg p-3 overflow-x-auto">
                          {JSON.stringify(ep.body, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-400">Code example</span>
                        <CopyBtn text={buildSnippet(api.slug, ep, lang)} />
                      </div>
                      <div className="bg-gray-950 rounded-xl p-4 overflow-x-auto">
                        <pre className="text-xs text-gray-300 font-mono leading-relaxed whitespace-pre">
                          {buildSnippet(api.slug, ep, lang)}
                        </pre>
                      </div>
                    </div>

                    {ep.response && (
                      <div className="px-4 pb-4">
                        <div className="text-xs font-semibold text-gray-400 mb-2">Example response</div>
                        <pre className="text-xs font-mono text-gray-600 bg-green-50 border border-green-100 rounded-xl p-3 overflow-x-auto">
                          {JSON.stringify(ep.response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Sign up CTA */}
              <div className="mt-8 p-5 bg-gray-900 rounded-2xl text-center">
                <div className="text-white font-bold mb-1">Ready to use {api.name}?</div>
                <div className="text-gray-400 text-sm mb-4">Sign up free — no credit card needed for free APIs</div>
                <button onClick={() => nav('/login?mode=signup')}
                  className="bg-[#34d399] text-gray-900 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#6ee7b7] transition-colors">
                  Get your vault key →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}