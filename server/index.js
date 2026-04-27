// server/index.js
import 'dotenv/config'
import express from 'express'
import cors    from 'cors'
import { authRoute }     from './routes/auth.js'
import { proxyRoute }    from './routes/proxy.js'
import { userRoute }     from './routes/user.js'
import { adminRoute }    from './routes/admin.js'
import { checkoutRoute } from './routes/checkout.js'
import { pools }         from './services/pools.js'

const app = express()

app.use(cors({
  origin: '*',
  methods: ['GET','POST','PATCH','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','x-vault-key']
}))
app.options('*', cors())
app.use(express.json({ limit: '32kb' }))

app.use('/auth',     authRoute)
app.use('/proxy',    proxyRoute)
app.use('/user',     userRoute)
app.use('/admin',    adminRoute)
app.use('/checkout', checkoutRoute)

app.get('/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }))

app.use((err, req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal error' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`APIvault server on :${PORT}`)
  pools.startCron()
})