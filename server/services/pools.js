// server/services/pools.js
import { db } from '../db.js'

export const pools = {
  // Returns true if pool has funds, false triggers circuit breaker
  async check(poolId) {
    const { data } = await db
      .from('pools')
      .select('balance')
      .eq('id', poolId)
      .single()
    return (data?.balance ?? 0) > 0
  },

  async debit(poolId, amount) {
    await db.rpc('debit_pool', { pid: poolId, amount })
  },

  async topUp(poolId, amount) {
    await db.rpc('add_to_pool', { pid: poolId, amount })
    await db.from('pool_log').insert({ pool_id: poolId, event: 'topup', amount })
    await db.from('admin_alerts').insert({
      type: 'pool_topup',
      pool_id: poolId,
      message: `Auto top-up of $${amount.toFixed(2)} applied`
    })
  },

  // Hourly health check — dynamic floor based on 7-day rolling average
  async healthCheck() {
    const { data: allPools } = await db.from('pools').select('*')
    if (!allPools?.length) return

    for (const pool of allPools) {
      // Recalculate dynamic floor
      const { data: avg } = await db.rpc('pool_daily_avg', { pid: pool.id })
      const floor = parseFloat(((avg || 0) * 3).toFixed(2))

      // Update stored floor
      await db.from('pools').update({ floor, daily_avg: avg || 0 }).eq('id', pool.id)

      const pct = floor > 0 ? (pool.balance / floor) : 1

      if (pct <= 0) {
        // Circuit breaker territory — alert immediately
        await db.from('admin_alerts').insert({
          type: 'pool_empty',
          pool_id: pool.id,
          message: `${pool.label} pool is empty. Calls are being held.`
        })
      } else if (pct < 0.5) {
        // Critical — top up to 180% of floor
        const topup = parseFloat(((floor * 1.8) - pool.balance).toFixed(2))
        await this.topUp(pool.id, topup)
        await db.from('admin_alerts').insert({
          type: 'pool_critical',
          pool_id: pool.id,
          message: `${pool.label} pool at ${Math.round(pct * 100)}%. Auto top-up $${topup} queued.`
        })
      } else if (pct < 1) {
        // Low — top up to 150% of floor
        const topup = parseFloat(((floor * 1.5) - pool.balance).toFixed(2))
        await this.topUp(pool.id, topup)
      }
    }
  },

  startCron() {
    this.healthCheck().catch(console.error) // immediate on boot
    setInterval(() => this.healthCheck().catch(console.error), 60 * 60 * 1000)
    console.log('Pool cron started (hourly)')
  }
}
