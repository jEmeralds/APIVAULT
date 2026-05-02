// client/src/pages/Landing.jsx
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const BASE = 'https://apivault-production-736c.up.railway.app'
const VAULT_KEY = 'a27907ec-94cd-47f9-8b8f-458120a11154'

// ─── Demo Steps ───────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 1,
    label: 'Sign up',
    title: 'Create your free account',
    desc: "Go to APIvault, enter your email and password. Admin approves your account — usually within minutes. No credit card needed to start.",
    type: 'visual',
    visual: 'signup',
    code: null,
  },
  {
    id: 2,
    label: 'Get your key',
    title: 'Copy your vault key',
    desc: "After approval, open the Billing tab. Click Reveal & copy. This one key is all you will ever need — it works for every API in the vault.",
    type: 'visual',
    visual: 'key',
    code: `// Store your vault key once — use it everywhere
const VAULT_KEY = 'sk-vault-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
const BASE_URL  = 'https://apivault-production-736c.up.railway.app'`,
  },
  {
    id: 3,
    label: 'Call NewsAPI',
    title: 'Fetch live news headlines',
    desc: "Go to Marketplace, click NewsAPI, copy the snippet. The code is already filled with your key. Run it — you get real headlines instantly.",
    type: 'live',
    endpoint: '/proxy/newsapi/top-headlines?country=us&pageSize=3',
    render: (d) => d?.articles?.slice(0, 3).map(a => ({
      label: a.source?.name || 'News',
      value: a.title?.slice(0, 80) + (a.title?.length > 80 ? '...' : ''),
    })),
    code: `const res = await fetch(
  BASE_URL + '/proxy/newsapi/top-headlines?country=us&pageSize=3',
  { headers: { 'x-vault-key': VAULT_KEY } }
)
const { articles } = await res.json()
// → Live US news headlines`,
  },
  {
    id: 4,
    label: 'Add Exchange Rates',
    title: 'Same key — different API',
    desc: "No new account. No new key. Just change the endpoint. Call Exchange Rates API with the exact same vault key and get live currency data.",
    type: 'live',
    endpoint: '/proxy/exchangerates/latest/KES',
    render: (d) => d?.rates ? [
      { label: 'USD', value: `1 KES = ${d.rates.USD?.toFixed(5)} USD` },
      { label: 'EUR', value: `1 KES = ${d.rates.EUR?.toFixed(5)} EUR` },
      { label: 'GBP', value: `1 KES = ${d.rates.GBP?.toFixed(5)} GBP` },
    ] : null,
    code: `// Same key — just change the endpoint
const res = await fetch(
  BASE_URL + '/proxy/exchangerates/latest/KES',
  { headers: { 'x-vault-key': VAULT_KEY } }  // same key!
)
const { rates } = await res.json()
// → 1 KES = 0.00775 USD`,
  },
  {
    id: 5,
    label: 'Add Country Data',
    title: 'Third API — still one key',
    desc: "Add REST Countries to your app. Pull population, capitals, currencies, flags — all with the same single vault key.",
    type: 'live',
    endpoint: '/proxy/restcountries/name/kenya',
    render: (d) => {
      const k = Array.isArray(d) ? d[0] : d
      return k ? [
        { label: 'Country', value: `${k.flag || '🇰🇪'} ${k.name?.common} — ${k.name?.official}` },
        { label: 'Population', value: `${(k.population / 1e6).toFixed(1)}M people` },
        { label: 'Capital', value: `${k.capital?.[0]} · Currency: KES` },
      ] : null
    },
    code: `// Third API — still the same key
const res = await fetch(
  BASE_URL + '/proxy/restcountries/name/kenya',
  { headers: { 'x-vault-key': VAULT_KEY } }  // same key!
)
const [kenya] = await res.json()
// → { name, population, capital, flag... }`,
  },
  {
    id: 6,
    label: 'Ship it',
    title: "You just built a data dashboard",
    desc: "Three live APIs. One key. One account. One line of integration code per API. That is what APIvault gives you — more time building, less time managing.",
    type: 'summary',
    code: `// Your complete app — 3 APIs, 1 key, ~10 lines
const H = { headers: { 'x-vault-key': VAULT_KEY } }

const [news, rates, country] = await Promise.all([
  fetch(BASE_URL + '/proxy/newsapi/top-headlines?country=ke', H).then(r => r.json()),
  fetch(BASE_URL + '/proxy/exchangerates/latest/KES', H).then(r => r.json()),
  fetch(BASE_URL + '/proxy/restcountries/name/kenya', H).then(r => r.json()),
])

// Build your UI with real live data ✓`,
  },
]

const APIS = [
  { name: 'Exchange Rates', cat: 'data',     price: 'Free',    live: true  },
  { name: 'REST Countries', cat: 'data',     price: 'Free',    live: true  },
  { name: 'IP Geolocation', cat: 'data',     price: 'Free',    live: true  },
  { name: 'OpenWeather',    cat: 'data',     price: 'Free',    live: true  },
  { name: 'NewsAPI',        cat: 'data',     price: '$0.002',  live: true  },
  { name: 'GitHub API',     cat: 'dev',      price: 'Free',    live: true  },
  { name: 'Dictionary API', cat: 'dev',      price: 'Free',    live: true  },
  { name: 'JokeAPI',        cat: 'dev',      price: 'Free',    live: true  },
  { name: 'GPT-4o',         cat: 'ai',       price: '$0.008',  live: false },
  { name: 'HeyGen Video',   cat: 'ai',       price: '$0.600',  live: false },
  { name: 'Grok Image',     cat: 'ai',       price: '$0.120',  live: false },
  { name: 'Stripe',         cat: 'payments', price: 'Free',    live: false },
  { name: 'M-Pesa',         cat: 'payments', price: 'Free',    live: false },
  { name: 'Twilio SMS',     cat: 'comms',    price: '$0.009',  live: false },
]

const CAT = {
  ai:       { bg: 'rgba(167,139,250,0.15)', text: '#a78bfa' },
  data:     { bg: 'rgba(251,191,36,0.15)',  text: '#fbbf24' },
  dev:      { bg: 'rgba(251,146,60,0.15)',  text: '#fb923c' },
  payments: { bg: 'rgba(52,211,153,0.15)',  text: '#34d399' },
  comms:    { bg: 'rgba(96,165,250,0.15)',  text: '#60a5fa' },
}

const FEATURES = [
  {
    icon: '🔑',
    title: 'One key for everything',
    body: "Stop juggling API keys. One vault key works across every API in our catalogue. Learn the pattern once, use it forever.",
    detail: "x-vault-key: sk-vault-your-key",
  },
  {
    icon: '💳',
    title: 'Pay as you go in KES',
    body: "Top up your credits with M-Pesa or Paystack. No monthly subscription. No USD conversion. Credits never expire.",
    detail: "Starting from $1 · No commitment",
  },
  {
    icon: '⚡',
    title: 'Instant integration',
    body: "No SDK to install. No complex setup. Works with fetch, axios, requests — any HTTP client in any language.",
    detail: "JavaScript · Python · cURL · PHP",
  },
  {
    icon: '📊',
    title: 'Full usage visibility',
    body: "See every API call you make, every credit spent, which APIs you use most. Real-time dashboard included.",
    detail: "Logs · Charts · Per-API breakdown",
  },
  {
    icon: '🛡️',
    title: 'Your master keys stay hidden',
    body: "API master keys never leave our servers. Your code never touches them. You just use your vault key.",
    detail: "Zero exposure to upstream credentials",
  },
  {
    icon: '🌍',
    title: 'Built for African developers',
    body: "M-Pesa, Paystack, and Africa-specific APIs coming. Designed for developers building in and for Africa.",
    detail: "Kenya · Nigeria · Ghana · Uganda",
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────

function SignupVisual() {
  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-5 max-w-sm mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-5 h-5 bg-[#34d399] rounded-md flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-[#080808] rounded-sm" />
        </div>
        <span className="text-sm font-bold">APIvault — Create account</span>
      </div>
      <div className="space-y-3">
        <div>
          <div className="text-xs text-white/40 mb-1.5">Email address</div>
          <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white/30 font-mono">you@company.com</div>
        </div>
        <div>
          <div className="text-xs text-white/40 mb-1.5">Password</div>
          <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white/30">••••••••••••</div>
        </div>
        <div className="bg-[#34d399] rounded-lg py-2.5 text-center text-sm font-bold text-[#080808]">
          Create free account
        </div>
        <div className="flex items-center gap-2 bg-[#34d399]/10 border border-[#34d399]/20 rounded-lg p-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] flex-shrink-0" />
          <span className="text-xs text-[#34d399]">Account created — pending admin approval</span>
        </div>
      </div>
    </div>
  )
}

function KeyVisual() {
  const [revealed, setRevealed] = useState(false)
  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-5 max-w-sm mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-5 h-5 bg-[#34d399] rounded-md flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-[#080808] rounded-sm" />
        </div>
        <span className="text-sm font-bold">Billing</span>
        <span className="ml-auto text-xs font-mono text-[#34d399]">$5.00 credits</span>
      </div>
      <div className="space-y-3">
        <div className="bg-white/3 border border-white/8 rounded-xl p-3">
          <div className="text-xs text-white/40 mb-1">Your vault key</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 font-mono text-xs text-white/60 truncate">
              {revealed ? 'sk-vault-a27907ec-94cd-47f9...' : 'sk-vault-••••••••••••••••••••'}
            </div>
            <button onClick={() => setRevealed(true)}
              className="bg-[#34d399] text-[#080808] text-xs px-2.5 py-1.5 rounded-lg font-bold whitespace-nowrap flex-shrink-0">
              {revealed ? '✓ Copied' : 'Reveal'}
            </button>
          </div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
          <div className="text-xs text-amber-400">🔒 Keep this key secret. One key. Every API.</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[5, 10, 25].map(n => (
            <div key={n} className="bg-white/3 border border-white/8 rounded-lg py-2 text-center">
              <div className="text-xs text-white/30">Add</div>
              <div className="text-sm font-bold">${n}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SummaryVisual() {
  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-5 max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-[#34d399] rounded-md flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-[#080808] rounded-sm" />
          </div>
          <span className="text-sm font-bold">Kenya Dashboard</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#34d399]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
          Live
        </div>
      </div>
      <div className="space-y-2.5">
        {[
          { icon: '📰', label: 'Top News', val: 'Meta stock falls · PSG vs Bayern', color: '#60a5fa' },
          { icon: '💱', label: 'KES Rate', val: '1 KES = 0.00775 USD', color: '#34d399' },
          { icon: '🇰🇪', label: 'Country', val: 'Kenya · Pop: 53.3M · Nairobi', color: '#fbbf24' },
        ].map(r => (
          <div key={r.label} className="flex items-center gap-3 bg-white/3 border border-white/6 rounded-xl p-3">
            <span className="text-lg">{r.icon}</span>
            <div>
              <div className="text-xs font-medium" style={{ color: r.color }}>{r.label}</div>
              <div className="text-xs text-white/50 mt-0.5">{r.val}</div>
            </div>
          </div>
        ))}
        <div className="text-center pt-1">
          <span className="mono text-xs text-white/25">3 APIs · 1 vault key · built in 5 min</span>
        </div>
      </div>
    </div>
  )
}

function CopyBtn({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000) }}
      className="mono text-xs px-2.5 py-1 border border-white/10 text-white/30 rounded-lg hover:text-white/60 hover:border-white/25 transition-colors">
      {done ? '✓ Copied' : 'Copy'}
    </button>
  )
}

// ─── Main Landing ─────────────────────────────────────────────────────────

export function Landing() {
  const nav = useNavigate()
  const [step, setStep]       = useState(1)
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState({})
  const [done, setDone]       = useState({})
  const [liveData, setLiveData] = useState({})

  // No redirect — logged-in users can visit landing page freely
  const isLoggedIn = !!localStorage.getItem('token')
  const userRole   = localStorage.getItem('role')

  // Auto-run background live cards
  useEffect(() => {
    const demos = [
      { id: 'rates',   url: '/proxy/exchangerates/latest/KES',           parse: d => d?.rates ? `1 KES = $${d.rates.USD?.toFixed(5)} USD` : null },
      { id: 'joke',    url: '/proxy/jokeapi/joke/Programming?type=single', parse: d => d?.joke?.slice(0, 100) || null },
      { id: 'country', url: '/proxy/restcountries/name/kenya',            parse: d => { const k = Array.isArray(d) ? d[0] : d; return k ? `${k.flag || '🇰🇪'} ${k.name?.common} · Pop ${(k.population/1e6).toFixed(1)}M` : null } },
    ]
    demos.forEach(async d => {
      try {
        const res  = await fetch(`${BASE}${d.url}`, { headers: { 'x-vault-key': VAULT_KEY } })
        const data = await res.json()
        const val  = d.parse(data)
        if (val) setLiveData(l => ({ ...l, [d.id]: val }))
      } catch {}
    })
  }, [])

  async function runStep(s) {
    if (s.type !== 'live') return
    setLoading(l => ({ ...l, [s.id]: true }))
    try {
      const res  = await fetch(`${BASE}${s.endpoint}`, { headers: { 'x-vault-key': VAULT_KEY } })
      const data = await res.json()
      const rendered = s.render(data)
      setResults(r => ({ ...r, [s.id]: rendered }))
      setDone(d => ({ ...d, [s.id]: true }))
    } catch (e) {
      setResults(r => ({ ...r, [s.id]: [{ label: 'Error', value: e.message }] }))
    }
    setLoading(l => ({ ...l, [s.id]: false }))
  }

  function next() {
    const cur = STEPS.find(s => s.id === step)
    if (cur?.type === 'live' && !done[cur.id]) {
      runStep(cur).then(() => setStep(s => Math.min(STEPS.length, s + 1)))
    } else {
      setStep(s => Math.min(STEPS.length, s + 1))
    }
  }

  const cur = STEPS.find(s => s.id === step)

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden"
      style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .mono { font-family: 'IBM Plex Mono', monospace; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow-pulse { 0%,100%{box-shadow:0 0 20px rgba(52,211,153,0.2)} 50%{box-shadow:0 0 40px rgba(52,211,153,0.4)} }
        .fade-up { animation: fadeUp 0.5s ease forwards; opacity:0; }
        .d1{animation-delay:.05s}.d2{animation-delay:.15s}.d3{animation-delay:.25s}.d4{animation-delay:.4s}
        .grid-bg { background-image: linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px); background-size:56px 56px; }
        .glow { animation: glow-pulse 3s ease infinite; }
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}
        .step-btn { transition: all 0.2s; }
        .step-btn.active { background: rgba(52,211,153,0.08); border-color: rgba(52,211,153,0.35); }
        .step-btn.completed { border-color: rgba(52,211,153,0.2); }
      `}</style>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-[#34d399] rounded-md flex items-center justify-center">
              <div className="w-2 h-2 bg-[#050505] rounded-sm" />
            </div>
            <span className="font-bold tracking-tight">APIvault</span>
            <span className="mono text-[10px] text-white/20 border border-white/10 px-1.5 py-0.5 rounded ml-0.5">beta</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              ['Demo', '#demo'],
              ['Features', '#features'],
              ['APIs', '#apis'],
            ].map(([label, href]) => (
              <button key={label}
                onClick={() => document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' })}
                className="text-xs text-white/35 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 hidden sm:block">
                {label}
              </button>
            ))}
            <div className="w-px h-4 bg-white/10 mx-1 hidden sm:block" />
            {isLoggedIn ? (
              <button onClick={() => nav(userRole === 'admin' ? '/admin' : '/app')}
                className="text-xs bg-[#34d399] text-[#050505] px-4 py-2 rounded-lg font-bold hover:bg-[#6ee7b7] transition-colors ml-1">
                Go to dashboard →
              </button>
            ) : (
              <>
                <button onClick={() => nav('/login')}
                  className="text-xs text-white/50 hover:text-white px-3 py-1.5 transition-colors">
                  Sign in
                </button>
                <button onClick={() => nav('/login')}
                  className="text-xs bg-[#34d399] text-[#050505] px-4 py-2 rounded-lg font-bold hover:bg-[#6ee7b7] transition-colors ml-1">
                  Get started →
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="grid-bg pt-20 pb-16 px-5 max-w-6xl mx-auto">
        <div className="fade-up d1 inline-flex items-center gap-2 border border-[#34d399]/25 bg-[#34d399]/6 rounded-full px-3.5 py-1.5 mb-7">
          <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
          <span className="mono text-xs text-[#34d399]">{APIS.filter(a => a.live).length} APIs live · gateway operational</span>
        </div>

        <h1 className="fade-up d2 text-5xl sm:text-6xl lg:text-[72px] font-bold leading-[1.04] tracking-tight mb-6 max-w-4xl">
          Stop managing<br />
          <span style={{ color: '#34d399' }}>dozens of API keys.</span>
        </h1>

        <p className="fade-up d3 text-white/50 text-xl max-w-2xl leading-relaxed mb-6">
          APIvault is a shared API gateway. Get <strong className="text-white/80">one vault key</strong> that unlocks every API — NewsAPI, Exchange Rates, GitHub, OpenWeather, and more. Pay per call. No subscriptions.
        </p>

        {/* Pain → solution */}
        <div className="fade-up d3 flex flex-col gap-1.5 mb-10">
          {['NewsAPI account + key', 'OpenWeather account + key', 'Exchange Rates account + key'].map(item => (
            <div key={item} className="inline-flex items-center gap-3 w-fit">
              <div className="w-4 h-px bg-red-500/50" />
              <span className="text-white/30 text-sm line-through">{item}</span>
            </div>
          ))}
          <div className="inline-flex items-center gap-3 w-fit mt-2">
            <div className="w-4 h-px bg-[#34d399]" />
            <span className="text-[#34d399] text-sm font-semibold">APIvault — one key for all of them ✓</span>
          </div>
        </div>

        <div className="fade-up d4 flex flex-wrap gap-3">
          <button onClick={() => nav('/login')}
            className="bg-[#34d399] text-[#050505] px-6 py-3 rounded-xl font-bold hover:bg-[#6ee7b7] transition-all text-sm glow">
            Start free — no card needed →
          </button>
          <button onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            className="border border-white/12 text-white/50 px-6 py-3 rounded-xl font-medium hover:border-white/30 hover:text-white transition-all text-sm">
            Watch the demo ↓
          </button>
        </div>
      </section>

      {/* ── Live ticker ── */}
      <div className="border-y border-white/5 bg-white/[0.01] py-4 px-5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'rates',   label: '💱 Live exchange rate', fallback: 'Fetching...' },
            { id: 'joke',    label: '😄 Programming joke',   fallback: 'Fetching...' },
            { id: 'country', label: '🌍 Country data',        fallback: 'Fetching...' },
          ].map(d => (
            <div key={d.id} className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] flex-shrink-0 mt-1.5 animate-pulse" />
              <div>
                <div className="mono text-[10px] text-white/25 mb-0.5">{d.label}</div>
                <div className="text-xs text-white/60 leading-snug">{liveData[d.id] || d.fallback}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Interactive Demo ── */}
      <section id="demo" className="py-20 px-5 max-w-6xl mx-auto">
        <div className="mono text-xs text-white/25 mb-2">// interactive walkthrough</div>
        <h2 className="text-3xl sm:text-4xl font-bold mb-2 tracking-tight">
          From signup to live data<br />in 5 minutes
        </h2>
        <p className="text-white/40 mb-10 max-w-xl text-base">
          Follow the steps below. Every Run button makes a real API call through the gateway — this is live data, not a simulation.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Step list */}
          <div className="lg:col-span-4">
            <div className="space-y-2">
              {STEPS.map(s => (
                <button key={s.id} onClick={() => setStep(s.id)}
                  className={`step-btn w-full text-left px-4 py-3.5 rounded-xl border transition-all
                    ${step === s.id ? 'active border-[#34d399]/35' : done[s.id] ? 'completed border-[#34d399]/15' : 'border-white/6 hover:border-white/15'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                      done[s.id]
                        ? 'bg-[#34d399] text-[#050505]'
                        : step === s.id
                        ? 'bg-[#34d399] text-[#050505]'
                        : 'bg-white/6 text-white/25'
                    }`}>
                      {done[s.id] ? '✓' : s.id}
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${step === s.id ? 'text-white' : done[s.id] ? 'text-[#34d399]' : 'text-white/40'}`}>
                        {s.label}
                      </div>
                      {step === s.id && (
                        <div className="text-xs text-white/30 mt-0.5 leading-snug">{s.title}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button onClick={() => nav(isLoggedIn ? (userRole === 'admin' ? '/admin' : '/app') : '/login')}
              className="w-full mt-4 py-3 bg-[#34d399] text-[#050505] rounded-xl font-bold text-sm hover:bg-[#6ee7b7] transition-colors">
              {isLoggedIn ? 'Go to dashboard →' : 'Start building free →'}
            </button>
          </div>

          {/* Step detail */}
          <div className="lg:col-span-8">
            <div className="border border-white/8 rounded-2xl overflow-hidden h-full">

              {/* Header */}
              <div className="px-5 py-4 border-b border-white/6 bg-white/[0.015]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="mono text-[10px] text-white/25">Step {cur.id} of {STEPS.length}</div>
                  <div className="flex gap-1 ml-auto">
                    {STEPS.map(s => (
                      <button key={s.id} onClick={() => setStep(s.id)}
                        className={`h-1.5 rounded-full transition-all ${
                          step === s.id ? 'w-5 bg-[#34d399]' : done[s.id] ? 'w-1.5 bg-[#34d399]/40' : 'w-1.5 bg-white/10'
                        }`} />
                    ))}
                  </div>
                </div>
                <div className="font-bold text-lg">{cur.title}</div>
                <div className="text-sm text-white/45 mt-1 leading-relaxed">{cur.desc}</div>
              </div>

              {/* Visual area */}
              <div className="p-5 border-b border-white/6 bg-[#0a0a0a]">
                {cur.type === 'visual' && cur.visual === 'signup' && <SignupVisual />}
                {cur.type === 'visual' && cur.visual === 'key'    && <KeyVisual />}
                {cur.type === 'summary'                           && <SummaryVisual />}
                {cur.type === 'live' && (
                  <div className="space-y-3">
                    <button onClick={() => runStep(cur)} disabled={loading[cur.id]}
                      className="flex items-center gap-2.5 px-5 py-2.5 bg-indigo-600 text-white text-sm rounded-xl
                        hover:bg-indigo-700 disabled:opacity-50 transition-colors font-semibold">
                      {loading[cur.id]
                        ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Calling API...</span></>
                        : <><span>▶</span><span>Run — make live API call</span></>
                      }
                    </button>

                    {results[cur.id] ? (
                      <div className="bg-[#34d399]/5 border border-[#34d399]/20 rounded-xl p-4">
                        <div className="mono text-xs text-[#34d399] font-semibold mb-3 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                          Live response — real data from API
                        </div>
                        <div className="space-y-2.5">
                          {results[cur.id].map((r, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <span className="mono text-[10px] text-white/25 mt-0.5 flex-shrink-0 w-12">{r.label}</span>
                              <span className="text-sm text-white/75 leading-snug">{r.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="border border-white/5 rounded-xl p-6 text-center">
                        <div className="text-2xl mb-2">▶</div>
                        <div className="text-xs text-white/20">Click Run to see live API data</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Code */}
              {cur.code && (
                <div className="border-b border-white/6">
                  <div className="px-5 py-2.5 flex items-center justify-between bg-white/[0.01]">
                    <span className="mono text-[10px] text-white/25">code</span>
                    <CopyBtn text={cur.code} />
                  </div>
                  <div className="overflow-x-auto">
                    <pre className="mono text-xs p-5 text-white/55 leading-relaxed">{cur.code}</pre>
                  </div>
                </div>
              )}

              {/* Nav */}
              <div className="px-5 py-3.5 flex items-center justify-between bg-white/[0.01]">
                <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
                  className="px-4 py-2 border border-white/8 text-white/35 text-xs rounded-lg hover:border-white/25 hover:text-white/60 disabled:opacity-20 transition-all">
                  ← Back
                </button>
                {step < STEPS.length ? (
                  <button onClick={next}
                    className="px-5 py-2 bg-[#34d399] text-[#050505] text-xs rounded-lg font-bold hover:bg-[#6ee7b7] transition-colors">
                    {cur.type === 'live' && !done[cur.id] ? 'Run & continue →' : 'Next step →'}
                  </button>
                ) : (
                  <button onClick={() => nav(isLoggedIn ? (userRole === 'admin' ? '/admin' : '/app') : '/login')}
                    className="px-5 py-2 bg-[#34d399] text-[#050505] text-xs rounded-lg font-bold hover:bg-[#6ee7b7] transition-colors">
                    {isLoggedIn ? 'Dashboard →' : 'Start building →'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-5 max-w-6xl mx-auto border-t border-white/5">
        <div className="mono text-xs text-white/25 mb-2">// why apivault</div>
        <h2 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">Everything you need.<br />Nothing you don't.</h2>
        <p className="text-white/40 mb-12 max-w-xl text-base">
          Built specifically for developers who want to move fast without getting buried in API account management.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="border border-white/6 rounded-2xl p-6 hover:border-white/15 transition-all group">
              <div className="text-3xl mb-4">{f.icon}</div>
              <div className="font-bold text-base mb-2">{f.title}</div>
              <p className="text-sm text-white/40 leading-relaxed mb-4">{f.body}</p>
              <div className="mono text-xs text-[#34d399]/60 border border-[#34d399]/15 bg-[#34d399]/5 px-2.5 py-1.5 rounded-lg inline-block">
                {f.detail}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Use cases ── */}
      <section className="py-20 px-5 max-w-6xl mx-auto border-t border-white/5">
        <div className="mono text-xs text-white/25 mb-2">// real examples</div>
        <h2 className="text-3xl font-bold mb-10 tracking-tight">What developers build with APIvault</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: '🏦',
              title: 'Fintech app',
              desc: 'Live exchange rates + SMS alerts + news feed. Three APIs, one key, one account.',
              apis: ['Exchange Rates', 'Twilio SMS', 'NewsAPI'],
            },
            {
              icon: '🚚',
              title: 'Logistics platform',
              desc: 'Weather forecasts + country data + IP location detection for delivery routing.',
              apis: ['OpenWeather', 'REST Countries', 'IP Geolocation'],
            },
            {
              icon: '📱',
              title: 'Developer tool',
              desc: 'Dictionary lookups + GitHub search + fun content for productivity apps.',
              apis: ['Dictionary API', 'GitHub API', 'JokeAPI'],
            },
          ].map(u => (
            <div key={u.title} className="border border-white/6 rounded-2xl p-6 hover:border-white/15 transition-all">
              <div className="text-3xl mb-3">{u.icon}</div>
              <div className="font-bold text-base mb-2">{u.title}</div>
              <p className="text-sm text-white/40 leading-relaxed mb-4">{u.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {u.apis.map(a => (
                  <span key={a} className="mono text-[10px] bg-white/5 border border-white/8 text-white/40 px-2 py-1 rounded-md">{a}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── API catalogue ── */}
      <section id="apis" className="py-20 px-5 max-w-6xl mx-auto border-t border-white/5">
        <div className="mono text-xs text-white/25 mb-2">// api registry</div>
        <h2 className="text-3xl font-bold mb-3 tracking-tight">Available APIs</h2>
        <p className="text-white/40 mb-8 max-w-xl">
          {APIS.filter(a => a.live).length} APIs live today with more being added regularly. All accessible with the same vault key.
        </p>

        <div className="border border-white/8 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-4 px-5 py-3 border-b border-white/5 bg-white/[0.015]">
            {['API', 'Category', 'Price / call', 'Status'].map(h => (
              <div key={h} className="mono text-[10px] text-white/20 uppercase tracking-wide">{h}</div>
            ))}
          </div>
          {APIS.map((a, i) => (
            <div key={i} className="grid grid-cols-4 items-center px-5 py-3.5 border-b border-white/4 last:border-0 hover:bg-white/[0.015] transition-colors">
              <div className="font-medium text-sm text-white/75">{a.name}</div>
              <div>
                <span className="mono text-[10px] px-2 py-0.5 rounded-md font-medium"
                  style={{ background: CAT[a.cat]?.bg, color: CAT[a.cat]?.text }}>
                  {a.cat}
                </span>
              </div>
              <div className="mono text-xs text-white/45">{a.price}</div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${a.live ? 'bg-[#34d399] animate-pulse' : 'bg-white/15'}`} />
                <span className={`mono text-[10px] ${a.live ? 'text-[#34d399]' : 'text-white/20'}`}>
                  {a.live ? 'live' : 'soon'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Africa ── */}
      <section className="py-20 px-5 max-w-6xl mx-auto border-t border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="mono text-xs text-white/25 mb-2">// our focus</div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">Built for<br />African developers 🌍</h2>
            <p className="text-white/45 text-base leading-relaxed mb-6">
              Most API gateways are built for US developers. We built APIvault for developers in Kenya, Nigeria, Ghana, and across Africa — with local payment methods, local context, and Africa-specific APIs coming.
            </p>
            <div className="space-y-2.5">
              {[
                { icon: '📲', text: 'Top up with M-Pesa or Paystack — no USD conversion' },
                { icon: '🇰🇪', text: 'M-Pesa Daraja API coming — STK Push, C2B, B2C' },
                { icon: '📡', text: "Africa's Talking — SMS to 10+ African countries" },
                { icon: '💰', text: 'Flutterwave and Paystack payment APIs coming' },
              ].map(r => (
                <div key={r.text} className="flex items-center gap-3">
                  <span className="text-base">{r.icon}</span>
                  <span className="text-sm text-white/50">{r.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#0a0a0a] border border-white/6 rounded-2xl p-6">
            <div className="mono text-xs text-white/25 mb-4">// quick start</div>
            <pre className="mono text-xs text-white/55 leading-relaxed overflow-x-auto">{`# 1. Sign up at apivault-xi.vercel.app
# 2. Get approved (minutes)
# 3. Copy your vault key from Billing tab
# 4. Start calling APIs

curl 'https://apivault-production-736c.up.railway.app\\
  /proxy/exchangerates/latest/KES' \\
  -H 'x-vault-key: sk-vault-your-key'

# → Live KES exchange rates
# Free. Instant. No other accounts needed.`}</pre>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-5">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mono text-xs text-[#34d399] mb-4 tracking-widest">// ready to build?</div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-5 tracking-tight leading-tight">
            One key.<br />Every API.<br />
            <span style={{ color: '#34d399' }}>Start today.</span>
          </h2>
          <p className="text-white/40 mb-8 text-lg">
            Free APIs work immediately. No credit card. Sign up and make your first API call in under 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => nav(isLoggedIn ? (userRole === 'admin' ? '/admin' : '/app') : '/login')}
              className="bg-[#34d399] text-[#050505] px-8 py-4 rounded-xl font-bold hover:bg-[#6ee7b7] transition-all text-base glow">
              {isLoggedIn ? 'Go to dashboard →' : 'Create free account →'}
            </button>
            <button onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="border border-white/12 text-white/50 px-8 py-4 rounded-xl font-medium hover:border-white/30 hover:text-white transition-all text-base">
              See the demo first
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 bg-[#34d399] rounded-md flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-[#050505] rounded-sm" />
            </div>
            <span className="font-bold text-sm">APIvault</span>
            <span className="mono text-xs text-white/20 ml-2">Built in Kenya 🇰🇪</span>
          </div>
          <div className="flex items-center gap-5">
            {['Demo', 'Features', 'APIs'].map(l => (
              <button key={l}
                onClick={() => document.getElementById(l.toLowerCase())?.scrollIntoView({ behavior: 'smooth' })}
                className="mono text-xs text-white/20 hover:text-white/50 transition-colors">
                {l}
              </button>
            ))}
            <button onClick={() => nav('/login')} className="mono text-xs text-white/20 hover:text-white/50 transition-colors">Sign in</button>
          </div>
        </div>
      </footer>
    </div>
  )
}