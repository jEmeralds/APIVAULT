// server/services/registry.js
import { db } from '../db.js'

const CATEGORY_MAP = {
  ai:       ['openai','gpt','claude','grok','heygen','stability','replicate','cohere','midjourney','anthropic','gemini','aurora','imagen'],
  payments: ['stripe','paystack','flutterwave','mpesa','paypal','square','razorpay','adyen','braintree','checkout'],
  comms:    ['twilio','sendgrid','mailgun','vonage','ayrshare','whatsapp','messagebird','plivo','postmark','resend'],
  data:     ['newsapi','openweather','serpapi','mapbox','clearbit','ipinfo','cloudinary','airtable','notion','algolia'],
  dev:      ['github','vercel','railway','netlify','circleci','datadog','sentry','supabase','planetscale','neon'],
}

const POOL_RESERVE = {
  ai:       3,  // days
  payments: 5,
  comms:    3,
  data:     7,
  dev:      1,
}

export function categorize(slug) {
  const s = slug.toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(k => s.includes(k))) return cat
  }
  return null  // null = needs admin review
}

export const registry = {
  async pull({ slug, name, upstreamUrl, masterKey, costPerCall, markup, requestedBy }) {
    const s = slug.toLowerCase().replace(/\s+/g, '-')

    // Reject duplicates silently
    const { data: existing } = await db.from('api_registry').select('id').eq('slug', s).maybeSingle()
    if (existing) return { error: 'API already registered', existing: true }

    const category = categorize(s)
    const status   = category ? 'live' : 'pending'

    // Resolve pool
    const poolName = `${category || 'data'}_pool`
    const { data: pool } = await db.from('pools').select('id').eq('name', poolName).single()
    if (!pool) return { error: `Pool ${poolName} not found` }

    // Store master key in Supabase Vault
    const secretName = `key_${s}_${Date.now()}`
    const { data: secretRef, error: vaultErr } = await db.rpc('vault.create_secret', {
      secret: masterKey,
      name:   secretName
    })
    // Fallback if vault RPC naming differs
    const keyRef = secretRef || secretName

    const { data: api, error } = await db.from('api_registry').insert({
      slug: s, name, category,
      pool_id:        pool.id,
      upstream_url:   upstreamUrl,
      master_key_ref: keyRef,
      cost_per_call:  parseFloat(costPerCall),
      markup:         parseFloat(markup),
      reserve_days:   POOL_RESERVE[category] || 3,
      status
    }).select().single()

    if (error) return { error: error.message }

    // Unknown category — queue for admin
    if (status === 'pending') {
      await db.from('api_requests').insert({ slug: s, name, requested_by: requestedBy, status: 'pending' })
      await db.from('admin_alerts').insert({
        type: 'api_pending',
        api_id: api.id,
        message: `New API "${name}" registered but needs category assignment before going live.`
      })
    }

    return { ok: true, api }
  },

  // Rotate master key — zero downtime, next call picks up new key
  async rotateKey(slug, newKey) {
    const { data: api } = await db.from('api_registry').select('master_key_ref').eq('slug', slug).single()
    if (!api) return { error: 'Not found' }
    await db.rpc('vault.update_secret', { id: api.master_key_ref, secret: newKey })
    return { ok: true }
  },

  // Resolve a slug to full config including decrypted key
  async resolve(slug) {
    const { data: api } = await db
      .from('api_registry')
      .select('*, pools(id, balance)')
      .eq('slug', slug)
      .eq('status', 'live')
      .single()
    if (!api) return null

    // Decrypt key from Vault
    const { data: secret } = await db.rpc('vault.decrypted_secret', { id: api.master_key_ref })
    return { ...api, masterKey: secret?.decrypted_secret || secret }
  }
}
