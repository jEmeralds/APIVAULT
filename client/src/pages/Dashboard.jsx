// client/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'

const CAT_DOT = {
  ai:       'bg-purple-400',
  payments: 'bg-green-400',
  comms:    'bg-blue-400',
  data:     'bg-amber-400',
  dev:      'bg-orange-400',
}

export function Dashboard() {
  const [me, setMe]        = useState(null)
  const [apis, setAPIs]    = useState([])
  const [usage, setUsage]  = useState([])
  const [tab, setTab]      = useState('apis')
  const [key, setKey]      = useState(null)
  const [selected, setSel] = useState(null)
  const [notice, setNotice] = useState(null)
  const nav = useNavigate()

  useEffect(() => {
    Promise.all([api.me(), api.myAPIs(), api.usage()])
      .then(([m, a, u]) => { setMe(m); setAPIs(a); setUsage(u) })
      .catch(() => { localStorage.clear(); nav('/') })

    // Paystack callback
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('reference')
    if (ref) {
      api.verifyPayment(ref)
        .then(r => {
          setNotice({ ok: r.ok, msg: r.ok ? `$${r.amount} credits added.` : 'Payment could not be verified.' })
          window.history.replaceState({}, '', '/app')
          api.me().then(m => setMe(m))
        })
        .catch(() => setNotice({ ok: false, msg: 'Verification failed. Contact support.' }))
    }
  }, [])

  function signOut() { localStorage.clear(); nav('/') }

  if (!me) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
    </div>
  )

  const cats = [...new Set(apis.map(a => a.category))]

  return (
    <div className="min-h-screen bg-[#fafafa]">

      {/* Top nav */}
      <div className="h-14 border-b border-gray-100 bg-white flex items-center px-6 gap-6">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gray-900 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight">APIvault</span>
        </div>

        <div className="flex gap-1">
          {['apis', 'usage', 'credits'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 text-sm rounded-lg transition-colors capitalize ${
                tab === t
                  ? 'bg-gray-900 text-white font-medium'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}>
              {t}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-medium text-gray-900">${parseFloat(me.credits).toFixed(2)}</div>
            <div className="text-xs text-gray-400">credits</div>
          </div>
          <div className="w-px h-5 bg-gray-100" />
          <div className="text-xs text-gray-500">{me.email}</div>
          <button onClick={signOut} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Notice */}
        {notice && (
          <div className={`mb-6 flex items-center gap-3 p-3.5 rounded-xl border text-sm
            ${notice.ok ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
            <span className="flex-1">{notice.msg}</span>
            <button onClick={() => setNotice(null)} className="opacity-50 hover:opacity-100">×</button>
          </div>
        )}

        {/* APIs tab */}
        {tab === 'apis' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-semibold text-gray-900">Your APIs</h1>
              <span className="text-xs text-gray-400">{apis.length} available</span>
            </div>

            {apis.length === 0 && (
              <div className="text-center py-16 text-gray-300 text-sm">
                No APIs available for your plan yet. Contact your administrator.
              </div>
            )}

            {cats.map(cat => (
              <div key={cat} className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${CAT_DOT[cat]}`} />
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{cat}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {apis.filter(a => a.category === cat).map(a => (
                    <button key={a.slug}
                      onClick={() => setSel(selected?.slug === a.slug ? null : a)}
                      className={`text-left p-4 border rounded-xl transition-all ${
                        selected?.slug === a.slug
                          ? 'border-gray-900 bg-white shadow-sm'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-gray-900">{a.name}</span>
                        <span className="text-xs text-gray-400">
                          {a.cost_per_call > 0 ? `$${a.cost_per_call}` : 'free'}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-gray-300">/proxy/{a.slug}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {selected && (
              <div className="mt-4 p-5 border border-gray-900 rounded-2xl bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">{selected.name}</h3>
                  <button onClick={() => setSel(null)} className="text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>
                </div>
                <div className="bg-gray-950 rounded-xl p-4 font-mono text-xs">
                  <div className="text-gray-500 mb-3">// Node.js</div>
                  <div className="text-gray-100">
                    <span className="text-blue-400">const</span> res = <span className="text-blue-400">await</span>{' '}
                    <span className="text-yellow-300">fetch</span>(<span className="text-green-300">{`'${import.meta.env.VITE_API_URL || ''}/proxy/${selected.slug}'`}</span>, {'{'}
                  </div>
                  <div className="text-gray-100 ml-4">method: <span className="text-green-300">'POST'</span>,</div>
                  <div className="text-gray-100 ml-4">headers: {'{ '}<span className="text-green-300">'x-vault-key'</span>: <span className="text-amber-300">'sk-vault-...'</span> {' }'},</div>
                  <div className="text-gray-100 ml-4">body: <span className="text-blue-400">JSON</span>.stringify({'{ /* your payload */ }'})</div>
                  <div className="text-gray-100">{'}'});</div>
                </div>
                <div className="flex gap-4 mt-3 text-xs text-gray-400">
                  <span>Unit: {selected.billing_unit}</span>
                  <span>·</span>
                  <span>Cost: ${selected.cost_per_call}</span>
                  <span>·</span>
                  <span>Markup: {selected.markup}%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Usage tab */}
        {tab === 'usage' && (
          <div>
            <h1 className="font-semibold text-gray-900 mb-6">Usage</h1>
            <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Time', 'API', 'Charged', 'Status'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usage.map((u, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{new Date(u.ts).toLocaleTimeString()}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{u.api_registry?.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">${parseFloat(u.charged || 0).toFixed(4)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border
                          ${u.http_status < 300 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                          {u.http_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!usage.length && (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-300 text-sm">No calls yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Credits tab */}
        {tab === 'credits' && (
          <div className="max-w-sm">
            <h1 className="font-semibold text-gray-900 mb-6">Credits</h1>

            <div className="p-5 border border-gray-100 rounded-xl bg-white mb-3">
              <div className="text-xs text-gray-400 mb-1">Current balance</div>
              <div className="text-3xl font-semibold tracking-tight">${parseFloat(me.credits).toFixed(2)}</div>
            </div>

            <div className="p-5 border border-gray-100 rounded-xl bg-white mb-3">
              <div className="text-xs text-gray-400 mb-3">Buy credits via Paystack</div>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 25, 50].map(amt => (
                  <button key={amt}
                    onClick={async () => {
                      try { const { url } = await api.buyCredits(amt); window.location.href = url }
                      catch (e) { setNotice({ ok: false, msg: e.message }) }
                    }}
                    className="py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:border-gray-900 hover:text-gray-900 transition-all text-gray-600">
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 border border-gray-100 rounded-xl bg-white">
              <div className="text-xs text-gray-400 mb-3">Your vault key</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2.5 font-mono text-xs text-gray-600 truncate">
                  {key || 'sk-vault-••••••••••••••••••••••••••••••••••••'}
                </div>
                <button onClick={async () => {
                  const { key: k } = await api.revealKey()
                  setKey(k)
                }} className="px-3 py-2 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 transition-colors whitespace-nowrap">
                  {key ? 'Copy' : 'Reveal'}
                </button>
              </div>
              <p className="text-xs text-gray-300 mt-2">Use this key in the x-vault-key header for API calls</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}