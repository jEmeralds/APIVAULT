// server/services/registry.js
import { db } from '../db.js'

const CATEGORY_MAP = {
  ai:       ['openai','gpt','claude','grok','heygen','stability','replicate','cohere','midjourney','anthropic','gemini','aurora','imagen','whisper','elevenlabs','perplexity','stablediffusion'],
  payments: ['stripe','paystack','flutterwave','mpesa','paypal','square','razorpay','adyen','braintree','checkout','pesapal'],
  comms:    ['twilio','sendgrid','mailgun','vonage','ayrshare','whatsapp','messagebird','plivo','postmark','resend','africas-talking'],
  data:     ['newsapi','openweather','serpapi','mapbox','clearbit','ipinfo','cloudinary','airtable','notion','algolia','hunter','abstractapi','nasa','worldbank','pokemon','rickmorty','catfacts','dogapi','adviceslip','numbersapi','agify','genderize','nationalize','diseasesh','covid19','spacex','bored','randomuser','quotable','opentrivia'],
  dev:      ['github','vercel','railway','netlify','circleci','datadog','sentry','supabase','planetscale','neon','jokeapi','dictionary','httpbin','lorem-picsum','cataas','placeholder','dummyjson','fakerapi','publicapis','chucknorris'],
  geo:      ['openmeteo','nominatim','countryflags','timezone','airports'],
  finance:  ['frankfurter','coingecko','feargreed','coincap','alphavantage','polygon','finnhub'],
  health:   ['openfda','nutrients'],
  media:    ['itunesearch','radiobroswer','comicvine'],
}

const POOL_RESERVE = {
  ai:       3,
  payments: 5,
  comms:    3,
  data:     7,
  dev:      1,
  geo:      1,
  finance:  3,
  health:   2,
  media:    2,
}

export function categorize(slug) {
  const s = slug.toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(k => s.includes(k))) return cat
  }
  return null
}

export const registry = {
  async pull({ slug, name, upstreamUrl, masterKey, costPerCall, markup, requestedBy }) {
    const s = slug.toLowerCase().replace(/\s+/g, '-')

    const { data: existing } = await db.from('api_registry').select('id').eq('slug', s).maybeSingle()
    if (existing) return { error: 'API already registered', existing: true }

    const category = categorize(s)
    const status   = category ? 'live' : 'pending'

    const poolName = `${category || 'data'}_pool`
    const { data: pool } = await db.from('pools').select('id').eq('name', poolName).single()
    if (!pool) return { error: `Pool ${poolName} not found` }

    const secretName = `key_${s}_${Date.now()}`
    const { data: secretRef } = await db.rpc('vault.create_secret', {
      secret: masterKey,
      name:   secretName
    })
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

  async rotateKey(slug, newKey) {
    const { data: api } = await db.from('api_registry').select('master_key_ref').eq('slug', slug).single()
    if (!api) return { error: 'Not found' }
    await db.rpc('vault.update_secret', { id: api.master_key_ref, secret: newKey })
    return { ok: true }
  },

  // Resolve slug → full config with master key
  // Free APIs (cost=0, no-key-required) are always resolvable
  // Paid APIs must be status='live' and have a real master key
  async resolve(slug) {
    const { data: api } = await db
      .from('api_registry')
      .select('*, pools(id, balance, floor)')
      .eq('slug', slug)
      .single()

    if (!api) return null

    const isFree = parseFloat(api.cost_per_call) === 0
    const hasKey = api.master_key_ref &&
                   api.master_key_ref !== 'pending-setup' &&
                   api.master_key_ref !== ''

    // Free APIs: serve if live (regardless of key)
    if (isFree && api.status === 'live') {
      return { ...api, masterKey: api.master_key_ref }
    }

    // Paid APIs: must be live AND have a real key configured
    if (!isFree && api.status === 'live' && hasKey) {
      return { ...api, masterKey: api.master_key_ref }
    }

    // Everything else (paused, pending-setup, etc.) → not resolvable
    return null
  }
}