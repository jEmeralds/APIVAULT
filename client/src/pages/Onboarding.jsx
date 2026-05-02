// client/src/pages/Onboarding.jsx
// Shown on first login — walks user through getting their vault key and making first call
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'

const BASE = 'https://apivault-production-736c.up.railway.app'

export function Onboarding({ me, onComplete }) {
  const [step, setStep]         = useState(1)
  const [vaultKey, setVaultKey] = useState(null)
  const [copied, setCopied]     = useState(false)
  const [trying, setTrying]     = useState(false)
  const [result, setResult]     = useState(null)

  async function revealKey() {
    const { key } = await api.revealKey()
    setVaultKey(key)
    navigator.clipboard?.writeText(key)
    setCopied(true)
  }

  async function tryCall() {
    setTrying(true)
    try {
      const uuid = vaultKey.replace('sk-vault-', '')
      const res  = await fetch(`${BASE}/proxy/jokeapi/joke/Programming?type=single`, {
        headers: { 'x-vault-key': uuid }
      })
      const data = await res.json()
      setResult({ ok: res.ok, data })
    } catch (e) { setResult({ ok: false, error: e.message }) }
    setTrying(false)
  }

  const PLAN_APIS = {
    dev:      'AI, Dev tools, and Data APIs',
    creator:  'AI, Comms, and Data APIs',
    business: 'All APIs — AI, Payments, Comms, Data, and Dev tools',
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-4">
            <div className="w-3 h-3 rounded-full bg-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome to APIvault</h1>
          <p className="text-gray-400 text-sm mt-1">Let's get you making API calls in under 2 minutes</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                ${step > s ? 'bg-green-500 text-white' : step === s ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {step > s ? '✓' : s}
              </div>
              {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1 — Your plan */}
        {step === 1 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Step 1 of 3</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Your plan is active</h2>
            <p className="text-sm text-gray-500 mb-5">
              You're on the <strong className="capitalize text-gray-900">{me?.plan}</strong> plan.
              You have instant access to:
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <div className="text-sm font-medium text-gray-900 mb-3">
                {PLAN_APIS[me?.plan] || PLAN_APIS.dev}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'JokeAPI',        free: true },
                  { name: 'Dictionary API', free: true },
                  { name: 'GitHub API',     free: true },
                  { name: 'Exchange Rates', free: true },
                  { name: 'REST Countries', free: true },
                  { name: 'IP Geolocation', free: true },
                  { name: 'NewsAPI',        free: false, price: '$0.002' },
                  { name: 'OpenWeather',    free: true },
                ].map(a => (
                  <div key={a.name} className="flex items-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                    <span className="text-gray-700">{a.name}</span>
                    <span className="text-gray-400 ml-auto">{a.free ? 'free' : a.price}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5 text-xs text-blue-700">
              💡 Free APIs cost nothing. Paid APIs deduct from your credits balance. You start with $0 — top up anytime from the Billing tab.
            </div>

            <button onClick={() => setStep(2)}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors">
              Got it, next →
            </button>
          </div>
        )}

        {/* Step 2 — Get vault key */}
        {step === 2 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Step 2 of 3</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Get your vault key</h2>
            <p className="text-sm text-gray-500 mb-5">
              This is the only credential you need. Add it to every API request as the
              <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-700 mx-1">x-vault-key</code>
              header.
            </p>

            {!vaultKey ? (
              <button onClick={revealKey}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors mb-4">
                Reveal my vault key
              </button>
            ) : (
              <div className="mb-4">
                <div className="bg-gray-950 rounded-xl p-4 font-mono text-xs text-green-400 break-all mb-2">
                  {vaultKey}
                </div>
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <span>✓ Copied to clipboard</span>
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-5 text-xs text-amber-700">
              🔒 Keep this key secret. Anyone with it can make API calls billed to your account. You can find it anytime in the Billing tab.
            </div>

            <button onClick={() => setStep(3)} disabled={!vaultKey}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40">
              Next — make your first call →
            </button>
          </div>
        )}

        {/* Step 3 — First API call */}
        {step === 3 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Step 3 of 3</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Make your first API call</h2>
            <p className="text-sm text-gray-500 mb-4">
              Let's call JokeAPI — it's free and instant. Here's the code:
            </p>

            <div className="bg-gray-950 rounded-xl p-4 mb-4 overflow-x-auto">
              <pre className="font-mono text-xs text-gray-300 leading-relaxed whitespace-pre">{`const res = await fetch(
  '${BASE}/proxy/jokeapi/joke/Programming?type=single',
  { headers: { 'x-vault-key': '${vaultKey || 'YOUR_VAULT_KEY'}' } }
);
const data = await res.json();
console.log(data.joke);`}</pre>
            </div>

            <button onClick={tryCall} disabled={trying}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700
                transition-colors mb-4 flex items-center justify-center gap-2 disabled:opacity-50">
              {trying
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Running...</span></>
                : '▶ Run it live'}
            </button>

            {result && (
              <div className={`rounded-xl p-4 border mb-4 ${result.ok ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                {result.ok ? (
                  <>
                    <div className="text-xs font-semibold text-green-700 mb-2">✓ It works! Here's your joke:</div>
                    <div className="text-sm text-gray-700 italic">"{result.data?.joke || result.data?.setup}"</div>
                  </>
                ) : (
                  <div className="text-xs text-red-600">{result.error}</div>
                )}
              </div>
            )}

            {result?.ok && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-4 text-xs text-gray-500">
                🎉 You just made your first API call through APIvault. The gateway authenticated your key, routed the request, and returned the response — all in milliseconds.
              </div>
            )}

            <button onClick={onComplete}
              className={`w-full py-3 rounded-xl font-semibold transition-colors
                ${result?.ok
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
              {result?.ok ? 'Go to dashboard →' : 'Skip to dashboard →'}
            </button>
          </div>
        )}

        {/* Skip */}
        {step < 3 && (
          <button onClick={onComplete}
            className="w-full mt-3 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Skip onboarding
          </button>
        )}
      </div>
    </div>
  )
}