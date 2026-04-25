// server/services/billing.js
import { db } from '../db.js'

export const billing = {

  // Deduct user credits atomically before upstream call.
  // Returns false if balance too low — credits can never go negative.
  async deduct(userId, amount) {
    const { data } = await db.rpc('deduct_credits', { uid: userId, amount })
    return !!data
  },

  // Refund credits when upstream fails. Always safe to call.
  async refund(userId, amount, reason) {
    await db.rpc('add_credits', { uid: userId, amount, reason: `refund:${reason}` })
  },

  // Log every proxied call — success or failure. Non-blocking.
  async log(userId, apiId, cost, charged, httpStatus) {
    const profit = parseFloat((charged - cost).toFixed(8))
    await db.from('usage_log')
      .insert({ user_id: userId, api_id: apiId, cost, charged, profit, http_status: httpStatus })
      .then(() => {}, err => console.error('usage_log write failed', err))
  },

  // Credit user after Paystack payment — idempotent via paystack_events table.
  // reference: Paystack transaction reference (unique per payment)
  // usdAmount: dollar amount to credit (number, not cents)
  async purchase(userId, usdAmount, reference) {
    // Idempotency check — ignore if already processed
    const { data: exists } = await db
      .from('paystack_events')
      .select('reference')
      .eq('reference', reference)
      .maybeSingle()
    if (exists) return { duplicate: true }

    await db.from('paystack_events').insert({ reference, user_id: userId, usd_amount: usdAmount })
    await db.rpc('add_credits', { uid: userId, amount: usdAmount, reason: 'paystack_purchase' })
    return { ok: true, amount: usdAmount }
  },

  // Admin: manually adjust a user credit balance (positive or negative)
  async adjust(userId, amount, reason) {
    if (amount >= 0) {
      await db.rpc('add_credits', { uid: userId, amount, reason: `admin:${reason}` })
    } else {
      await db.rpc('deduct_credits', { uid: userId, amount: Math.abs(amount) })
    }
  },
}