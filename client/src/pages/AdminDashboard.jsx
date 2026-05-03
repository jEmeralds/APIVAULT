// client/src/pages/AdminDashboard.jsx
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'

const BASE = import.meta.env.VITE_API_URL || ''

// ─── Primitives ───────────────────────────────────────────────────────────

function Badge({ children, color = 'gray' }) {
  const c = {
    green:  'bg-green-50 text-green-700 border-green-100',
    red:    'bg-red-50 text-red-600 border-red-100',
    amber:  'bg-amber-50 text-amber-700 border-amber-100',
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    gray:   'bg-gray-50 text-gray-600 border-gray-100',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${c[color]}`}>
      {children}
    </span>
  )
}

function Stat({ label, value, sub, accent }) {
  return (
    <div className="p-4 border border-gray-100 rounded-xl bg-white">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-semibold tracking-tight ${accent || 'text-gray-900'}`}>{value ?? '—'}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function Table({ cols, rows, empty = 'No data' }) {
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden overflow-x-auto">
      <table className="w-full text-sm min-w-[500px]">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {cols.map(c => (
              <th key={c} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-sm text-gray-300">{empty}</td></tr>
            : rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                {r.map((cell, j) => <td key={j} className="px-4 py-3 text-gray-700">{cell}</td>)}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  )
}

function Loader() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
    </div>
  )
}

function BarChart({ data, valueKey, labelKey, color = 'bg-indigo-500', formatVal }) {
  if (!data?.length) return <div className="text-xs text-gray-300 py-4 text-center">No data yet</div>
  const max = Math.max(...data.map(d => d[valueKey])) || 1
  return (
    <div className="flex items-end gap-1 h-20 mt-2">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block
            bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
            {d[labelKey]}: {formatVal ? formatVal(d[valueKey]) : d[valueKey]}
          </div>
          <div className={`w-full rounded-sm ${color} opacity-70 hover:opacity-100 transition-all`}
            style={{ height: `${Math.max((d[valueKey] / max) * 72, 2)}px` }} />
        </div>
      ))}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl border border-gray-100 shadow-xl p-4 sm:p-6 w-full max-w-md mx-3 sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Input(props) {
  return (
    <input {...props}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
        focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
        placeholder:text-gray-300 transition-all" />
  )
}

function ModalActions({ onClose, onSave, saving, saveLabel = 'Save', saveColor }) {
  return (
    <div className="flex gap-2 mt-6">
      <button onClick={onClose}
        className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
        Cancel
      </button>
      <button onClick={onSave} disabled={saving}
        className={`flex-1 py-2 text-sm rounded-lg font-medium disabled:opacity-40 transition-colors
          ${saveColor || 'bg-gray-900 text-white hover:bg-gray-800'}`}>
        {saving ? 'Saving...' : saveLabel}
      </button>
    </div>
  )
}

// ─── Overview ─────────────────────────────────────────────────────────────

function Overview({ d }) {
  if (!d) return <Loader />
  // System alerts only on overview — user signups handled in Users tab
  const unresolved = d.alerts?.filter(a =>
    !a.resolved &&
    !['user_pending','user_verified','api_requested'].includes(a.type)
  ) || []
  const pendingUsers = d.alerts?.filter(a =>
    !a.resolved && a.type === 'user_pending'
  ).length || 0
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Stat label="Total APIs"    value={d.api_count} />
        <Stat label="Active users"  value={d.user_count} />
        <Stat label="Today revenue" value={`$${d.today_revenue?.toFixed(2)}`} accent="text-green-600" />
        <Stat label="Today profit"  value={`$${d.today_profit?.toFixed(2)}`}  accent="text-green-600" />
        <Stat label="Calls today"   value={d.today_calls?.toLocaleString()} />
        <Stat label="Errors today"  value={d.today_errors} accent={d.today_errors > 0 ? 'text-red-500' : ''} />
        <Stat label="24h burn"      value={`$${d.burn_rate_24h?.toFixed(2)}`} />
        <Stat label="Open alerts"   value={unresolved.length} accent={unresolved.length > 0 ? 'text-amber-500' : ''} />
        <Stat label="Pending users"  value={pendingUsers} accent={pendingUsers > 0 ? 'text-blue-500' : ''} />
      </div>

      {unresolved.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Alerts</h3>
          <div className="space-y-2">
            {unresolved.map(a => (
              <div key={a.id} className={`flex items-start gap-3 p-3.5 rounded-xl border text-sm
                ${a.type === 'user_pending' || a.type === 'user_verified'
                  ? 'bg-blue-50 border-blue-100 text-blue-700'
                  : a.type.includes('empty') || a.type.includes('critical')
                  ? 'bg-red-50 border-red-100 text-red-700'
                  : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-current mt-1.5 flex-shrink-0" />
                <span className="flex-1">{a.message}</span>
                <button onClick={() => api.resolve(a.id).then(() => window.location.reload())}
                  className="text-xs underline opacity-60 hover:opacity-100 flex-shrink-0">
                  dismiss
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {d.top_apis?.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Top APIs today</h3>
          <Table
            cols={['API', 'Calls', 'Cost', 'Revenue', 'Profit']}
            rows={d.top_apis.map(a => [
              <span className="font-medium text-gray-900">{a.api_name}</span>,
              parseInt(a.call_count).toLocaleString(),
              `$${parseFloat(a.total_cost || 0).toFixed(3)}`,
              `$${parseFloat(a.total_charged || 0).toFixed(3)}`,
              <span className="text-green-600">${parseFloat((a.total_charged - a.total_cost) || 0).toFixed(3)}</span>,
            ])}
          />
        </div>
      )}

      <div>
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Pool health</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {d.pools?.map(p => {
            const pct = p.floor > 0 ? Math.round((p.balance / p.floor) * 100) : 100
            const bar = pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-500'
            return (
              <div key={p.id} className="p-3.5 border border-gray-100 rounded-xl">
                <div className="text-xs text-gray-400 mb-1 truncate">{p.label}</div>
                <div className="font-semibold text-sm mb-2">${p.balance?.toFixed(0)}</div>
                <div className="h-1 bg-gray-100 rounded-full">
                  <div className={`h-1 rounded-full ${bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="text-xs text-gray-300 mt-1">{pct}%</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── APIs ─────────────────────────────────────────────────────────────────

function APIs({ d, onRefresh }) {
  const [modal, setModal] = useState(null)
  const [form, setForm]   = useState({})
  const [saving, setSaving] = useState(false)
  if (!d) return <Loader />

  const CAT_COLOR    = { ai: 'blue', payments: 'green', comms: 'gray', data: 'amber', dev: 'gray' }
  const STATUS_COLOR = { live: 'green', paused: 'amber', pending: 'gray' }

  async function save() {
    setSaving(true)
    try {
      if (modal === 'add') {
        await api.addAPI(form)
      } else {
        await api.editAPI(form.id, {
          cost_per_call: parseFloat(form.cost_per_call),
          markup:        parseFloat(form.markup),
          status:        form.status,
          description:   form.description,
        })
        // Rotate master key if a new one was provided
        if (form.newMasterKey?.trim()) {
          await api.rotateKey(form.slug, form.newMasterKey.trim())
        }
      }
      setModal(null); onRefresh()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-gray-900">API Registry</h2>
          <p className="text-xs text-gray-400 mt-0.5">{d.length} APIs registered</p>
        </div>
        <button onClick={() => { setForm({}); setModal('add') }}
          className="px-3.5 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors">
          + Add API
        </button>
      </div>

      <Table
        cols={['Name', 'Category', 'Cost', 'Master Key', 'Status', '']}
        rows={d.map(a => {
          const keyType = a.master_key_ref === 'no-key-required' ? 'not-needed'
            : (a.master_key_ref && a.master_key_ref.length > 5) ? 'configured' : 'missing'
          return [
            <span className="font-medium text-gray-900">{a.name}</span>,
            <Badge color={CAT_COLOR[a.category]}>{a.category}</Badge>,
            <span className="font-mono text-xs">{a.cost_per_call > 0 ? `$${a.cost_per_call}` : 'free'}</span>,
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md ${
              keyType === 'configured' ? 'bg-green-50 text-green-700' :
              keyType === 'not-needed' ? 'bg-gray-50 text-gray-400' :
                                         'bg-red-50 text-red-600'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                keyType === 'configured' ? 'bg-green-500' :
                keyType === 'not-needed' ? 'bg-gray-300' : 'bg-red-500'
              }`} />
              {keyType === 'configured' ? 'Key set' : keyType === 'not-needed' ? 'No key needed' : '⚠ Missing key'}
            </span>,
            <Badge color={STATUS_COLOR[a.status]}>{a.status}</Badge>,
            <button onClick={() => { setForm(a); setModal('edit') }}
              className="text-xs text-gray-400 hover:text-gray-900 transition-colors">Edit</button>,
          ]
        })}
      />

      {modal && (
        <Modal title={modal === 'add' ? 'Add API' : `Edit — ${form.name}`} onClose={() => setModal(null)}>
          {modal === 'add' ? (
            <>
              <Field label="Name"><Input placeholder="Grok Image" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
              <Field label="Slug"><Input placeholder="grok-image" onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} /></Field>
              <Field label="Upstream URL"><Input placeholder="https://api.x.ai/v1" onChange={e => setForm(f => ({ ...f, upstreamUrl: e.target.value }))} /></Field>
              <Field label="Master API key"><Input type="password" placeholder="sk-..." onChange={e => setForm(f => ({ ...f, masterKey: e.target.value }))} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cost / call ($)"><Input type="number" placeholder="0.07" onChange={e => setForm(f => ({ ...f, costPerCall: e.target.value }))} /></Field>
                <Field label="Markup (%)"><Input type="number" placeholder="71" onChange={e => setForm(f => ({ ...f, markup: e.target.value }))} /></Field>
              </div>
            </>
          ) : (
            <>
              <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">Upstream URL</div>
                <div className="font-mono text-xs text-gray-600 truncate">{form.upstream_url}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cost / call ($)">
                  <Input type="number" value={form.cost_per_call}
                    onChange={e => setForm(f => ({ ...f, cost_per_call: e.target.value }))} />
                </Field>
                <Field label="Markup (%)">
                  <Input type="number" value={form.markup}
                    onChange={e => setForm(f => ({ ...f, markup: e.target.value }))} />
                </Field>
              </div>
              <Field label="Status">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                  <option value="live">live</option>
                  <option value="paused">paused</option>
                </select>
              </Field>
              <Field label="Description">
                <Input placeholder="One line description of what this API does"
                  value={form.description || ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </Field>
              <Field label="New master API key">
                <Input type="password" placeholder="Paste new key to rotate (leave blank to keep current)"
                  value={form.newMasterKey || ''}
                  onChange={e => setForm(f => ({ ...f, newMasterKey: e.target.value }))} />
              </Field>
              <p className="text-xs text-gray-300 -mt-2 mb-2">
                Current key ref: <span className="font-mono">{form.master_key_ref}</span>
              </p>
            </>
          )}
          <ModalActions onClose={() => setModal(null)} onSave={save} saving={saving} />
        </Modal>
      )}
    </div>
  )
}

// ─── Users ────────────────────────────────────────────────────────────────

function Users({ d, onRefresh }) {
  const [modal, setModal]   = useState(null)
  const [form, setForm]     = useState({})
  const [saving, setSaving] = useState(false)
  if (!d) return <Loader />

  const pending  = d.filter(u => u.status === 'pending')
  const active   = d.filter(u => u.status === 'active')
  const inactive = d.filter(u => u.status === 'suspended')

  async function approve(u, credits = 0) {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      await fetch(`${BASE}/auth/approve/${u.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ starting_credits: parseFloat(credits) || 0 })
      })
      onRefresh()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  async function reject(u) {
    if (!window.confirm(`Reject and remove ${u.email}? This cannot be undone.`)) return
    await api.editUser(u.id, { status: 'suspended' })
    onRefresh()
  }

  async function saveModal() {
    setSaving(true)
    try {
      if (modal === 'approve') {
        await approve(form, form.starting_credits)
      } else if (modal === 'add') {
        await api.addUser(form)
      } else if (modal === 'edit') {
        if (form.credit_adj) await api.adjCreds(form.id, parseFloat(form.credit_adj), 'admin')
        await api.editUser(form.id, { plan: form.plan, status: form.status })
      } else if (modal === 'toggle') {
        await api.editUser(form.id, { status: form.status === 'active' ? 'suspended' : 'active' })
      }
      setModal(null); onRefresh()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-gray-900">Users</h2>
          <p className="text-xs text-gray-400 mt-0.5">{d.length} total · {pending.length} pending</p>
        </div>
        <button onClick={() => { setForm({}); setModal('add') }}
          className="px-3.5 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors">
          + Add user
        </button>
      </div>

      {/* Pending section */}
      {pending.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">Awaiting approval</span>
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">
              {pending.length}
            </span>
          </div>
          <div className="border border-amber-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-100 bg-amber-50">
                  <th className="text-left text-xs font-medium text-amber-500 px-4 py-3">Email</th>
                  <th className="text-left text-xs font-medium text-amber-500 px-4 py-3">Plan requested</th>
                  <th className="text-left text-xs font-medium text-amber-500 px-4 py-3">Signed up</th>
                  <th className="text-left text-xs font-medium text-amber-500 px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(u => (
                  <tr key={u.id} className="border-b border-amber-50 last:border-0 bg-white hover:bg-amber-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.email}</td>
                    <td className="px-4 py-3"><Badge color="amber">{u.plan}</Badge></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setForm({ ...u, starting_credits: '5' }); setModal('approve') }}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors font-medium">
                          Approve
                        </button>
                        <button onClick={() => reject(u)}
                          className="px-3 py-1.5 border border-red-200 text-red-600 text-xs rounded-lg hover:bg-red-50 transition-colors">
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2 px-1">
            Approving sends the user an email notification and grants immediate access.
          </p>
        </div>
      )}

      {/* Active + suspended users */}
      <div>
        {pending.length > 0 && (
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Active & suspended</div>
        )}
        <Table
          cols={['Email', 'Plan', 'Credits', 'Status', '']}
          rows={[...active, ...inactive].map(u => [
            <span className="font-medium text-gray-900">{u.email}</span>,
            <Badge>{u.plan}</Badge>,
            <span className="font-mono text-xs">${parseFloat(u.credits).toFixed(2)}</span>,
            <Badge color={u.status === 'active' ? 'green' : 'red'}>{u.status}</Badge>,
            <div className="flex gap-2">
              <button onClick={() => { setForm(u); setModal('edit') }}
                className="text-xs text-gray-400 hover:text-gray-900 transition-colors">Edit</button>
              <button onClick={() => { setForm(u); setModal('toggle') }}
                className={`text-xs transition-colors ${u.status === 'active' ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-700'}`}>
                {u.status === 'active' ? 'Suspend' : 'Reinstate'}
              </button>
            </div>,
          ])}
          empty="No active users yet"
        />
      </div>

      {/* Modals */}
      {modal && (
        <Modal
          title={
            modal === 'approve' ? `Approve — ${form.email}` :
            modal === 'add'    ? 'Add user' :
            modal === 'edit'   ? `Edit — ${form.email}` :
            modal === 'toggle' ? (form.status === 'active' ? `Suspend ${form.email}?` : `Reinstate ${form.email}?`) : ''
          }
          onClose={() => setModal(null)}>
          {modal === 'approve' && (
            <>
              <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Plan requested</div>
                <div className="font-medium text-gray-900 capitalize">{form.plan}</div>
              </div>
              <Field label="Starting credits ($)">
                <Input type="number" value={form.starting_credits}
                  onChange={e => setForm(f => ({ ...f, starting_credits: e.target.value }))}
                  placeholder="e.g. 5" />
              </Field>
              <p className="text-xs text-gray-400 -mt-2 mb-2">
                User will receive this amount to start making API calls immediately after approval.
              </p>
            </>
          )}
          {modal === 'add' && (
            <>
              <Field label="Email"><Input type="email" placeholder="user@example.com" onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
              <Field label="Password"><Input type="password" placeholder="Min 8 characters" onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></Field>
              <Field label="Plan">
                <select onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                  <option value="dev">Developer</option>
                  <option value="creator">Creator</option>
                  <option value="business">Business</option>
                </select>
              </Field>
            </>
          )}
          {modal === 'edit' && (
            <>
              <Field label="Plan">
                <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                  <option value="dev">Developer</option>
                  <option value="creator">Creator</option>
                  <option value="business">Business</option>
                </select>
              </Field>
              <Field label="Adjust credits ($)">
                <Input type="number" placeholder="e.g. 10 to add, -5 to remove" onChange={e => setForm(f => ({ ...f, credit_adj: e.target.value }))} />
              </Field>
            </>
          )}
          {modal === 'toggle' && (
            <p className="text-sm text-gray-500 mb-4">
              {form.status === 'active'
                ? 'User will lose API access immediately. Credits are preserved.'
                : 'User will regain full API access immediately.'}
            </p>
          )}
          <ModalActions
            onClose={() => setModal(null)}
            onSave={saveModal}
            saving={saving}
            saveLabel={
              modal === 'approve' ? 'Approve & notify' :
              modal === 'toggle' && form.status === 'active' ? 'Suspend' : 'Save'
            }
            saveColor={
              modal === 'approve' ? 'bg-green-600 text-white hover:bg-green-700' :
              modal === 'toggle' && form.status === 'active' ? 'bg-red-600 text-white hover:bg-red-700' : undefined
            }
          />
        </Modal>
      )}
    </div>
  )
}

// ─── Pools ────────────────────────────────────────────────────────────────

function Pools({ d, onRefresh }) {
  const [form, setForm]     = useState({})
  const [modal, setModal]   = useState(false)
  const [saving, setSaving] = useState(false)
  if (!d) return <Loader />

  async function save() {
    setSaving(true)
    try { await api.topUp(form.id, parseFloat(form.amount)); setModal(false); onRefresh() }
    catch (e) { alert(e.message) }
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-gray-900">Pool Manager</h2>
          <p className="text-xs text-gray-400 mt-0.5">Pre-funded upstream API accounts</p>
        </div>
        <button onClick={async () => {
          for (const p of d.filter(p => p.balance < p.floor)) {
            await api.topUp(p.id, parseFloat(((p.floor * 1.8) - p.balance).toFixed(2)))
          }
          onRefresh()
        }} className="px-3.5 py-2 border border-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors">
          Top-up all low
        </button>
      </div>

      <Table
        cols={['Pool', 'Balance', 'Floor', 'Health', 'Status', '']}
        rows={d.map(p => {
          const pct = p.floor > 0 ? Math.round((p.balance / p.floor) * 100) : 100
          const bar = pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-500'
          return [
            <span className="font-medium text-gray-900">{p.label}</span>,
            <span className="font-mono text-xs">${p.balance?.toFixed(2)}</span>,
            <span className="font-mono text-xs text-gray-400">${p.floor?.toFixed(2)}</span>,
            <div className="w-24 h-1.5 bg-gray-100 rounded-full">
              <div className={`h-1.5 rounded-full ${bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>,
            <Badge color={pct >= 100 ? 'green' : pct >= 50 ? 'amber' : 'red'}>
              {pct >= 100 ? 'healthy' : pct >= 50 ? 'low' : 'critical'} {pct}%
            </Badge>,
            <button onClick={() => { setForm({ ...p, amount: '' }); setModal(true) }}
              className="text-xs text-gray-400 hover:text-gray-900 transition-colors">Top-up</button>,
          ]
        })}
      />

      {modal && (
        <Modal title={`Top-up — ${form.label}`} onClose={() => setModal(false)}>
          <p className="text-sm text-gray-500 mb-4">
            Balance: <strong>${form.balance?.toFixed(2)}</strong>&nbsp;/&nbsp;Floor: <strong>${form.floor?.toFixed(2)}</strong>
          </p>
          <Field label="Amount ($)">
            <Input type="number" placeholder="Amount to add" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </Field>
          <ModalActions onClose={() => setModal(false)} onSave={save} saving={saving} />
        </Modal>
      )}
    </div>
  )
}

// ─── Billing ──────────────────────────────────────────────────────────────

function Billing({ d }) {
  const [ref, setRef]       = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)

  async function verifyPayment() {
    if (!ref.trim()) return
    setVerifying(true); setVerifyResult(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/admin/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reference: ref.trim() })
      })
      const data = await res.json()
      setVerifyResult({ ok: res.ok && data.ok, data })
      if (res.ok && data.ok) setRef('')
    } catch (e) { setVerifyResult({ ok: false, data: { error: e.message } }) }
    setVerifying(false)
  }

  if (!d) return <Loader />
  return (
    <div>
      <div className="mb-5">
        <h2 className="font-semibold text-gray-900">Billing</h2>
        <p className="text-xs text-gray-400 mt-0.5">Month to date</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="Revenue"    value={`$${d.mtd_revenue}`} accent="text-green-600" />
        <Stat label="Cost"       value={`$${d.mtd_cost}`} />
        <Stat label="Profit"     value={`$${d.mtd_profit}`}  accent="text-green-600" />
        <Stat label="Margin"     value={`${d.margin_pct}%`}  accent="text-green-600" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Revenue trend */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Daily revenue — last 7 days</div>
          <BarChart
            data={d.daily || []}
            valueKey="revenue"
            labelKey="date"
            color="bg-green-500"
            formatVal={v => `$${v.toFixed(2)}`}
          />
        </div>

        {/* Call volume trend */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Daily calls — last 7 days</div>
          <BarChart
            data={d.daily || []}
            valueKey="calls"
            labelKey="date"
            color="bg-indigo-500"
          />
        </div>
      </div>

      {/* Top APIs by revenue */}
      {d.top_apis?.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4">
          <div className="text-xs font-medium text-gray-500 mb-3">Top APIs by revenue</div>
          {d.top_apis.map((a, i) => {
            const maxRev = Math.max(...d.top_apis.map(x => x.total_charged || 0)) || 1
            return (
              <div key={i} className="mb-2 last:mb-0">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-700 font-medium">{a.api_name}</span>
                  <span className="text-gray-400">${parseFloat(a.total_charged || 0).toFixed(3)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className="h-1.5 bg-green-400 rounded-full"
                    style={{ width: `${((a.total_charged || 0) / maxRev) * 100}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4">
        <div className="text-xs text-gray-400 mb-1">Total calls this month</div>
        <div className="text-3xl font-semibold tracking-tight">{d.call_count?.toLocaleString()}</div>
      </div>

      {/* Payment recovery */}
      <div className="bg-white border border-amber-100 rounded-xl p-4">
        <div className="text-xs font-semibold text-amber-600 mb-1">Payment recovery</div>
        <div className="text-xs text-gray-400 mb-3">
          If a user paid but credits weren't added, paste their Paystack reference here to manually verify and credit them.
        </div>
        <div className="flex gap-2">
          <input
            value={ref} onChange={e => setRef(e.target.value)}
            placeholder="vault_xxxxxxxx-xxxx-xxxx..."
            className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-gray-900 font-mono placeholder:text-gray-300"
          />
          <button onClick={verifyPayment} disabled={verifying || !ref.trim()}
            className="px-4 py-2 bg-amber-500 text-white text-xs rounded-lg font-medium
              hover:bg-amber-600 disabled:opacity-40 transition-colors whitespace-nowrap">
            {verifying ? 'Verifying...' : 'Verify & credit'}
          </button>
        </div>
        {verifyResult && (
          <div className={`mt-3 p-3 rounded-lg text-xs border ${
            verifyResult.ok
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-red-50 border-red-100 text-red-600'
          }`}>
            {verifyResult.ok
              ? `✓ Credited $${verifyResult.data.credited} to ${verifyResult.data.user}`
              : `✗ ${verifyResult.data.error || verifyResult.data.msg}`
            }
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Logs ─────────────────────────────────────────────────────────────────

function Logs({ d, onRefresh }) {
  if (!d) return <Loader />
  const rows = Array.isArray(d) ? d : []
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-gray-900">Gateway logs</h2>
          <p className="text-xs text-gray-400 mt-0.5">Last {rows.length} requests</p>
        </div>
        <button onClick={onRefresh}
          className="px-3.5 py-2 border border-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors">
          Refresh
        </button>
      </div>
      <Table
        cols={['Time', 'User', 'API', 'Status', 'Charged', 'Profit']}
        rows={rows.map(r => [
          <span className="font-mono text-xs text-gray-400">{new Date(r.ts).toLocaleTimeString()}</span>,
          <span className="text-xs">{r.users?.email}</span>,
          <span className="font-medium">{r.api_registry?.name}</span>,
          <Badge color={r.http_status < 300 ? 'green' : 'red'}>{r.http_status}</Badge>,
          <span className="font-mono text-xs">${parseFloat(r.charged || 0).toFixed(4)}</span>,
          <span className="font-mono text-xs text-green-600">${parseFloat((r.charged - r.cost) || 0).toFixed(4)}</span>,
        ])}
        empty="No requests yet"
      />
    </div>
  )
}

// ─── API Requests ────────────────────────────────────────────────────────

function Requests({ d, onRefresh }) {
  const [saving, setSaving] = useState(null)
  if (!d) return <Loader />

  const pending  = d.filter(r => r.status === 'pending')
  const resolved = d.filter(r => r.status !== 'pending')

  async function grant(r) {
    setSaving(r.id)
    try {
      // Find user's current categories and add the API's category
      const user = await api.allUsers().then(users => users.find(u => u.id === r.requested_by))
      if (user) {
        const { data: access } = await fetch(
          `${import.meta.env.VITE_API_URL || ''}/admin/users/${user.id}/access`,
          { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ categories: [...new Set([...(user.categories || ['ai','dev']), r.api_category]), ], daily_limit: 1000 }) }
        )
      }
      await fetch(`${import.meta.env.VITE_API_URL || ''}/admin/requests/${r.id}/approve`,
        { method: 'PATCH', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      onRefresh()
    } catch (e) { alert(e.message) }
    setSaving(null)
  }

  async function deny(r) {
    if (!window.confirm(`Deny ${r.email}'s request for ${r.name}?`)) return
    setSaving(r.id)
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/admin/requests/${r.id}/deny`,
        { method: 'PATCH', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      onRefresh()
    } catch (e) { alert(e.message) }
    setSaving(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-gray-900">API Access Requests</h2>
          <p className="text-xs text-gray-400 mt-0.5">{pending.length} pending · {resolved.length} resolved</p>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="mb-6">
          <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-3">
            Pending — {pending.length}
          </div>
          <div className="border border-blue-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-100 bg-blue-50">
                  <th className="text-left text-xs font-medium text-blue-500 px-4 py-3">User</th>
                  <th className="text-left text-xs font-medium text-blue-500 px-4 py-3">API</th>
                  <th className="text-left text-xs font-medium text-blue-500 px-4 py-3">Category</th>
                  <th className="text-left text-xs font-medium text-blue-500 px-4 py-3">Requested</th>
                  <th className="text-left text-xs font-medium text-blue-500 px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(r => (
                  <tr key={r.id} className="border-b border-blue-50 last:border-0 bg-white hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 text-xs">{r.email}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-3"><Badge color="blue">{r.api_category}</Badge></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(r.ts).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => grant(r)} disabled={saving === r.id}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50">
                          Grant
                        </button>
                        <button onClick={() => deny(r)} disabled={saving === r.id}
                          className="px-3 py-1.5 border border-red-200 text-red-600 text-xs rounded-lg hover:bg-red-50 transition-colors">
                          Deny
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div className="text-center py-12 text-gray-300 text-sm">No pending requests</div>
      )}

      {resolved.length > 0 && (
        <div>
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Recent resolved</div>
          <Table
            cols={['User', 'API', 'Status', 'Date']}
            rows={resolved.slice(0, 10).map(r => [
              <span className="text-xs">{r.email}</span>,
              <span className="font-medium">{r.name}</span>,
              <Badge color={r.status === 'approved' ? 'green' : 'red'}>{r.status}</Badge>,
              <span className="text-xs text-gray-400">{new Date(r.ts).toLocaleDateString()}</span>,
            ])}
          />
        </div>
      )}
    </div>
  )
}

// ─── Main shell ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'apis',     label: 'APIs' },
  { id: 'users',    label: 'Users' },
  { id: 'requests', label: 'Requests' },
  { id: 'pools',    label: 'Pools' },
  { id: 'overview', label: 'Overview' },
  { id: 'billing',  label: 'Billing' },
  { id: 'logs',     label: 'Logs' },
]

export function AdminDashboard() {
  const [tab, setTab]   = useState('apis')
  const [data, setData] = useState({})
  const nav = useNavigate()

  const load = useCallback(async (t) => {
    const loaders = {
      overview: api.overview,
      apis:     api.allAPIs,
      pools:    api.allPools,
      users:    api.allUsers,
      requests: api.allRequests,
      billing:  api.billingCharts,
      logs:     () => api.logs(100),
    }
    try {
      const result = await loaders[t]()
      setData(d => ({ ...d, [t]: result }))
    } catch (e) {
      if (e.message?.includes('401') || e.message?.includes('403')) {
        localStorage.clear(); nav('/')
      }
    }
  }, [])

  useEffect(() => { load(tab) }, [tab])

  // Show pending badge on Users tab
  const pendingCount = data.users ? data.users.filter(u => u.status === 'pending').length : 0

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Desktop nav */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-20">
        <div className="flex items-center px-4 h-14 gap-2">
          <a href="/" className="flex items-center gap-2 mr-2 flex-shrink-0 hover:opacity-70 transition-opacity">
            <div className="w-5 h-5 rounded bg-gray-900 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight">APIvault</span>
            <span className="text-xs text-gray-300 hidden sm:block">Admin</span>
          </a>

          <div className="flex gap-1 overflow-x-auto flex-1 scrollbar-hide">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`relative px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors flex-shrink-0 ${
                  tab === t.id
                    ? 'bg-gray-900 text-white font-medium'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}>
                {t.label}
                {t.id === 'users' && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center leading-none">
                    {pendingCount}
                  </span>
                )}
                {t.id === 'requests' && (data.requests?.filter(r => r.status === 'pending').length > 0) && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center leading-none">
                    {data.requests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button onClick={() => { localStorage.clear(); nav('/') }}
            className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 transition-colors ml-2">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {tab === 'overview' && <Overview d={data.overview} />}
        {tab === 'apis'     && <APIs     d={data.apis}    onRefresh={() => load('apis')} />}
        {tab === 'users'    && <Users    d={data.users}   onRefresh={() => load('users')} />}
        {tab === 'pools'    && <Pools    d={data.pools}   onRefresh={() => load('pools')} />}
        {tab === 'requests' && <Requests d={data.requests} onRefresh={() => load('requests')} />}
        {tab === 'billing'  && <Billing  d={data.billing} />}
        {tab === 'logs'     && <Logs     d={data.logs}    onRefresh={() => load('logs')} />}
      </div>
    </div>
  )
}