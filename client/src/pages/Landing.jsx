// client/src/pages/Landing.jsx
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const BASE     = import.meta.env.VITE_API_URL || 'https://api.apivault.uk'
const DEMO_KEY = import.meta.env.VITE_DEMO_VAULT_KEY || 'a27907ec-94cd-47f9-8b8f-458120a11154'

// ── Category colours ──────────────────────────────────────────────────────────
const CAT = {
  ai:       { bg: 'rgba(167,139,250,0.15)', text: '#a78bfa' },
  data:     { bg: 'rgba(251,191,36,0.15)',  text: '#fbbf24' },
  dev:      { bg: 'rgba(251,146,60,0.15)',  text: '#fb923c' },
  payments: { bg: 'rgba(52,211,153,0.15)',  text: '#34d399' },
  comms:    { bg: 'rgba(96,165,250,0.15)',  text: '#60a5fa' },
  finance:  { bg: 'rgba(52,211,153,0.15)',  text: '#34d399' },
  geo:      { bg: 'rgba(45,212,191,0.15)',  text: '#2dd4bf' },
  health:   { bg: 'rgba(251,113,133,0.15)', text: '#fb7185' },
  media:    { bg: 'rgba(232,121,249,0.15)', text: '#e879f9' },
}

// ── APIs shown on landing ─────────────────────────────────────────────────────
const APIS = [
  { name: 'Exchange Rates',    cat: 'finance',  price: 'Free',   live: true  },
  { name: 'REST Countries',    cat: 'data',     price: 'Free',   live: true  },
  { name: 'IP Geolocation',    cat: 'data',     price: 'Free',   live: true  },
  { name: 'Open Meteo',        cat: 'geo',      price: 'Free',   live: true  },
  { name: 'NewsAPI',           cat: 'data',     price: '$0.001', live: true  },
  { name: 'OpenWeather',       cat: 'data',     price: '$0.001', live: true  },
  { name: 'GitHub API',        cat: 'dev',      price: 'Free',   live: true  },
  { name: 'JokeAPI',           cat: 'dev',      price: 'Free',   live: true  },
  { name: 'Chuck Norris',      cat: 'dev',      price: 'Free',   live: true  },
  { name: 'PokeAPI',           cat: 'data',     price: 'Free',   live: true  },
  { name: 'SpaceX Data',       cat: 'data',     price: 'Free',   live: true  },
  { name: 'Cat Facts',         cat: 'data',     price: 'Free',   live: true  },
  { name: 'Advice Slip',       cat: 'data',     price: 'Free',   live: true  },
  { name: 'CoinGecko',         cat: 'finance',  price: 'Free',   live: true  },
  { name: 'Frankfurter Forex', cat: 'finance',  price: 'Free',   live: true  },
  { name: 'Open FDA',          cat: 'health',   price: 'Free',   live: true  },
  { name: 'Claude (Anthropic)',cat: 'ai',       price: '$0.005', live: true  },
  { name: 'GPT-4o',            cat: 'ai',       price: '$0.008', live: false },
  { name: 'Gemini Flash',      cat: 'ai',       price: '$0.002', live: false },
  { name: 'HeyGen Video',      cat: 'ai',       price: '$0.600', live: false },
  { name: "Africa's Talking",  cat: 'comms',    price: '$0.005', live: false },
  { name: 'Twilio SMS',        cat: 'comms',    price: '$0.008', live: false },
  { name: 'M-Pesa',            cat: 'payments', price: 'Free',   live: false },
  { name: 'Flutterwave',       cat: 'payments', price: '$0.010', live: false },
]

// ── Live demo calls ───────────────────────────────────────────────────────────
const DEMOS = [
  {
    id: 'rates',
    label: 'Exchange Rates',
    cat: 'finance',
    url: '/proxy/exchangerates/latest/KES',
    parse: d => d?.rates ? [
      { k: 'USD', v: `1 KES = ${d.rates.USD?.toFixed(5)}` },
      { k: 'EUR', v: `1 KES = ${d.rates.EUR?.toFixed(5)}` },
      { k: 'GBP', v: `1 KES = ${d.rates.GBP?.toFixed(5)}` },
    ] : null,
  },
  {
    id: 'country',
    label: 'REST Countries',
    cat: 'data',
    url: '/proxy/restcountries/name/kenya',
    parse: d => {
      const k = Array.isArray(d) ? d[0] : d
      return k ? [
        { k: 'Country', v: `${k.flag || '🇰🇪'} ${k.name?.common}` },
        { k: 'Population', v: `${(k.population / 1e6).toFixed(1)}M` },
        { k: 'Capital', v: k.capital?.[0] },
      ] : null
    },
  },
  {
    id: 'joke',
    label: 'JokeAPI',
    cat: 'dev',
    url: '/proxy/jokeapi/joke/Programming?type=single',
    parse: d => d?.joke ? [{ k: 'Joke', v: d.joke.slice(0, 120) }] : null,
  },
]

export function Landing() {
  const nav = useNavigate()
  const [demoData,   setDemoData]   = useState({})
  const [demoLoading, setDemoLoading] = useState({})
  const [activeDemo, setActiveDemo] = useState('rates')
  const [liveData,   setLiveData]   = useState({})
  const [showcaseApis, setShowcaseApis] = useState([])
  const isLoggedIn = !!localStorage.getItem('token')
  const userRole   = localStorage.getItem('role')

  function goLogin()  { nav('/login') }
  function goSignup() { nav('/login?mode=signup') }
  function goDash()   { nav(userRole === 'admin' ? '/admin' : '/app') }
  function goLogout() { localStorage.clear(); nav('/') }

  // Auto-run background demos — fetched dynamically from /showcase endpoint
  useEffect(() => {
    async function runShowcase() {
      try {
        const res  = await fetch(`${BASE}/showcase`)
        const data = await res.json()
        const apis = (data.apis || []).slice(0, 3)
        apis.forEach(async (api) => {
          try {
            const tryPath = api.try_path || '/'
            const r = await fetch(`${BASE}/proxy/${api.slug}${tryPath}`, {
              headers: { 'x-vault-key': DEMO_KEY }
            })
            const j = await r.json()
            // Generic display — show first string value found in response
            const display = extractDisplay(j, api.slug)
            if (display) setLiveData(p => ({ ...p, [api.slug]: display }))
          } catch {}
        })
        // Store showcase slugs for the ticker display
        setShowcaseApis(apis)
      } catch {}
    }
    runShowcase()
  }, [])

  function extractDisplay(data, slug) {
    if (!data || typeof data !== 'object') return String(data).slice(0, 100)
    // Common response patterns
    if (data.rates?.USD) return `1 KES = $${data.rates.USD.toFixed(5)} USD`
    if (data.joke) return data.joke.slice(0, 100)
    if (data.fact) return data.fact.slice(0, 100)
    if (data.slip?.advice) return data.slip.advice.slice(0, 100)
    if (data.value?.joke) return data.value.joke.slice(0, 100)
    if (Array.isArray(data) && data[0]?.name?.common) {
      const k = data[0]
      return `🇰🇪 ${k.name.common} · Pop ${((k.population||0)/1e6).toFixed(1)}M`
    }
    if (data.activity) return data.activity.slice(0, 100)
    if (data.text) return data.text.slice(0, 100)
    if (data.quote) return data.quote.slice(0, 100)
    if (data.content) return data.content.slice(0, 100)
    // Fallback — first string value
    for (const v of Object.values(data)) {
      if (typeof v === 'string' && v.length > 5) return v.slice(0, 100)
    }
    return null
  }

  // Run selected demo
  async function runDemo(demo) {
    if (demoData[demo.id]) { setActiveDemo(demo.id); return }
    setActiveDemo(demo.id)
    setDemoLoading(p => ({ ...p, [demo.id]: true }))
    try {
      const r = await fetch(`${BASE}${demo.url}`, { headers: { 'x-vault-key': DEMO_KEY } })
      const j = await r.json()
      const parsed = demo.parse(j)
      setDemoData(p => ({ ...p, [demo.id]: parsed }))
    } catch {}
    setDemoLoading(p => ({ ...p, [demo.id]: false }))
  }

  useEffect(() => { runDemo(DEMOS[0]) }, [])

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden"
      style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .mono { font-family: 'IBM Plex Mono', monospace; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.5s ease forwards; opacity:0; }
        .d1{animation-delay:.05s}.d2{animation-delay:.15s}.d3{animation-delay:.25s}.d4{animation-delay:.4s}.d5{animation-delay:.55s}
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}
      `}</style>

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050505]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 hover:opacity-70 transition-opacity">
            <div className="w-6 h-6 bg-[#34d399] rounded-md flex items-center justify-center">
              <div className="w-2 h-2 bg-[#050505] rounded-sm" />
            </div>
            <span className="font-bold tracking-tight">APIvault</span>
            <span className="mono text-[10px] text-white/20 border border-white/10 px-1.5 py-0.5 rounded ml-0.5">beta</span>
          </button>
          <div className="flex items-center gap-1">
            {[['Demo', '#demo'], ['Features', '#features'], ['APIs', '#apis']].map(([label, href]) => (
              <button key={label}
                onClick={() => document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' })}
                className="text-xs text-white/35 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 hidden sm:block">
                {label}
              </button>
            ))}
            <div className="w-px h-4 bg-white/10 mx-1 hidden sm:block" />
            {isLoggedIn ? (
              <>
                <button onClick={goDash} className="text-xs bg-[#34d399] text-[#050505] px-4 py-2 rounded-lg font-bold hover:bg-[#6ee7b7] transition-colors">
                  Dashboard →
                </button>
              </>
            ) : (
              <>
                <button onClick={goLogin} className="text-xs text-white/50 hover:text-white px-3 py-1.5 transition-colors">Sign in</button>
                <button onClick={goSignup} className="text-xs bg-[#34d399] text-[#050505] px-4 py-2 rounded-lg font-bold hover:bg-[#6ee7b7] transition-colors ml-1">
                  Get started →
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-5 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            {/* Pain statement */}
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/50 mb-8 fade-up d1">
              <span className="w-1.5 h-1.5 bg-[#34d399] rounded-full" />
              49 APIs · One key · No setup
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-[1.1] mb-6 fade-up d2">
              Stop managing<br/>
              <span className="text-white/25 line-through decoration-red-500/60">ten API keys.</span><br/>
              <span className="text-[#34d399]">Use one.</span>
            </h1>
            <p className="text-white/40 text-lg leading-relaxed mb-8 max-w-md fade-up d3">
              Every API you need — weather, news, AI, crypto, geocoding — behind a single vault key. Sign up once. Build everything.
            </p>
            <div className="flex items-center gap-3 fade-up d4">
              {isLoggedIn ? (
                <button onClick={goDash} className="px-6 py-3 bg-[#34d399] text-[#050505] rounded-xl font-bold hover:bg-[#6ee7b7] transition-colors">
                  Open dashboard →
                </button>
              ) : (
                <>
                  <button onClick={goSignup} className="px-6 py-3 bg-[#34d399] text-[#050505] rounded-xl font-bold hover:bg-[#6ee7b7] transition-colors">
                    Start for free →
                  </button>
                  <button onClick={goLogin} className="px-6 py-3 text-white/40 hover:text-white transition-colors text-sm">
                    Sign in
                  </button>
                </>
              )}
            </div>
            <p className="text-white/20 text-xs mt-4 fade-up d5">Free APIs work immediately · No credit card needed · Paid APIs from $1</p>
          </div>

          {/* Live ticker — dynamic from showcase endpoint */}
          <div className="space-y-3 fade-up d3">
            <p className="text-xs text-white/25 mono mb-4">// Three different APIs. Same key. Right now.</p>
            {(showcaseApis.length > 0 ? showcaseApis : [
              { slug: 'exchangerates', name: 'Exchange Rates' },
              { slug: 'restcountries', name: 'REST Countries' },
              { slug: 'jokeapi',       name: 'JokeAPI'        },
            ]).map((api, i) => {
              const colors = ['#34d399', '#60a5fa', '#fbbf24']
              return (
                <div key={api.slug} className="bg-white/[0.03] border border-white/8 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: colors[i] || '#888' }}/>
                    <span className="mono text-[11px] text-white/30">/proxy/{api.slug}</span>
                    <span className="ml-auto mono text-[10px] text-white/20 border border-white/10 px-1.5 py-0.5 rounded">x-vault-key: ****</span>
                  </div>
                  {liveData[api.slug] ? (
                    <p className="text-sm text-white/70 font-medium">{liveData[api.slug]}</p>
                  ) : (
                    <div className="h-4 bg-white/5 rounded animate-pulse w-3/4" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── The problem ── */}
      <section className="py-20 px-5 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-white/30 text-sm mb-3">The old way</p>
            <h2 className="text-3xl font-bold text-white/80">Building with APIs is painful</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mb-16">
            {[
              { pain: '10+ signups', desc: 'A new account for every API provider you want to use.' },
              { pain: '10+ keys',    desc: 'A separate API key to store, rotate, and protect.' },
              { pain: '10+ bills',   desc: 'A separate subscription or credit account to manage.' },
            ].map(item => (
              <div key={item.pain} className="bg-red-950/20 border border-red-900/20 rounded-2xl p-5">
                <p className="text-red-400 font-bold text-lg mb-1">{item.pain}</p>
                <p className="text-white/30 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mb-10">
            <p className="text-white/30 text-sm mb-3">The APIvault way</p>
            <h2 className="text-3xl font-bold text-[#34d399]">One account. One key. Everything.</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { win: '1 signup',  desc: 'Create one APIvault account. Access every API in the vault.' },
              { win: '1 key',     desc: 'Your vault key works for every API. Learn the pattern once.' },
              { win: '1 balance', desc: 'Top up credits with M-Pesa or card. One balance for all APIs.' },
            ].map(item => (
              <div key={item.win} className="bg-[#34d399]/5 border border-[#34d399]/20 rounded-2xl p-5">
                <p className="text-[#34d399] font-bold text-lg mb-1">{item.win}</p>
                <p className="text-white/40 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works (4 steps) ── */}
      <section id="demo" className="py-20 px-5 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-white/30 text-sm mb-3">How it works</p>
            <h2 className="text-3xl font-bold">In under 5 minutes</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {[
              { n: '1', title: 'Sign up',       desc: 'Create a free account. No credit card needed.' },
              { n: '2', title: 'Get your key',  desc: 'Copy your vault key from the Billing tab.' },
              { n: '3', title: 'Pick an API',   desc: 'Browse the marketplace. Click Use API.' },
              { n: '4', title: 'Copy & paste',  desc: 'One snippet. Works in any language.' },
            ].map(step => (
              <div key={step.n} className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
                <div className="w-8 h-8 rounded-lg bg-[#34d399]/10 border border-[#34d399]/20 flex items-center justify-center mono text-[#34d399] text-sm font-bold mb-3">{step.n}</div>
                <p className="font-semibold text-white mb-1">{step.title}</p>
                <p className="text-white/35 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Live demo */}
          <div className="bg-white/[0.02] border border-white/8 rounded-2xl overflow-hidden">
            <div className="border-b border-white/5 px-5 py-3 flex items-center gap-4">
              <p className="text-xs text-white/30 mono">// Try it live — real API calls, right now</p>
              <div className="ml-auto flex gap-1">
                {DEMOS.map(d => (
                  <button key={d.id} onClick={() => runDemo(d)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      activeDemo === d.id ? 'bg-[#34d399]/15 text-[#34d399] border border-[#34d399]/30' : 'text-white/30 hover:text-white/60'
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2">
              {/* Code */}
              <div className="p-5 border-r border-white/5">
                <p className="text-[10px] text-white/20 mono mb-3">The same code pattern for every API</p>
                <div className="bg-black/40 rounded-xl p-4 text-xs mono leading-6">
                  <span className="text-white/20">const </span>
                  <span className="text-[#34d399]">VAULT_KEY</span>
                  <span className="text-white/20"> = </span>
                  <span className="text-amber-300">'sk-vault-your-key'</span>
                  <br/><br/>
                  <span className="text-white/20">const res = await </span>
                  <span className="text-blue-300">fetch</span>
                  <span className="text-white/20">(</span>
                  <br/>
                  <span className="text-white/20">  </span>
                  <span className="text-amber-300">'/proxy/<span className="text-[#34d399]">{DEMOS.find(d=>d.id===activeDemo)?.label || 'api-name'}</span>/...'</span>
                  <span className="text-white/20">,</span>
                  <br/>
                  <span className="text-white/20">  {'{ '}</span>
                  <span className="text-purple-300">headers</span>
                  <span className="text-white/20">{': { '}</span>
                  <span className="text-amber-300">'x-vault-key'</span>
                  <span className="text-white/20">: VAULT_KEY {'} }'}</span>
                  <br/>
                  <span className="text-white/20">)</span>
                </div>
              </div>

              {/* Result */}
              <div className="p-5">
                <p className="text-[10px] text-white/20 mono mb-3">Live response</p>
                {demoLoading[activeDemo] ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-4 bg-white/5 rounded animate-pulse" style={{width:`${60+i*15}%`}}/>)}
                  </div>
                ) : demoData[activeDemo] ? (
                  <div className="space-y-2">
                    {demoData[activeDemo].map((row, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-white/25 text-xs mono w-20 flex-shrink-0">{row.k}</span>
                        <span className="text-[#34d399] text-sm font-medium">{row.v}</span>
                      </div>
                    ))}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]"/>
                      <span className="text-[11px] text-white/25 mono">200 OK · real data · no auth setup</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-white/20 text-sm">Select a demo above</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-5 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-white/30 text-sm mb-3">Why developers use APIvault</p>
            <h2 className="text-3xl font-bold">Built for the way you actually build</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '🔑', title: 'One key for everything',      body: 'Learn the integration once. Your vault key works for every API in the catalogue — today and every API we add in future.' },
              { icon: '📱', title: 'Pay with M-Pesa',             body: 'Top up your credits with M-Pesa, Visa, or bank transfer. No USD conversion hassle. Credits never expire.' },
              { icon: '⚡', title: 'No SDK required',             body: 'Works with fetch, axios, requests, curl — any HTTP client in any language. Copy the snippet and it runs.' },
              { icon: '📊', title: 'See every call you make',     body: 'Real-time dashboard shows every API call, cost, and response status. Know exactly what you\'re spending.' },
              { icon: '🛡️', title: 'Your code stays clean',       body: 'Upstream API keys never touch your codebase. You only ever use your vault key — no rotation, no leaks.' },
              { icon: '🌍', title: 'Built for African developers', body: 'M-Pesa, Africa\'s Talking, and local payment APIs coming. Designed for developers building in and for Africa.' },
            ].map(f => (
              <div key={f.title} className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 hover:border-white/15 transition-colors">
                <div className="text-2xl mb-3">{f.icon}</div>
                <p className="font-semibold text-white mb-2">{f.title}</p>
                <p className="text-white/35 text-sm leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── API catalogue ── */}
      <section id="apis" className="py-20 px-5 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-white/30 text-sm mb-3">What's in the vault</p>
            <h2 className="text-3xl font-bold mb-3">{APIS.filter(a=>a.live).length} APIs ready now</h2>
            <p className="text-white/35">More added every week. Request any API and we'll add it.</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {APIS.map(a => (
              <div key={a.name}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  a.live
                    ? 'border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20'
                    : 'border-white/5 bg-transparent text-white/20'
                }`}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: a.live ? (CAT[a.cat]?.text || '#888') : 'rgba(255,255,255,0.15)' }}/>
                {a.name}
                {a.live && a.price === 'Free' && (
                  <span className="text-[10px] text-[#34d399] font-semibold">FREE</span>
                )}
                {!a.live && <span className="text-[10px] text-white/15">soon</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-5 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Start building today</h2>
          <p className="text-white/35 text-lg mb-8">Free APIs work immediately. No credit card. No setup.</p>
          <div className="flex items-center justify-center gap-3">
            {isLoggedIn ? (
              <button onClick={goDash} className="px-8 py-4 bg-[#34d399] text-[#050505] rounded-xl font-bold hover:bg-[#6ee7b7] transition-colors text-sm">
                Go to dashboard →
              </button>
            ) : (
              <>
                <button onClick={goSignup} className="px-8 py-4 bg-[#34d399] text-[#050505] rounded-xl font-bold hover:bg-[#6ee7b7] transition-colors text-sm">
                  Create free account →
                </button>
                <button onClick={goLogin} className="px-8 py-4 border border-white/10 text-white/50 rounded-xl hover:border-white/20 hover:text-white/70 transition-all text-sm">
                  Sign in
                </button>
              </>
            )}
          </div>
          <p className="text-white/15 text-xs mt-6">Paid APIs start from $0.001 per call · Top up with M-Pesa · Credits never expire</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-8 px-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#34d399] rounded-md flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-[#050505] rounded-sm"/>
            </div>
            <span className="font-bold text-sm">APIvault</span>
            <span className="text-white/15 text-xs ml-1">Built in Kenya 🇰🇪</span>
          </div>
          <div className="flex items-center gap-4">
            {[['Demo','#demo'],['Features','#features'],['APIs','#apis']].map(([l,h]) => (
              <button key={l}
                onClick={() => document.getElementById(h.slice(1))?.scrollIntoView({ behavior: 'smooth' })}
                className="mono text-xs text-white/20 hover:text-white/50 transition-colors">
                {l}
              </button>
            ))}
            {isLoggedIn ? (
              <button onClick={goLogout} className="mono text-xs text-white/20 hover:text-white/50 transition-colors">Sign out</button>
            ) : (
              <button onClick={goLogin} className="mono text-xs text-white/20 hover:text-white/50 transition-colors">Sign in</button>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}