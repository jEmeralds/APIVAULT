// client/src/pages/Landing.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const APIS = [
  { name: 'NewsAPI',        cat: 'data',     price: '$0.0020', status: 'live' },
  { name: 'Exchange Rates', cat: 'data',     price: 'free',    status: 'live' },
  { name: 'REST Countries', cat: 'data',     price: 'free',    status: 'live' },
  { name: 'IP Geolocation', cat: 'data',     price: 'free',    status: 'live' },
  { name: 'GitHub API',     cat: 'dev',      price: 'free',    status: 'live' },
  { name: 'Dictionary API', cat: 'dev',      price: 'free',    status: 'live' },
  { name: 'JokeAPI',        cat: 'dev',      price: 'free',    status: 'live' },
  { name: 'OpenWeather',    cat: 'data',     price: 'free',    status: 'live' },
  { name: 'GPT-4o',         cat: 'ai',       price: '$0.0080', status: 'soon' },
  { name: 'HeyGen',         cat: 'ai',       price: '$0.6000', status: 'soon' },
  { name: 'Stripe',         cat: 'payments', price: 'free',    status: 'soon' },
  { name: 'M-Pesa',         cat: 'payments', price: 'free',    status: 'soon' },
  { name: 'Twilio SMS',     cat: 'comms',    price: '$0.0090', status: 'soon' },
  { name: 'Grok Image',     cat: 'ai',       price: '$0.1197', status: 'soon' },
]

const CAT_COLOR = {
  ai:       '#a78bfa',
  data:     '#fbbf24',
  dev:      '#fb923c',
  payments: '#34d399',
  comms:    '#60a5fa',
}

const CODE_EXAMPLE = `// One vault key. Every API. Pay per call.
const res = await fetch('https://apivault.app/proxy/newsapi/top-headlines?country=ke', {
  headers: {
    'x-vault-key': 'sk-vault-••••••••••••••••••••',
  }
});

const { articles } = await res.json();
// → Live Kenyan headlines. Charged: $0.002`

export function Landing() {
  const nav = useNavigate()
  const [tick, setTick] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 100)
    const id = setInterval(() => setTick(t => (t + 1) % APIS.length), 1800)
    return () => clearInterval(id)
  }, [])

  // If already logged in, redirect
  useEffect(() => {
    const token = localStorage.getItem('token')
    const role  = localStorage.getItem('role')
    if (token) nav(role === 'admin' ? '/admin' : '/app')
  }, [])

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace" }}
      className="min-h-screen bg-[#080808] text-white overflow-x-hidden">

      {/* Google font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
        .sans { font-family: 'IBM Plex Sans', sans-serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes scanline { from{transform:translateY(-100%)} to{transform:translateY(100vh)} }
        .fade-up { animation: fadeUp 0.6s ease forwards; opacity: 0; }
        .delay-1 { animation-delay: 0.1s }
        .delay-2 { animation-delay: 0.2s }
        .delay-3 { animation-delay: 0.3s }
        .delay-4 { animation-delay: 0.4s }
        .delay-5 { animation-delay: 0.6s }
        .cursor::after { content:'█'; animation: blink 1s step-end infinite; }
        .grid-bg {
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .glow { box-shadow: 0 0 40px rgba(52,211,153,0.15); }
        .api-row:hover { background: rgba(255,255,255,0.04); }
      `}</style>

      {/* Nav */}
      <nav className="border-b border-white/5 px-6 h-14 flex items-center justify-between max-w-6xl mx-auto fade-up delay-1">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-[#34d399] rounded flex items-center justify-center">
            <div className="w-2 h-2 bg-[#080808] rounded-sm" />
          </div>
          <span className="mono font-semibold tracking-tight text-sm">APIvault</span>
          <span className="text-[10px] text-white/20 mono border border-white/10 px-1.5 py-0.5 rounded">beta</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => nav('/login')}
            className="mono text-xs text-white/40 hover:text-white/80 transition-colors">
            Sign in
          </button>
          <button onClick={() => nav('/login')}
            className="mono text-xs bg-[#34d399] text-[#080808] px-4 py-2 rounded font-semibold
              hover:bg-[#6ee7b7] transition-colors">
            Get started →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="grid-bg relative pt-24 pb-20 px-6 max-w-6xl mx-auto">

        {/* Status ticker */}
        <div className="fade-up delay-1 flex items-center gap-2 mb-8 w-fit">
          <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
          <span className="mono text-xs text-[#34d399]">
            {APIS.filter(a => a.status === 'live').length} APIs live
          </span>
          <span className="text-white/20 text-xs">·</span>
          <span className="mono text-xs text-white/30">gateway operational</span>
        </div>

        <h1 className="sans fade-up delay-2 text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6 max-w-4xl">
          One key.<br />
          <span className="text-[#34d399]">Every API.</span><br />
          Pay per call.
        </h1>

        <p className="sans fade-up delay-3 text-white/50 text-lg max-w-xl leading-relaxed mb-10">
          APIvault is a shared API gateway. Stop managing dozens of API keys and accounts.
          Get one vault key, call any API, pay only for what you use.
        </p>

        <div className="fade-up delay-4 flex flex-wrap gap-3 mb-16">
          <button onClick={() => nav('/login')}
            className="sans bg-[#34d399] text-[#080808] px-6 py-3 rounded font-semibold
              hover:bg-[#6ee7b7] transition-all text-sm glow">
            Start for free →
          </button>
          <button onClick={() => document.getElementById('apis').scrollIntoView({ behavior: 'smooth' })}
            className="sans border border-white/10 text-white/60 px-6 py-3 rounded font-medium
              hover:border-white/30 hover:text-white transition-all text-sm">
            Browse APIs
          </button>
        </div>

        {/* Code block */}
        <div className="fade-up delay-5 relative">
          <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-[#34d399]/20 via-transparent to-transparent" />
          <div className="relative bg-[#0d0d0d] border border-white/8 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <span className="mono text-xs text-white/20 ml-2">example.js</span>
            </div>
            <pre className="mono text-xs sm:text-sm p-5 text-white/70 leading-relaxed overflow-x-auto">
              {CODE_EXAMPLE.split('\n').map((line, i) => (
                <div key={i}>
                  {line.includes('sk-vault') ? (
                    <span>
                      {line.split('sk-vault')[0]}
                      <span className="text-[#34d399]">sk-vault-••••••••••••••••••••</span>
                      {line.split("'")[3] === ',' ? "'," : "'"}
                    </span>
                  ) : line.includes('→') ? (
                    <span className="text-white/30">{line}</span>
                  ) : line.startsWith('//') ? (
                    <span className="text-white/25">{line}</span>
                  ) : line.includes("'proxy/") ? (
                    <span>
                      {line.split("'proxy/")[0]}
                      <span className="text-[#fbbf24]">'proxy/newsapi/top-headlines?country=ke'</span>
                      {', {'}
                    </span>
                  ) : (
                    <span>{line}</span>
                  )}
                </div>
              ))}
            </pre>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="border-y border-white/5 py-6 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { n: '15+',   l: 'APIs available' },
            { n: '$0.00', l: 'to get started' },
            { n: '1',     l: 'key for everything' },
            { n: '100%',  l: 'pay per use' },
          ].map(s => (
            <div key={s.n} className="text-center">
              <div className="sans text-2xl font-bold text-[#34d399]">{s.n}</div>
              <div className="mono text-xs text-white/30 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* API catalogue */}
      <section id="apis" className="py-20 px-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="mono text-xs text-white/30 mb-2">// api registry</div>
            <h2 className="sans text-3xl font-bold">Available APIs</h2>
          </div>
          <div className="mono text-xs text-white/20 hidden sm:block">
            {APIS.filter(a => a.status === 'live').length} live · {APIS.filter(a => a.status === 'soon').length} coming soon
          </div>
        </div>

        <div className="border border-white/8 rounded-xl overflow-hidden">
          <div className="grid grid-cols-4 border-b border-white/5 px-4 py-2.5 bg-white/2">
            {['API', 'Category', 'Price / call', 'Status'].map(h => (
              <div key={h} className="mono text-xs text-white/25">{h}</div>
            ))}
          </div>
          {APIS.map((a, i) => (
            <div key={i} className="api-row grid grid-cols-4 items-center px-4 py-3 border-b border-white/4 last:border-0 transition-colors cursor-default">
              <div className="sans text-sm font-medium text-white/80">{a.name}</div>
              <div>
                <span className="mono text-xs px-2 py-0.5 rounded-sm"
                  style={{ color: CAT_COLOR[a.cat], background: CAT_COLOR[a.cat] + '18' }}>
                  {a.cat}
                </span>
              </div>
              <div className="mono text-xs text-white/50">{a.price}</div>
              <div>
                {a.status === 'live' ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
                    <span className="mono text-xs text-[#34d399]">live</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    <span className="mono text-xs text-white/25">soon</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 max-w-6xl mx-auto border-t border-white/5">
        <div className="mono text-xs text-white/30 mb-2">// how it works</div>
        <h2 className="sans text-3xl font-bold mb-12">Three steps to any API</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { n: '01', title: 'Create account', body: 'Sign up and get approved. Takes under 5 minutes. No credit card required to start.' },
            { n: '02', title: 'Get your vault key', body: 'One key unlocks every API in the vault. Add credits when you need them. Pay only per call.' },
            { n: '03', title: 'Start calling', body: 'Add x-vault-key to your request header. No SDK. No setup. Works with any language or framework.' },
          ].map(s => (
            <div key={s.n} className="border border-white/8 rounded-xl p-6 hover:border-white/20 transition-colors">
              <div className="mono text-4xl font-bold text-white/8 mb-4">{s.n}</div>
              <div className="sans text-base font-semibold mb-2">{s.title}</div>
              <div className="sans text-sm text-white/40 leading-relaxed">{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Why APIvault */}
      <section className="py-20 px-6 max-w-6xl mx-auto border-t border-white/5">
        <div className="mono text-xs text-white/30 mb-2">// why apivault</div>
        <h2 className="sans text-3xl font-bold mb-12">Built for African developers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: '🔑', title: 'One key, all APIs', body: 'Stop juggling API keys. One vault key replaces dozens of accounts.' },
            { icon: '💳', title: 'Pay as you go', body: 'No monthly subscriptions. Buy credits and use them. Credits never expire.' },
            { icon: '🌍', title: 'Africa-first', body: 'M-Pesa, Paystack, and other African APIs coming. Built with the Kenyan market in mind.' },
            { icon: '⚡', title: 'Instant integration', body: 'No SDK needed. Works with fetch, axios, requests — any HTTP client.' },
            { icon: '🛡️', title: 'Your keys stay safe', body: 'API master keys never leave our servers. Your code never touches them.' },
            { icon: '📊', title: 'Full visibility', body: 'See every call you make, every credit spent. Full usage dashboard included.' },
          ].map(f => (
            <div key={f.title} className="flex gap-4 p-5 border border-white/5 rounded-xl hover:border-white/15 transition-colors">
              <div className="text-2xl flex-shrink-0">{f.icon}</div>
              <div>
                <div className="sans text-sm font-semibold mb-1">{f.title}</div>
                <div className="sans text-sm text-white/40 leading-relaxed">{f.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mono text-xs text-[#34d399] mb-4">// ready to build?</div>
          <h2 className="sans text-4xl sm:text-5xl font-bold mb-6 leading-tight">
            Start with free APIs.<br />Scale when you need to.
          </h2>
          <p className="sans text-white/40 mb-8 text-lg">
            No credit card. No setup fees. Just sign up and start building.
          </p>
          <button onClick={() => nav('/login')}
            className="sans bg-[#34d399] text-[#080808] px-8 py-4 rounded font-bold
              hover:bg-[#6ee7b7] transition-all text-base glow">
            Create free account →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#34d399] rounded flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-[#080808] rounded-sm" />
            </div>
            <span className="mono text-xs text-white/30">APIvault · Built in Kenya</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => nav('/login')}
              className="mono text-xs text-white/30 hover:text-white/60 transition-colors">
              Sign in
            </button>
            <button onClick={() => nav('/login')}
              className="mono text-xs text-white/30 hover:text-white/60 transition-colors">
              Get started
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}