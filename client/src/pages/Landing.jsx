// client/src/pages/Landing.jsx
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const BASE = 'https://apivault-production-736c.up.railway.app'

// ─── Use cases ────────────────────────────────────────────────────────────

const USE_CASES = [
  {
    icon: '🏦',
    title: 'Fintech app',
    problem: 'You\'re building a mobile banking app and need live exchange rates, SMS alerts, and news updates.',
    without: '3 accounts. 3 API keys. 3 different auth methods. 3 monthly bills.',
    with: 'One vault key. Call Exchange Rates, Twilio SMS, and NewsAPI from the same header.',
    apis: ['Exchange Rates', 'Twilio SMS', 'NewsAPI'],
  },
  {
    icon: '🚚',
    title: 'Logistics platform',
    problem: 'Your delivery app needs weather forecasts, country data, and IP-based location detection.',
    without: 'OpenWeather wants a credit card. REST Countries needs registration. ipapi has rate limits.',
    with: 'One signup. One key. All three APIs work immediately — some completely free.',
    apis: ['OpenWeather', 'REST Countries', 'IP Geolocation'],
  },
  {
    icon: '📱',
    title: 'Developer tool / chatbot',
    problem: 'You\'re building a developer productivity tool that needs jokes, definitions, and GitHub data.',
    without: 'Three separate integrations, each with their own docs, rate limits, and quirks.',
    with: 'Same endpoint pattern for every API. Learn once, call anything.',
    apis: ['JokeAPI', 'Dictionary API', 'GitHub API'],
  },
]

const LIVE_DEMOS = [
  {
    id: 'exchange',
    title: 'Live exchange rate',
    desc: 'KES to USD right now',
    endpoint: '/proxy/exchangerates/latest/KES',
    render: (d) => {
      const usd = d?.rates?.USD?.toFixed(4)
      const eur = d?.rates?.EUR?.toFixed(4)
      return usd ? `1 KES = $${usd} USD · €${eur} EUR` : null
    },
  },
  {
    id: 'joke',
    title: 'Programming joke',
    desc: 'From JokeAPI',
    endpoint: '/proxy/jokeapi/joke/Programming?type=single',
    render: (d) => d?.joke || null,
  },
  {
    id: 'kenya',
    title: 'Country data',
    desc: 'Kenya from REST Countries',
    endpoint: '/proxy/restcountries/name/kenya',
    render: (d) => {
      const k = Array.isArray(d) ? d[0] : d
      return k?.name?.common ? `${k.flag} ${k.name.common} · Pop: ${(k.population/1e6).toFixed(1)}M · Capital: ${k.capital?.[0]}` : null
    },
  },
]

const APIS = [
  { name: 'Exchange Rates', cat: 'data',     price: 'free',    live: true  },
  { name: 'REST Countries', cat: 'data',     price: 'free',    live: true  },
  { name: 'IP Geolocation', cat: 'data',     price: 'free',    live: true  },
  { name: 'OpenWeather',    cat: 'data',     price: 'free',    live: true  },
  { name: 'NewsAPI',        cat: 'data',     price: '$0.002',  live: true  },
  { name: 'GitHub API',     cat: 'dev',      price: 'free',    live: true  },
  { name: 'Dictionary API', cat: 'dev',      price: 'free',    live: true  },
  { name: 'JokeAPI',        cat: 'dev',      price: 'free',    live: true  },
  { name: 'GPT-4o',         cat: 'ai',       price: '$0.008',  live: false },
  { name: 'Grok Image',     cat: 'ai',       price: '$0.120',  live: false },
  { name: 'HeyGen Video',   cat: 'ai',       price: '$0.600',  live: false },
  { name: 'Stripe',         cat: 'payments', price: 'free',    live: false },
  { name: 'M-Pesa',         cat: 'payments', price: 'free',    live: false },
  { name: 'Twilio SMS',     cat: 'comms',    price: '$0.009',  live: false },
]

const CAT_COLORS = {
  ai:       { bg: '#f3e8ff', text: '#7c3aed' },
  data:     { bg: '#fef3c7', text: '#92400e' },
  dev:      { bg: '#ffedd5', text: '#9a3412' },
  payments: { bg: '#d1fae5', text: '#065f46' },
  comms:    { bg: '#dbeafe', text: '#1e40af' },
}


// ─── Interactive Demo ─────────────────────────────────────────────────────

const DEMO_STEPS = [
  {
    id: 1,
    title: 'Create your account',
    desc: "Go to APIvault and sign up with your email. Admin approves your account — usually within minutes.",
    visual: 'signup',
    code: null,
    action: null,
  },
  {
    id: 2,
    title: 'Get your vault key',
    desc: "After approval, go to Billing → click Reveal & copy. This single key works for every API.",
    visual: 'key',
    code: `// Your vault key — one key for every API
const VAULT_KEY = 'sk-vault-a27907ec-94cd-47f9-8b8f-458120a11154'
const BASE = 'https://apivault-production-736c.up.railway.app'`,
    action: null,
  },
  {
    id: 3,
    title: 'Call your first API',
    desc: "Let's fetch live news headlines from Kenya. Click Run to make a real API call right now.",
    visual: 'call',
    code: `// Fetch Kenyan news headlines
const res = await fetch(BASE + '/proxy/newsapi/top-headlines?country=ke&pageSize=3', {
  headers: { 'x-vault-key': VAULT_KEY }
})
const { articles } = await res.json()
console.log(articles)`,
    action: {
      label: 'Run — fetch Kenya news',
      endpoint: '/proxy/newsapi/top-headlines?country=us&pageSize=3',
      render: (d) => d?.articles?.slice(0, 3).map(a => ({
        title: a.title,
        source: a.source?.name,
      })),
    },
  },
  {
    id: 4,
    title: 'Add exchange rates',
    desc: "Same vault key, different API. Get live KES exchange rates — no new account needed.",
    visual: 'call',
    code: `// Same key — different API
const res = await fetch(BASE + '/proxy/exchangerates/latest/KES', {
  headers: { 'x-vault-key': VAULT_KEY }  // same key!
})
const { rates } = await res.json()
console.log('1 KES =', rates.USD, 'USD')`,
    action: {
      label: 'Run — get KES rates',
      endpoint: '/proxy/exchangerates/latest/KES',
      render: (d) => d?.rates ? [
        { title: `1 KES = ${d.rates.USD?.toFixed(5)} USD`, source: 'Exchange Rates API' },
        { title: `1 KES = ${d.rates.EUR?.toFixed(5)} EUR`, source: 'Exchange Rates API' },
        { title: `1 KES = ${d.rates.GBP?.toFixed(5)} GBP`, source: 'Exchange Rates API' },
      ] : null,
    },
  },
  {
    id: 5,
    title: 'Add country data',
    desc: "Third API. Still the same key. You're now calling 3 different APIs with one integration.",
    visual: 'call',
    code: `// Third API — still the same key
const res = await fetch(BASE + '/proxy/restcountries/name/kenya', {
  headers: { 'x-vault-key': VAULT_KEY }  // same key!
})
const [kenya] = await res.json()
console.log(kenya.name.common, kenya.population)`,
    action: {
      label: 'Run — get Kenya data',
      endpoint: '/proxy/restcountries/name/kenya',
      render: (d) => {
        const k = Array.isArray(d) ? d[0] : d
        return k ? [
          { title: `${k.flag} ${k.name?.common} — ${k.name?.official}`, source: 'REST Countries' },
          { title: `Population: ${(k.population/1e6).toFixed(1)}M people`, source: 'REST Countries' },
          { title: `Capital: ${k.capital?.[0]} · Currency: KES`, source: 'REST Countries' },
        ] : null
      },
    },
  },
  {
    id: 6,
    title: 'You built a dashboard',
    desc: "Three APIs. One key. One billing account. That's APIvault — sign up to start building yours.",
    visual: 'done',
    code: `// Your complete Kenyan dashboard — 3 APIs, 1 key
const VAULT_KEY = 'sk-vault-your-key-here'
const BASE = 'https://apivault-production-736c.up.railway.app'
const H = { 'x-vault-key': VAULT_KEY }

const [news, rates, country] = await Promise.all([
  fetch(BASE + '/proxy/newsapi/top-headlines?country=ke', { headers: H }).then(r => r.json()),
  fetch(BASE + '/proxy/exchangerates/latest/KES', { headers: H }).then(r => r.json()),
  fetch(BASE + '/proxy/restcountries/name/kenya', { headers: H }).then(r => r.json()),
])

// Build your dashboard with news, rates, and country data
console.log({ news, rates, country })`,
    action: null,
  },
]

function SignupVisual() {
  return (
    <div className="bg-white rounded-xl p-5 border border-white/10 shadow-2xl">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-4 h-4 bg-gray-900 rounded flex items-center justify-center">
          <div className="w-1 h-1 bg-white rounded-full" />
        </div>
        <span className="text-gray-900 text-xs font-bold">APIvault — Create account</span>
      </div>
      <div className="space-y-2.5">
        <div>
          <div className="text-xs text-gray-500 mb-1">Email</div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400 font-mono">you@company.com</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Password</div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400">••••••••••</div>
        </div>
        <div className="bg-gray-900 rounded-lg py-2.5 text-center text-xs text-white font-semibold">Create account</div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg p-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
          <span className="text-xs text-green-700">Account created — pending admin approval</span>
        </div>
      </div>
    </div>
  )
}

function KeyVisual() {
  return (
    <div className="bg-white rounded-xl p-5 border border-white/10 shadow-2xl">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-4 h-4 bg-gray-900 rounded flex items-center justify-center">
          <div className="w-1 h-1 bg-white rounded-full" />
        </div>
        <span className="text-gray-900 text-xs font-bold">APIvault — Billing</span>
      </div>
      <div className="space-y-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Available credits</div>
          <div className="text-2xl font-bold text-gray-900">$5.00</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1.5">Your vault key</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 font-mono text-xs text-gray-600 truncate">
              sk-vault-a27907ec-94cd-47f9...
            </div>
            <div className="bg-gray-900 text-white text-xs px-2.5 py-2 rounded-lg font-medium whitespace-nowrap">
              ✓ Copied
            </div>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 text-xs text-amber-700">
          🔒 Keep this key secret
        </div>
      </div>
    </div>
  )
}

function DoneVisual({ results }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-white/10 shadow-2xl">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-4 h-4 bg-gray-900 rounded flex items-center justify-center">
          <div className="w-1 h-1 bg-white rounded-full" />
        </div>
        <span className="text-gray-900 text-xs font-bold">Your Kenya Dashboard</span>
        <span className="ml-auto text-xs text-green-600 font-medium">● Live</span>
      </div>
      <div className="space-y-2">
        {[
          { label: '📰 News', value: 'Top headlines loaded', color: 'bg-blue-50 text-blue-700' },
          { label: '💱 Rates', value: '1 KES = 0.00775 USD', color: 'bg-amber-50 text-amber-700' },
          { label: '🇰🇪 Country', value: 'Kenya · Pop: 53.3M', color: 'bg-green-50 text-green-700' },
        ].map(r => (
          <div key={r.label} className={`flex items-center justify-between px-3 py-2 rounded-lg ${r.color}`}>
            <span className="text-xs font-medium">{r.label}</span>
            <span className="text-xs">{r.value}</span>
          </div>
        ))}
        <div className="pt-1 text-center text-xs text-gray-400">
          3 APIs · 1 vault key · 1 integration
        </div>
      </div>
    </div>
  )
}

function InteractiveDemo() {
  const [step, setStep]       = useState(1)
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState({})
  const [ran, setRan]         = useState({})
  const nav = useNavigate()

  const current = DEMO_STEPS.find(s => s.id === step)

  async function runStep(s) {
    if (!s.action) return
    setLoading(l => ({ ...l, [s.id]: true }))
    try {
      const res  = await fetch(`${BASE}${s.action.endpoint}`, {
        headers: { 'x-vault-key': 'a27907ec-94cd-47f9-8b8f-458120a11154' }
      })
      const data = await res.json()
      const rendered = s.action.render(data)
      setResults(r => ({ ...r, [s.id]: rendered }))
      setRan(r => ({ ...r, [s.id]: true }))
    } catch (e) {
      setResults(r => ({ ...r, [s.id]: [{ title: 'Error: ' + e.message, source: '' }] }))
    }
    setLoading(l => ({ ...l, [s.id]: false }))
  }

  return (
    <section id="walkthrough" className="py-20 px-6 max-w-6xl mx-auto border-t border-white/5">
      <div className="mono text-xs text-white/30 mb-2">// interactive walkthrough</div>
      <h2 className="text-3xl font-bold mb-2">Build a live dashboard in 5 minutes</h2>
      <p className="text-white/40 mb-10 max-w-xl">
        Follow these steps. Every "Run" button makes a real API call — you're seeing live data, not a demo.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Step sidebar */}
        <div className="lg:col-span-2">
          <div className="space-y-2 sticky top-20">
            {DEMO_STEPS.map(s => (
              <button key={s.id} onClick={() => setStep(s.id)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
                  step === s.id
                    ? 'border-[#34d399]/40 bg-[#34d399]/8'
                    : ran[s.id]
                    ? 'border-green-500/20 bg-green-500/5'
                    : 'border-white/5 hover:border-white/15'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    ran[s.id]
                      ? 'bg-green-500 text-white'
                      : step === s.id
                      ? 'bg-[#34d399] text-[#080808]'
                      : 'bg-white/8 text-white/30'
                  }`}>
                    {ran[s.id] ? '✓' : s.id}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-sm font-medium truncate ${step === s.id ? 'text-white' : 'text-white/50'}`}>
                      {s.title}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            <button onClick={() => nav('/login')}
              className="w-full mt-4 py-3 bg-[#34d399] text-[#080808] rounded-xl font-bold text-sm hover:bg-[#6ee7b7] transition-colors">
              Start building free →
            </button>
          </div>
        </div>

        {/* Step content */}
        <div className="lg:col-span-3">
          <div className="border border-white/8 rounded-2xl overflow-hidden">

            {/* Step header */}
            <div className="px-5 py-4 border-b border-white/5 bg-white/2">
              <div className="mono text-xs text-white/30 mb-1">Step {current.id} of {DEMO_STEPS.length}</div>
              <div className="font-bold text-lg">{current.title}</div>
              <div className="text-sm text-white/50 mt-1">{current.desc}</div>
            </div>

            {/* Visual */}
            <div className="px-5 py-5 border-b border-white/5 bg-[#0d0d0d]">
              {current.visual === 'signup' && <SignupVisual />}
              {current.visual === 'key'    && <KeyVisual />}
              {current.visual === 'done'   && <DoneVisual />}
              {current.visual === 'call'   && (
                <div className="space-y-3">
                  {/* Run button */}
                  {current.action && (
                    <button onClick={() => runStep(current)}
                      disabled={loading[current.id]}
                      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-xs rounded-lg
                        hover:bg-indigo-700 disabled:opacity-50 transition-colors font-semibold">
                      {loading[current.id]
                        ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Calling API...</span></>
                        : <><span>▶</span><span>{current.action.label}</span></>
                      }
                    </button>
                  )}

                  {/* Results */}
                  {results[current.id] && (
                    <div className="bg-green-950/40 border border-green-500/20 rounded-xl p-4">
                      <div className="mono text-xs text-green-400 font-semibold mb-3">✓ Live response from API</div>
                      <div className="space-y-2">
                        {results[current.id].map((r, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 mt-1.5" />
                            <div>
                              <div className="text-sm text-white/80 leading-snug">{r.title}</div>
                              {r.source && <div className="mono text-xs text-white/25 mt-0.5">{r.source}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!results[current.id] && !loading[current.id] && current.action && (
                    <div className="border border-white/5 rounded-xl p-4 text-center">
                      <div className="text-xs text-white/25">Click "Run" to see live data</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Code */}
            {current.code && (
              <div className="border-b border-white/5">
                <div className="px-5 py-3 bg-white/2 flex items-center justify-between">
                  <div className="mono text-xs text-white/30">code</div>
                  <CopyDemoBtn text={current.code} />
                </div>
                <div className="overflow-x-auto">
                  <pre className="mono text-xs p-5 text-white/60 leading-relaxed">{current.code}</pre>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="px-5 py-4 flex items-center justify-between bg-white/2">
              <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}
                className="px-4 py-2 border border-white/10 text-white/40 text-xs rounded-lg
                  hover:border-white/30 hover:text-white/70 disabled:opacity-30 transition-all">
                ← Previous
              </button>

              <div className="flex gap-1.5">
                {DEMO_STEPS.map(s => (
                  <button key={s.id} onClick={() => setStep(s.id)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      step === s.id ? 'bg-[#34d399] w-5' : ran[s.id] ? 'bg-green-500/50' : 'bg-white/15'
                    }`} />
                ))}
              </div>

              {step < DEMO_STEPS.length ? (
                <button onClick={() => {
                  if (current.action && !ran[current.id]) runStep(current)
                  else setStep(step + 1)
                }}
                  className="px-4 py-2 bg-[#34d399] text-[#080808] text-xs rounded-lg font-semibold
                    hover:bg-[#6ee7b7] transition-colors">
                  {current.action && !ran[current.id] ? 'Run & next →' : 'Next →'}
                </button>
              ) : (
                <button onClick={() => nav('/login')}
                  className="px-4 py-2 bg-[#34d399] text-[#080808] text-xs rounded-lg font-semibold
                    hover:bg-[#6ee7b7] transition-colors">
                  Start building →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CopyDemoBtn({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000) }}
      className="mono text-xs px-2.5 py-1 border border-white/10 text-white/30 rounded-lg hover:text-white/60 hover:border-white/20 transition-colors">
      {done ? '✓ Copied' : 'Copy'}
    </button>
  )
}


// ─── Component ────────────────────────────────────────────────────────────

export function Landing() {
  const nav = useNavigate()
  const [demoResults, setDemoResults] = useState({})
  const [loading, setLoading]         = useState({})
  const [caseIdx, setCaseIdx]         = useState(0)
  const [codeTab, setCodeTab]         = useState('js')

  // Redirect if logged in
  useEffect(() => {
    const token = localStorage.getItem('token')
    const role  = localStorage.getItem('role')
    if (token) nav(role === 'admin' ? '/admin' : '/app')
  }, [])

  // Auto-run demos on mount
  useEffect(() => {
    LIVE_DEMOS.forEach(d => runDemo(d))
  }, [])

  async function runDemo(demo) {
    setLoading(l => ({ ...l, [demo.id]: true }))
    try {
      const res  = await fetch(`${BASE}${demo.endpoint}`, {
        headers: { 'x-vault-key': 'a27907ec-94cd-47f9-8b8f-458120a11154' }
      })
      const data = await res.json()
      setDemoResults(r => ({ ...r, [demo.id]: demo.render(data) }))
    } catch { setDemoResults(r => ({ ...r, [demo.id]: 'Failed to load' })) }
    setLoading(l => ({ ...l, [demo.id]: false }))
  }

  const CODE = {
    js: `// Same pattern for every API
const VAULT_KEY = 'sk-vault-your-key-here'

// Exchange rates
const rates = await fetch(
  'https://apivault.app/proxy/exchangerates/latest/KES',
  { headers: { 'x-vault-key': VAULT_KEY } }
).then(r => r.json())

// News headlines
const news = await fetch(
  'https://apivault.app/proxy/newsapi/top-headlines?country=ke',
  { headers: { 'x-vault-key': VAULT_KEY } }
).then(r => r.json())

// Country data
const kenya = await fetch(
  'https://apivault.app/proxy/restcountries/name/kenya',
  { headers: { 'x-vault-key': VAULT_KEY } }
).then(r => r.json())`,

    python: `# Same pattern for every API
import requests

VAULT_KEY = 'sk-vault-your-key-here'
HEADERS = {'x-vault-key': VAULT_KEY}

# Exchange rates
rates = requests.get(
    'https://apivault.app/proxy/exchangerates/latest/KES',
    headers=HEADERS
).json()

# News headlines
news = requests.get(
    'https://apivault.app/proxy/newsapi/top-headlines?country=ke',
    headers=HEADERS
).json()

# Country data
kenya = requests.get(
    'https://apivault.app/proxy/restcountries/name/kenya',
    headers=HEADERS
).json()`,

    curl: `# Same pattern for every API
VAULT_KEY="sk-vault-your-key-here"

# Exchange rates
curl 'https://apivault.app/proxy/exchangerates/latest/KES' \\
  -H "x-vault-key: $VAULT_KEY"

# News headlines
curl 'https://apivault.app/proxy/newsapi/top-headlines?country=ke' \\
  -H "x-vault-key: $VAULT_KEY"

# Country data
curl 'https://apivault.app/proxy/restcountries/name/kenya' \\
  -H "x-vault-key: $VAULT_KEY"`,
  }

  const uc = USE_CASES[caseIdx]

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden"
      style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .mono { font-family: 'IBM Plex Mono', monospace; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-green { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .fade-up { animation: fadeUp 0.5s ease forwards; opacity:0; }
        .d1{animation-delay:.05s} .d2{animation-delay:.15s} .d3{animation-delay:.25s}
        .d4{animation-delay:.35s} .d5{animation-delay:.5s}
        .grid-bg { background-image: linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px); background-size:48px 48px; }
        .glow-green { box-shadow: 0 0 32px rgba(52,211,153,0.2); }
        .case-btn { transition: all 0.2s; }
        .case-btn.active { background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.4); }
        pre { white-space: pre; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      {/* ── Nav ── */}
      <nav className="border-b border-white/5 px-6 h-14 flex items-center justify-between sticky top-0 z-50 bg-[#080808]/90 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-[#34d399] rounded-md flex items-center justify-center flex-shrink-0">
            <div className="w-2 h-2 bg-[#080808] rounded-sm" />
          </div>
          <span className="font-bold tracking-tight">APIvault</span>
          <span className="mono text-[10px] text-white/25 border border-white/10 px-1.5 py-0.5 rounded ml-1">beta</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => document.getElementById('walkthrough').scrollIntoView({ behavior: 'smooth' })}
            className="text-xs text-white/40 hover:text-white/70 transition-colors hidden sm:block">
            Demo
          </button>
          <button onClick={() => document.getElementById('how').scrollIntoView({ behavior: 'smooth' })}
            className="text-xs text-white/40 hover:text-white/70 transition-colors hidden sm:block">
            How it works
          </button>
          <button onClick={() => document.getElementById('apis').scrollIntoView({ behavior: 'smooth' })}
            className="text-xs text-white/40 hover:text-white/70 transition-colors hidden sm:block">
            APIs
          </button>
          <button onClick={() => nav('/login')}
            className="text-xs text-white/50 hover:text-white transition-colors">
            Sign in
          </button>
          <button onClick={() => nav('/login')}
            className="text-xs bg-[#34d399] text-[#080808] px-4 py-2 rounded-lg font-semibold hover:bg-[#6ee7b7] transition-colors">
            Get started →
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="grid-bg pt-20 pb-16 px-6 max-w-6xl mx-auto">
        <div className="fade-up d1 flex items-center gap-2 mb-6 w-fit border border-[#34d399]/30 bg-[#34d399]/8 rounded-full px-3 py-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#34d399]" style={{ animation: 'pulse-green 2s infinite' }} />
          <span className="mono text-xs text-[#34d399]">{APIS.filter(a => a.live).length} APIs live and ready</span>
        </div>

        <h1 className="fade-up d2 text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6 max-w-4xl">
          Stop managing<br />
          <span className="text-[#34d399]">dozens of API keys.</span>
        </h1>

        <p className="fade-up d3 text-white/50 text-xl max-w-2xl leading-relaxed mb-4">
          APIvault gives you <strong className="text-white/80">one vault key</strong> that works for every API.
          No more juggling accounts, billing setups, and auth methods.
          Just build.
        </p>

        <div className="fade-up d3 mb-10">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
            <span className="text-white/40 text-sm line-through">exchange-rates-api.com → account + key</span>
          </div>
          <br />
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 mt-1">
            <span className="text-white/40 text-sm line-through">newsapi.org → account + key</span>
          </div>
          <br />
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 mt-1">
            <span className="text-white/40 text-sm line-through">openweathermap.org → account + key</span>
          </div>
          <br />
          <div className="inline-flex items-center gap-2 bg-[#34d399]/10 border border-[#34d399]/30 rounded-xl px-4 py-2 mt-2">
            <span className="text-[#34d399] text-sm font-semibold">APIvault → one key for all of them ✓</span>
          </div>
        </div>

        <div className="fade-up d4 flex flex-wrap gap-3">
          <button onClick={() => nav('/login')}
            className="bg-[#34d399] text-[#080808] px-6 py-3 rounded-xl font-bold hover:bg-[#6ee7b7] transition-all text-sm glow-green">
            Start free — no card needed →
          </button>
          <button onClick={() => document.getElementById('demo').scrollIntoView({ behavior: 'smooth' })}
            className="border border-white/15 text-white/60 px-6 py-3 rounded-xl font-medium hover:border-white/30 hover:text-white transition-all text-sm">
            See live demo ↓
          </button>
        </div>
      </section>

      {/* ── Use cases ── */}
      <section id="how" className="py-20 px-6 max-w-6xl mx-auto border-t border-white/5">
        <div className="mono text-xs text-white/30 mb-2">// real examples</div>
        <h2 className="text-3xl font-bold mb-3">Who uses APIvault?</h2>
        <p className="text-white/40 mb-10 max-w-xl">
          Any developer who needs more than one API. Here are three common scenarios — pick the one that sounds like you.
        </p>

        {/* Case selector */}
        <div className="flex flex-wrap gap-2 mb-8">
          {USE_CASES.map((uc, i) => (
            <button key={i} onClick={() => setCaseIdx(i)}
              className={`case-btn flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all
                ${caseIdx === i ? 'active' : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'}`}>
              <span>{uc.icon}</span>
              <span>{uc.title}</span>
            </button>
          ))}
        </div>

        {/* Active case */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Problem */}
          <div className="border border-white/8 rounded-2xl p-6">
            <div className="mono text-xs text-white/30 mb-3">// the problem</div>
            <p className="text-white/70 text-base leading-relaxed mb-5">{uc.problem}</p>
            <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-4">
              <div className="text-xs font-semibold text-red-400 mb-2">Without APIvault</div>
              <p className="text-sm text-white/50">{uc.without}</p>
            </div>
          </div>

          {/* Solution */}
          <div className="border border-[#34d399]/20 rounded-2xl p-6 bg-[#34d399]/3">
            <div className="mono text-xs text-[#34d399]/60 mb-3">// the solution</div>
            <p className="text-white/70 text-base leading-relaxed mb-5">{uc.with}</p>
            <div className="bg-[#34d399]/8 border border-[#34d399]/20 rounded-xl p-4">
              <div className="text-xs font-semibold text-[#34d399] mb-2">APIs used in this project</div>
              <div className="flex flex-wrap gap-2">
                {uc.apis.map(a => (
                  <span key={a} className="mono text-xs bg-[#34d399]/10 text-[#34d399] px-2.5 py-1 rounded-lg">{a}</span>
                ))}
              </div>
            </div>
            <div className="mt-4 mono text-xs text-white/30 border border-white/8 rounded-xl p-3">
              <div className="text-white/20 mb-1">// same code pattern for all three</div>
              <div className="text-white/50">{'fetch(url, { headers: { \'x-vault-key\': key } })'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live demo ── */}
      <section id="demo" className="py-20 px-6 max-w-6xl mx-auto border-t border-white/5">
        <div className="mono text-xs text-white/30 mb-2">// live data</div>
        <h2 className="text-3xl font-bold mb-3">This is real. Right now.</h2>
        <p className="text-white/40 mb-10">
          These aren't mock responses. Every card below is making a live API call through APIvault as you read this.
        </p>

        {/* Live result cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {LIVE_DEMOS.map(d => (
            <div key={d.id} className="border border-white/8 rounded-2xl p-5 bg-white/2">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold">{d.title}</div>
                  <div className="mono text-xs text-white/30 mt-0.5">{d.desc}</div>
                </div>
                <button onClick={() => runDemo(d)}
                  className="mono text-xs text-white/30 hover:text-white/60 transition-colors border border-white/10 px-2 py-1 rounded-lg">
                  ↻
                </button>
              </div>
              <div className={`min-h-12 flex items-center`}>
                {loading[d.id] ? (
                  <div className="flex items-center gap-2 text-xs text-white/30">
                    <div className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />
                    Fetching...
                  </div>
                ) : demoResults[d.id] ? (
                  <p className="text-sm text-[#34d399] leading-relaxed">{demoResults[d.id]}</p>
                ) : (
                  <p className="text-xs text-white/20">Loading...</p>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-white/5">
                <div className="mono text-xs text-white/20 truncate">{BASE}{d.endpoint}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Code example */}
        <div className="border border-white/8 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/2">
            <div>
              <div className="text-sm font-semibold">One pattern. Every API.</div>
              <div className="text-xs text-white/30 mt-0.5">The same x-vault-key header works for all APIs</div>
            </div>
            <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
              {[['js','JS'], ['python','Python'], ['curl','cURL']].map(([id, label]) => (
                <button key={id} onClick={() => setCodeTab(id)}
                  className={`px-3 py-1.5 mono text-xs rounded-md transition-all ${
                    codeTab === id ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <pre className="mono text-xs p-5 text-white/60 leading-relaxed">{CODE[codeTab]}</pre>
          </div>
        </div>
      </section>

      {/* ── Interactive Demo ── */}
      <InteractiveDemo />

      {/* ── API catalogue ── */}
      <section id="apis" className="py-20 px-6 max-w-6xl mx-auto border-t border-white/5">
        <div className="mono text-xs text-white/30 mb-2">// api registry</div>
        <h2 className="text-3xl font-bold mb-3">Available APIs</h2>
        <p className="text-white/40 mb-8">
          {APIS.filter(a => a.live).length} APIs live today. More added regularly. Request an API if you don't see what you need.
        </p>

        <div className="border border-white/8 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-4 border-b border-white/5 px-5 py-3 bg-white/2">
            {['API', 'Category', 'Price / call', 'Status'].map(h => (
              <div key={h} className="mono text-xs text-white/25">{h}</div>
            ))}
          </div>
          {APIS.map((a, i) => (
            <div key={i} className="grid grid-cols-4 items-center px-5 py-3.5 border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors">
              <div className="font-medium text-sm text-white/80">{a.name}</div>
              <div>
                <span className="mono text-xs px-2 py-0.5 rounded-md font-medium"
                  style={{ background: CAT_COLORS[a.cat]?.bg + '22', color: CAT_COLORS[a.cat]?.text }}>
                  {a.cat}
                </span>
              </div>
              <div className="mono text-xs text-white/50">{a.price}</div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${a.live ? 'bg-[#34d399]' : 'bg-white/20'}`}
                  style={a.live ? { animation: 'pulse-green 2s infinite' } : {}} />
                <span className={`mono text-xs ${a.live ? 'text-[#34d399]' : 'text-white/25'}`}>
                  {a.live ? 'live' : 'soon'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-6 max-w-6xl mx-auto border-t border-white/5">
        <div className="mono text-xs text-white/30 mb-2">// getting started</div>
        <h2 className="text-3xl font-bold mb-12">From signup to first API call in 3 steps</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              n: '01',
              title: 'Create your account',
              body: 'Sign up with email and password. Admin reviews and approves your account — usually within minutes.',
              note: 'Free to start. No credit card required.',
              color: '#34d399',
            },
            {
              n: '02',
              title: 'Get your vault key',
              body: 'After approval, log in and copy your vault key from the Billing tab. This single key unlocks every API.',
              note: 'One key. Stored in one place. Works everywhere.',
              color: '#60a5fa',
            },
            {
              n: '03',
              title: 'Start making calls',
              body: 'Add x-vault-key to your request header. Use any endpoint from our marketplace. Copy the code snippet and go.',
              note: 'No SDK. No setup. Works with fetch, axios, requests.',
              color: '#f59e0b',
            },
          ].map(s => (
            <div key={s.n} className="border border-white/8 rounded-2xl p-6 relative overflow-hidden hover:border-white/15 transition-colors">
              <div className="text-6xl font-bold absolute -top-2 -right-2 leading-none select-none"
                style={{ color: s.color + '0a' }}>
                {s.n}
              </div>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold mb-4"
                style={{ background: s.color + '18', color: s.color }}>
                {s.n.replace('0', '')}
              </div>
              <div className="font-bold text-base mb-2">{s.title}</div>
              <p className="text-sm text-white/45 leading-relaxed mb-4">{s.body}</p>
              <div className="mono text-xs" style={{ color: s.color + 'aa' }}>{s.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── For African devs ── */}
      <section className="py-20 px-6 max-w-6xl mx-auto border-t border-white/5">
        <div className="mono text-xs text-white/30 mb-2">// our focus</div>
        <h2 className="text-3xl font-bold mb-4">Built for African developers</h2>
        <p className="text-white/40 text-lg mb-12 max-w-2xl">
          Most API gateways are built for US developers and charge in USD. We're different — we charge in KES via M-Pesa and Paystack, and we're adding African-specific APIs that nobody else covers.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: '🇰🇪', title: 'Pay in KES', body: 'Top up your credits with M-Pesa or Paystack. No USD conversion hassle.' },
            { icon: '📡', title: 'M-Pesa API coming', body: 'Daraja API, STK Push, C2B payments — all through your vault key.' },
            { icon: '💬', title: 'Africa\'s Talking', body: 'SMS, USSD, and voice for Kenya, Nigeria, Ghana, Uganda — coming soon.' },
            { icon: '⚡', title: 'Low latency', body: 'Servers optimized for East Africa. Fast responses for Kenyan users.' },
            { icon: '💳', title: 'Start free', body: 'Free APIs work with zero balance. Add credits only when you need paid APIs.' },
            { icon: '🛠️', title: 'One integration', body: 'Same code pattern works for every API. Learn it once, use it forever.' },
          ].map(f => (
            <div key={f.title} className="flex gap-4 p-5 border border-white/5 rounded-xl hover:border-white/15 transition-colors">
              <div className="text-2xl flex-shrink-0 mt-0.5">{f.icon}</div>
              <div>
                <div className="font-semibold text-sm mb-1">{f.title}</div>
                <div className="text-xs text-white/40 leading-relaxed">{f.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mono text-xs text-[#34d399] mb-4 tracking-widest">// ready?</div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight leading-tight">
            One key.<br />Every API.<br />
            <span className="text-[#34d399]">Start building today.</span>
          </h2>
          <p className="text-white/40 mb-8 text-lg">
            Free APIs work immediately. No credit card. No setup fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => nav('/login')}
              className="bg-[#34d399] text-[#080808] px-8 py-4 rounded-xl font-bold hover:bg-[#6ee7b7] transition-all text-base glow-green">
              Create free account →
            </button>
            <button onClick={() => document.getElementById('demo').scrollIntoView({ behavior: 'smooth' })}
              className="border border-white/15 text-white/60 px-8 py-4 rounded-xl font-medium hover:border-white/30 hover:text-white transition-all text-base">
              See live demo
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#34d399] rounded-md flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-[#080808] rounded-sm" />
            </div>
            <span className="font-semibold text-sm">APIvault</span>
            <span className="mono text-xs text-white/25 ml-2">Built in Kenya 🇰🇪</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => nav('/login')} className="mono text-xs text-white/25 hover:text-white/50 transition-colors">Sign in</button>
            <button onClick={() => nav('/login')} className="mono text-xs text-white/25 hover:text-white/50 transition-colors">Get started</button>
          </div>
        </div>
      </footer>
    </div>
  )
}