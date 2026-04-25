# APIvault

Shared API gateway platform. Users pay fractional costs to access pooled master API accounts. Billing is atomic, pools are self-healing, every edge case is handled.

---

## Quick start

```powershell
# 1. Scaffold the project
powershell -ExecutionPolicy Bypass -File setup.ps1

# 2. Fill in your keys
#    server/.env  → Supabase + Stripe
#    client/.env  → Supabase anon key

# 3. Run the database migration
#    Paste server/db/migrations.sql into your Supabase SQL editor and run it

# 4. Start dev
powershell -ExecutionPolicy Bypass -File dev.ps1
```

---

## Architecture

```
client/                    React + Vite + Tailwind
  src/
    pages/
      Login.jsx            Vault key entry
      Dashboard.jsx        User view — APIs, usage, credits
      AdminDashboard.jsx   Admin — full management
    lib/
      api.js               All fetch calls in one place

server/                    Node.js + Express
  index.js                 App entry, routes mounted
  db.js                    Shared Supabase client
  middleware/
    auth.js                Vault key + admin guard
    rateLimit.js           Per-user throttle + brute force
  services/
    billing.js             Atomic deduct, refund, log, purchase
    pools.js               Pool check, cron, circuit breaker
    registry.js            Pull, categorize, assign pool, key vault
  routes/
    proxy.js               Gateway — every edge case handled
    user.js                Profile, usage, key, APIs
    admin.js               Full CRUD for APIs/users/pools/alerts
    webhook.js             Stripe webhook, idempotent
  db/
    migrations.sql         All tables, functions, seed data
```

---

## How a request flows

```
User request
  → auth.js         validates vault key, checks status
  → rateLimit.js    throttle 60/min, daily cap 1000
  → proxy.js        resolves API from registry
                    checks pool balance (circuit breaker)
                    atomic credit deduct (Postgres function)
                    forwards to upstream with master key
                    on upstream 5xx → refund + log
                    on timeout     → refund + 504
                    on success     → log + debit pool
```

---

## Pool solvency

Every pool maintains a dynamic floor = 7-day rolling daily average × 3 days.

Hourly cron checks all pools:
- Below floor → auto top-up to 150% of floor
- Below 50% of floor → top-up to 180% + admin alert
- Empty → circuit breaker active, calls return 503 with retry_after

Users are always prepaid. The atomic `deduct_credits` Postgres function guarantees:
- Credits can never go negative
- Two simultaneous requests from the same user cannot both deduct
- Every deduction is logged in credit_ledger with balance_after

---

## Environment variables

### server/.env
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...      # service_role key, never expose to client
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PORT=3000
```

### client/.env
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...    # anon key, safe to expose
VITE_API_URL=http://localhost:3000
```

---

## API endpoints

### User (requires x-vault-key header)
```
GET  /user/me            Profile + balance
GET  /user/apis          APIs visible to this user's plan
GET  /user/usage         Last 50 calls
GET  /user/key           Masked vault key
POST /user/key/reveal    Full vault key (logged)
```

### Proxy (requires x-vault-key header)
```
ANY  /proxy/:service/*   Forward to upstream API
                         e.g. POST /proxy/grok-image
                              POST /proxy/gpt4o/chat/completions
```

### Admin (requires admin vault key)
```
GET    /admin/overview
GET    /admin/apis
POST   /admin/apis
PATCH  /admin/apis/:id
POST   /admin/apis/:slug/rotate-key
GET    /admin/users
PATCH  /admin/users/:id
POST   /admin/users/:id/adjust-credits
PATCH  /admin/users/:id/access
GET    /admin/pools
POST   /admin/pools/:id/topup
GET    /admin/alerts
PATCH  /admin/alerts/:id/resolve
GET    /admin/logs
GET    /admin/billing
```

---

## Adding a new API

Via admin dashboard: APIs → Add API → fill slug, upstream URL, master key, cost, markup.

Via API:
```js
POST /admin/apis
{
  "slug": "stability-xl",
  "name": "Stability AI XL",
  "upstreamUrl": "https://api.stability.ai/v1",
  "masterKey": "sk-...",
  "costPerCall": 0.04,
  "markup": 50
}
```

The registry auto-categorizes by slug. Unknown slugs go to `pending` status and create an admin alert.

---

## Deploying to Railway + Vercel

### Server (Railway)
1. Push to GitHub
2. New Railway project → Deploy from repo → set `/server` as root
3. Add env vars in Railway dashboard
4. Railway auto-detects Node, runs `npm start`

### Client (Vercel)
1. New Vercel project → import same repo → set `/client` as root
2. Add VITE_ env vars in Vercel dashboard
3. Vercel auto-detects Vite

### railway.toml (place in /server)
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "node index.js"
healthcheckPath = "/health"
```

---

## Security notes

- Master API keys stored in Supabase Vault, never in DB plaintext or env
- Vault keys are UUIDs, never exposed in logs
- Admin routes require `role = 'admin'` in the users table
- Stripe webhook signature verified before any credit is added
- Request bodies capped at 32kb to prevent payload attacks
- Rate limiting is in-memory; for multi-instance deploys, swap `rateLimit.js` for Redis
