// client/src/pages/Login.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'

const BASE = import.meta.env.VITE_API_URL || ''

export function Login() {
  const [tab, setTab]           = useState('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [plan, setPlan]         = useState('dev')
  const [msg, setMsg]           = useState(null)   // { ok, text }
  const [loading, setLoading]   = useState(false)
  const [stage, setStage]       = useState('form') // form | sent | verified | error
  const nav = useNavigate()

  // Handle email verification redirect: /app?token=xxx or /?token=xxx
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token  = params.get('token')
    if (!token) return

    setStage('verifying')
    fetch(`${BASE}/auth/verify?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) setStage('verified')
        else { setStage('error'); setMsg({ ok: false, text: d.error }) }
      })
      .catch(() => { setStage('error'); setMsg({ ok: false, text: 'Verification failed. Try again.' }) })

    window.history.replaceState({}, '', '/')
  }, [])

  function reset() { setEmail(''); setPassword(''); setConfirm(''); setMsg(null) }

  // ── Sign in ──────────────────────────────────────────────────────────────
  async function signIn(e) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true); setMsg(null)

    const data = await api.login(email, password)

    if (data.error === 'pending') {
      setMsg({ ok: false, text: data.message, isPending: true })
      setLoading(false)
      return
    }

    if (data.error || data.token === undefined) {
      setMsg({ ok: false, text: data.message || data.error || 'Sign in failed' })
      setLoading(false)
      return
    }

    localStorage.setItem('token', data.token)
    localStorage.setItem('role',  data.role)
    nav(data.role === 'admin' ? '/admin' : '/app')
  }

  // ── Sign up ──────────────────────────────────────────────────────────────
  async function signUp(e) {
    e.preventDefault()
    if (!email || !password || !confirm) return

    // Client-side checks before hitting server
    if (password !== confirm) { setMsg({ ok: false, text: 'Passwords do not match' }); return }
    if (password.length < 8)  { setMsg({ ok: false, text: 'Password must be at least 8 characters' }); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMsg({ ok: false, text: 'Enter a valid email address' }); return }

    setLoading(true); setMsg(null)

    try {
      const res = await fetch(`${BASE}/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email,
          password,
          plan,
          honeypot: '',  // always empty for real users — bots fill this
        }),
      })
      const data = await res.json()

      if (data.error) {
        setMsg({ ok: false, text: data.error })
      } else {
        setStage('sent')
      }
    } catch {
      setMsg({ ok: false, text: 'Could not connect. Try again.' })
    }

    setLoading(false)
  }

  // ── Special states ───────────────────────────────────────────────────────

  if (stage === 'verifying') return <FullPage><Spinner text="Verifying your email..." /></FullPage>

  if (stage === 'verified') return (
    <FullPage>
      <StatusCard
        icon="✓"
        iconColor="bg-green-500"
        title="Email verified"
        body="Your email has been verified. Your account is now pending admin approval. You will receive an email once approved."
        action={{ label: 'Back to sign in', onClick: () => { setStage('form'); setTab('signin') } }}
      />
    </FullPage>
  )

  if (stage === 'error') return (
    <FullPage>
      <StatusCard
        icon="×"
        iconColor="bg-red-500"
        title="Verification failed"
        body={msg?.text || 'The verification link is invalid or has expired.'}
        action={{ label: 'Back to sign in', onClick: () => { setStage('form'); setTab('signin') } }}
      />
    </FullPage>
  )

  if (stage === 'sent') return (
    <FullPage>
      <StatusCard
        icon="✉"
        iconColor="bg-gray-900"
        title="Check your email"
        body={`We sent a verification link to ${email}. Click the link to verify your address. After verification, an admin will review and approve your account.`}
        sub="Didn't get it? Check your spam folder."
        action={{ label: 'Back', onClick: () => { setStage('form'); setTab('signup') } }}
      />
    </FullPage>
  )

  // ── Main form ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex">

      {/* Left branding panel */}
      <div className="hidden lg:flex w-[400px] flex-col bg-[#0a0a0a] p-10 justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-black" />
          </div>
          <span className="text-white font-medium tracking-tight">APIvault</span>
        </div>
        <div>
          <p className="text-[#555] text-sm leading-relaxed mb-8">
            The shared API gateway for developers and creators. One key, every API, pay only for what you use.
          </p>
          <div className="space-y-3">
            {[
              { n: '10×',  l: 'Lower cost per API call' },
              { n: '30s',  l: 'To integrate any API' },
              { n: '100%', l: 'Uptime with pool failover' },
            ].map(s => (
              <div key={s.n} className="flex items-center gap-3">
                <span className="text-white font-semibold text-sm w-12">{s.n}</span>
                <span className="text-[#555] text-sm">{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[360px]">

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-8">
            {[
              { id: 'signin', label: 'Sign in' },
              { id: 'signup', label: 'Create account' },
            ].map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); reset() }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  tab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Sign in form */}
          {tab === 'signin' && (
            <form onSubmit={signIn} className="space-y-3">
              <Field label="Email">
                <Input type="email" autoComplete="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </Field>
              <Field label="Password">
                <Input type="password" autoComplete="current-password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} />
              </Field>

              {msg && <Alert ok={msg.ok} text={msg.text} />}

              <button type="submit" disabled={loading || !email || !password}
                className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg
                  hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-1">
                {loading ? 'Signing in...' : 'Continue'}
              </button>
            </form>
          )}

          {/* Sign up form */}
          {tab === 'signup' && (
            <form onSubmit={signUp} className="space-y-3">
              {/* Honeypot — hidden from real users */}
              <input name="website" type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

              <Field label="Email">
                <Input type="email" autoComplete="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </Field>
              <Field label="Password">
                <Input type="password" placeholder="Min 8 characters"
                  value={password} onChange={e => setPassword(e.target.value)} />
              </Field>
              <Field label="Confirm password">
                <Input type="password" placeholder="••••••••"
                  value={confirm} onChange={e => setConfirm(e.target.value)} />
              </Field>
              <Field label="I am a...">
                <select value={plan} onChange={e => setPlan(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white transition-all">
                  <option value="dev">Developer — AI & dev tools</option>
                  <option value="creator">Creator — AI & comms APIs</option>
                  <option value="business">Business — payments, data & comms</option>
                </select>
              </Field>

              {msg && <Alert ok={msg.ok} text={msg.text} />}

              <button type="submit" disabled={loading || !email || !password || !confirm}
                className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg
                  hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-1">
                {loading ? 'Creating account...' : 'Request access'}
              </button>

              <div className="pt-1 space-y-1">
                <p className="text-xs text-gray-300 text-center">
                  Email verification required · Admin approval needed
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Shared UI components ─────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Input(props) {
  return (
    <input {...props}
      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg
        focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
        placeholder:text-gray-300 transition-all" />
  )
}

function Alert({ ok, text }) {
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border text-xs
      ${ok ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
      <div className="w-1.5 h-1.5 rounded-full bg-current mt-0.5 flex-shrink-0" />
      {text}
    </div>
  )
}

function FullPage({ children }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-[360px]">{children}</div>
    </div>
  )
}

function StatusCard({ icon, iconColor, title, body, sub, action }) {
  return (
    <div className="text-center">
      <div className={`w-12 h-12 ${iconColor} rounded-xl flex items-center justify-center text-white text-xl font-medium mx-auto mb-4`}>
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-500 leading-relaxed mb-2">{body}</p>
      {sub && <p className="text-xs text-gray-300 mb-6">{sub}</p>}
      {action && (
        <button onClick={action.onClick}
          className="text-sm text-gray-900 font-medium underline underline-offset-2 hover:no-underline transition-all">
          {action.label}
        </button>
      )}
    </div>
  )
}

function Spinner({ text }) {
  return (
    <div className="text-center">
      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  )
}