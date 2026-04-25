// server/routes/user.js
import { Router }   from 'express'
import { jwtAuth }  from './auth.js'
import { db }       from '../db.js'

export const userRoute = Router()
userRoute.use(jwtAuth)

// GET /user/me
userRoute.get('/me', async (req, res) => {
  const { data } = await db.from('users')
    .select('id, email, credits, plan, role, created_at')
    .eq('id', req.user.id).single()
  res.json(data)
})

// GET /user/usage
userRoute.get('/usage', async (req, res) => {
  const { data } = await db.from('usage_log')
    .select('ts, charged, http_status, api_registry(name, category)')
    .eq('user_id', req.user.id)
    .order('ts', { ascending: false })
    .limit(50)
  res.json(data || [])
})

// GET /user/apis
userRoute.get('/apis', async (req, res) => {
  const { data: access } = await db.from('user_api_access')
    .select('categories').eq('user_id', req.user.id).maybeSingle()
  const categories = access?.categories || ['ai', 'dev']
  const { data } = await db.from('api_registry')
    .select('slug, name, category, cost_per_call, markup, billing_unit')
    .in('category', categories)
    .eq('status', 'live')
    .order('category')
  res.json(data || [])
})

// GET /user/key — masked vault key
userRoute.get('/key', async (req, res) => {
  const { data } = await db.from('users').select('vault_key').eq('id', req.user.id).single()
  const k = data.vault_key.toString()
  res.json({ key: `sk-vault-${k.substring(0, 8)}••••••••••••••••••••••••••••` })
})

// POST /user/key/reveal
userRoute.post('/key/reveal', async (req, res) => {
  const { data } = await db.from('users').select('vault_key').eq('id', req.user.id).single()
  res.json({ key: `sk-vault-${data.vault_key}` })
})