// client/src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'

export function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr]           = useState('')
  const [loading, setLoading]   = useState(false)
  const nav = useNavigate()

  async function submit(e) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true); setErr('')

    const data = await api.login(email, password)

    if (data.error) {
      setErr(data.error)
      setLoading(false)
      return
    }

    localStorage.setItem('token', data.token)
    localStorage.setItem('role',  data.role)
    nav(data.role === 'admin' ? '/admin' : '/app')
  }

  return (
    <div className="min-h-screen bg-white flex">

      {/* Left panel — branding */}
      <div className="hidden lg:flex w-[420px] flex-col bg-[#0a0a0a] p-10 justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-black" />
          </div>
          <span className="text-white font-medium tracking-tight">APIvault</span>
        </div>
        <div>
          <p className="text-[#888] text-sm leading-relaxed mb-8">
            The shared API gateway for developers and creators. One key, every API, pay only for what you use.
          </p>
          <div className="space-y-3">
            {[
              { n: '10×', l: 'Lower cost per API call' },
              { n: '30s', l: 'To integrate any API' },
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

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[340px]">

          <div className="mb-8">
            <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight mb-1">
              Sign in
            </h1>
            <p className="text-sm text-gray-400">Enter your credentials to continue</p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                  placeholder:text-gray-300 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                  placeholder:text-gray-300 transition-all"
              />
            </div>

            {err && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                <p className="text-xs text-red-600">{err}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg
                hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed
                transition-all mt-1"
            >
              {loading ? 'Signing in...' : 'Continue'}
            </button>
          </form>

          <p className="text-xs text-gray-300 text-center mt-6">
            Contact your administrator for access
          </p>
        </div>
      </div>
    </div>
  )
}