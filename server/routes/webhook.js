// server/routes/webhook.js
import { Router } from 'express'
import Stripe      from 'stripe'
import { billing } from '../services/billing.js'
import { db }      from '../db.js'

export const webhookRoute = Router()

webhookRoute.post('/', async (req, res) => {
  const sig    = req.headers['stripe-signature']
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  let event
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    event = stripe.webhooks.constructEvent(req.body, sig, secret)
  } catch (err) {
    // Invalid signature — reject silently (don't leak details)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId  = session.metadata?.user_id
    const amount  = session.amount_total  // in cents

    if (!userId || !amount) return res.json({ received: true })

    await billing.purchase(userId, amount, event.id)
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi     = event.data.object
    const userId = pi.metadata?.user_id
    if (userId) {
      await db.from('admin_alerts').insert({
        type: 'payment_failed',
        message: `Payment failed for user ${userId}: ${pi.last_payment_error?.message}`
      })
    }
  }

  res.json({ received: true })
})
