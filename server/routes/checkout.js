// server/routes/checkout.js
// Paystack payment flow:
// 1. POST /checkout              → initialize, get authorization_url, redirect user
// 2. User pays on Paystack page
// 3. Paystack redirects to /app?reference=xxx
// 4. Client calls GET /checkout/verify?reference=xxx → credits user

import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { billing } from '../services/billing.js'
import { db }      from '../db.js'

export const checkoutRoute = Router()

// USD credit packages
const PACKAGES = [5, 10, 25, 50, 100, 200]
const MIN_AMOUNT = 1
const MAX_AMOUNT = 500

// Fetch live KES rate — fallback to 130 if unavailable
async function getKESRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    const data = await res.json()
    return data.rates?.KES || 130
  } catch { return 130 }
}

// POST /checkout — initialize Paystack transaction
checkoutRoute.post('/', auth, async (req, res) => {
  const amount = parseInt(req.body.amount)
  if (!amount || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return res.status(400).json({ error: `Invalid amount. Min $${MIN_AMOUNT}, max $${MAX_AMOUNT}` })
  }

  const { data: user } = await db
    .from('users').select('email').eq('id', req.user.id).single()

  const origin    = req.headers.origin || process.env.APP_URL || 'http://localhost:5173'
  const reference = `vault_${req.user.id}_${Date.now()}`
  const kesRate   = await getKESRate()
  const amountKES = Math.round(amount * kesRate)

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      email:        user.email,
      amount:       amountKES * 100,  // Paystack expects smallest currency unit
      currency:     'KES',
      reference,
      callback_url: `${origin}/app?reference=${reference}`,
      metadata: {
        user_id:    req.user.id,
        usd_amount: amount,
      },
    }),
  })

  const data = await response.json()
  if (!data.status) {
    return res.status(502).json({ error: data.message || 'Paystack init failed' })
  }

  res.json({ url: data.data.authorization_url, reference })
})

// GET /checkout/verify?reference=xxx — verify payment and credit user
// No auth required — reference contains user_id in Paystack metadata
checkoutRoute.get('/verify', async (req, res) => {
  const { reference } = req.query
  if (!reference) return res.status(400).json({ error: 'reference required' })

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { 'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
  )
  const data = await response.json()

  console.log(`[CHECKOUT] Verify ${reference}: status=${data.data?.status} amount=${data.data?.amount}`)

  if (!data.status || data.data?.status !== 'success') {
    console.error(`[CHECKOUT] Payment not confirmed: ${JSON.stringify(data.data?.status)}`)
    return res.status(402).json({ error: 'Payment not confirmed', paystackStatus: data.data?.status })
  }

  const userId    = data.data.metadata?.user_id
  const usdAmount = parseInt(data.data.metadata?.usd_amount)

  console.log(`[CHECKOUT] Crediting user ${userId} with $${usdAmount}`)

  if (!userId || !usdAmount) {
    console.error(`[CHECKOUT] Invalid metadata: ${JSON.stringify(data.data.metadata)}`)
    return res.status(400).json({ error: 'Invalid payment metadata' })
  }

  // purchase() is idempotent — safe to call more than once
  const result = await billing.purchase(userId, usdAmount, reference)
  console.log(`[CHECKOUT] Purchase result: ${JSON.stringify(result)}`)
  res.json(result)
})