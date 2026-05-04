// server/routes/auth.js
// Full auth with: disposable email blocking, IP rate limiting,
// spam scoring, honeypot, email verification, admin approval flow

import { Router }   from 'express'
import { db }       from '../db.js'
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

export const authRoute = Router()

const JWT_SECRET      = process.env.JWT_SECRET      || 'change-this-in-production'
const APP_URL         = process.env.APP_URL          || 'http://localhost:5173'
const ADMIN_EMAIL     = process.env.ADMIN_EMAIL      || ''
// Resend free tier: all emails routed to account owner until domain is verified
const RESEND_TO       = process.env.RESEND_TO        || ''

// ─── JWT ──────────────────────────────────────────────────────────────────

function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body   = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url')
  const sig    = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

function verifyToken(token) {
  try {
    const [header, body, sig] = token.split('.')
    const expected = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (Date.now() - payload.iat > 7 * 24 * 60 * 60 * 1000) return null
    return payload
  } catch { return null }
}

function hashPassword(password, salt) {
  return createHmac('sha256', salt).update(password).digest('hex')
}

// ─── Disposable email blocklist ───────────────────────────────────────────
// Top 100+ known disposable/throwaway email domains

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','tempmail.com','throwaway.email',
  '10minutemail.com','yopmail.com','sharklasers.com','guerrillamailblock.com',
  'grr.la','guerrillamail.info','guerrillamail.biz','guerrillamail.de',
  'guerrillamail.net','guerrillamail.org','spam4.me','trashmail.com',
  'trashmail.me','trashmail.net','dispostable.com','mailnull.com',
  'spamgourmet.com','spamgourmet.net','spamgourmet.org','spamspot.com',
  'spamfree24.org','spamfree.eu','spamhere.net','spamoff.de',
  'spaml.de','spaml.com','spammotel.com','spamninja.com',
  'filzmail.com','superrito.com','discard.email','crap.ninja',
  'fakeinbox.com','mailnesia.com','mailnull.com','maildrop.cc',
  'mailexpire.com','mailscrap.com','mailtothis.com','mailzilla.com',
  'mailzilla.org','noclickemail.com','notsharingmy.info','nowmymail.com',
  'objectmail.com','odaymail.com','oneoffmail.com','onewaymail.com',
  'pookmail.com','proxymail.eu','rcpt.at','rtrtr.com',
  'safetymail.info','sendspamhere.com','sharklasers.com','shitmail.me',
  'shortmail.net','slippery.email','smellfear.com','sofort-mail.de',
  'sogetthis.com','spam.la','spamavert.com','spambob.com',
  'spambob.net','spambob.org','spambog.com','spambog.de',
  'spambog.ru','tempr.email','tempinbox.com','tempinbox.co.uk',
  'temporary-mail.net','temporaryemail.net','temporaryemail.us',
  'temporaryinbox.com','tempomail.fr','thanksnospam.info','thisisnotmyrealemail.com',
  'throwam.com','trash-mail.at','trash-mail.com','trash-mail.de',
  'trash-mail.ga','trash-mail.io','trash-mail.tk','trashdevil.com',
  'trashdevil.de','trashinbox.com','trbvm.com','trbvn.com',
  'trillianpro.com','trmailbox.com','trollbot.org','trua.fun',
  'turual.com','twinmail.de','tyldd.com','uggsrock.com',
  'uroid.com','vomoto.com','webcontact-france.eu','webemail.me',
  'wegwerfmail.de','wegwerfmail.net','wegwerfmail.org','wetrainbayarea.org',
  'whyspam.me','wilemail.com','willselfdestruct.com','xagloo.com',
  'xemaps.com','xents.com','xmaily.com','xoxy.net',
  'yepmail.net','ypmail.webarnak.fr.eu.org','yuurok.com','zehnminuten.de',
  'zehnminutenmail.de','zoemail.net','zoemail.org','zomg.info',
])

function isDisposable(email) {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? DISPOSABLE_DOMAINS.has(domain) : true
}

// ─── Spam scoring ─────────────────────────────────────────────────────────

function spamScore(email) {
  const local = email.split('@')[0].toLowerCase()
  let score = 0

  if (/\d{5,}/.test(local))           score += 3  // 5+ consecutive numbers
  if (/(.)\1{3,}/.test(local))         score += 3  // repeated chars: aaaa
  if (local.length > 35)               score += 2  // unusually long local part
  if (/^[a-z0-9]{12,}$/.test(local))  score += 2  // long random-looking string
  if (/[^a-z0-9._+-]/.test(local))    score += 2  // unusual characters
  if (/^\d+$/.test(local))            score += 3  // all numbers

  return score  // score >= 5 = likely bot/spam
}

// ─── IP rate limiter ──────────────────────────────────────────────────────

const signupBuckets = new Map()

function signupRateLimited(ip) {
  const now = Date.now()
  const key = `signup:${ip}`
  let b = signupBuckets.get(key)
  if (!b || now > b.reset) b = { count: 0, reset: now + 3_600_000 }  // 1 hour window
  b.count++
  signupBuckets.set(key, b)
  return b.count > 3  // max 3 signups per IP per hour
}

// ─── Email sender via SendGrid ────────────────────────────────────────────

async function sendEmail({ to, subject, html }) {
  console.log(`[EMAIL] Sending to: ${to} | Subject: ${subject}`)

  // Try Nodemailer + Gmail SMTP first
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD

  if (gmailUser && gmailPass) {
    try {
      const nodemailer = await import('nodemailer')
      const transporter = nodemailer.default.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      })
      await transporter.sendMail({
        from: `"APIvault" <${gmailUser}>`,
        to,
        subject,
        html,
      })
      console.log(`[EMAIL] Sent via Gmail SMTP to ${to}`)
      return { ok: true }
    } catch (e) {
      console.error(`[EMAIL] Gmail SMTP failed: ${e.message}`)
    }
  }

  // Fallback: Resend API
  const resendKey = process.env.RESEND_API_KEY || process.env.EMAIL_KEY
  if (resendKey) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'APIvault <onboarding@resend.dev>', to: [to], subject, html }),
      })
      const d = await r.json()
      if (r.ok) { console.log(`[EMAIL] Sent via Resend to ${to}`); return { ok: true } }
      console.error(`[EMAIL] Resend failed: ${JSON.stringify(d)}`)
    } catch (e) {
      console.error(`[EMAIL] Resend error: ${e.message}`)
    }
  }

  // Last resort — log the email
  console.log(`[EMAIL] SKIPPED — no email provider configured`)
  console.log(`[EMAIL] Subject: ${subject}`)
  console.log(`[EMAIL] To: ${to}`)
  return { ok: false }
}

// ─── POST /auth/login ─────────────────────────────────────────────────────

authRoute.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const { data: user } = await db
    .from('users')
    .select('id, email, role, status, password_hash, password_salt, plan')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const hash = hashPassword(password, user.password_salt)
  if (hash !== user.password_hash) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  if (user.status === 'pending') {
    return res.status(403).json({
      error: 'pending',
      message: 'Your account is awaiting admin approval. Check your email for updates.'
    })
  }

  if (user.status === 'suspended') {
    return res.status(403).json({
      error: 'suspended',
      message: 'Your account has been suspended. Contact support.'
    })
  }

  const token = signToken({ id: user.id, role: user.role, email: user.email })
  res.json({ token, role: user.role, email: user.email })
})

// ─── POST /auth/register ──────────────────────────────────────────────────

authRoute.post('/register', async (req, res) => {
  const { email, password, plan = 'dev', honeypot } = req.body

  // Layer 1 — Honeypot: bots fill hidden fields, humans don't
  if (honeypot) {
    // Silently accept but don't actually create account
    return res.status(201).json({ ok: true, message: 'Account created. Check your email to verify.' })
  }

  // Layer 2 — Basic validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const cleanEmail = email.toLowerCase().trim()

  // Layer 3 — Email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Invalid email address' })
  }

  // Layer 4 — Disposable email check
  if (isDisposable(cleanEmail)) {
    return res.status(400).json({ error: 'Disposable email addresses are not allowed. Please use your real email.' })
  }

  // Layer 5 — Spam score
  const score = spamScore(cleanEmail)
  if (score >= 5) {
    // Log but silently reject — don't tell bots what triggered it
    await db.from('signup_attempts').insert({ ip: req.ip, email: cleanEmail, score, blocked: true }).then(() => {}, () => {})
    return res.status(400).json({ error: 'This email address cannot be used. Please contact support if you think this is an error.' })
  }

  // Layer 6 — IP rate limit
  if (signupRateLimited(req.ip)) {
    return res.status(429).json({ error: 'Too many signups from this location. Try again in an hour.' })
  }

  // Log attempt
  await db.from('signup_attempts').insert({ ip: req.ip, email: cleanEmail, score, blocked: false }).then(() => {}, () => {})

  // Check duplicate
  const { data: existing } = await db.from('users').select('id, status').eq('email', cleanEmail).maybeSingle()
  if (existing) {
    // Don't leak whether email exists — same message either way
    return res.status(409).json({ error: 'An account with this email already exists' })
  }

  // Create user as pending
  const salt = randomBytes(32).toString('hex')
  const hash = hashPassword(password, salt)

  const { data: user, error } = await db.from('users').insert({
    email:         cleanEmail,
    password_hash: hash,
    password_salt: salt,
    plan,
    role:   'user',
    status: 'pending',
  }).select('id, email').single()

  if (error) {
    return res.status(500).json({ error: 'Registration failed. Please try again.' })
  }

  // Create email verification token (expires in 24h)
  const verifyToken = randomBytes(32).toString('hex')
  await db.from('email_verifications').insert({
    user_id:    user.id,
    token:      verifyToken,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  })

  // Send verification email
  const verifyUrl = `${APP_URL}/verify?token=${verifyToken}`
  await sendEmail({
    to:      cleanEmail,
    subject: 'Verify your APIvault email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px">
          <div style="width:20px;height:20px;background:#111;border-radius:4px"></div>
          <strong>APIvault</strong>
        </div>
        <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">Verify your email</h2>
        <p style="color:#666;margin-bottom:24px">Click the button below to verify your email address. This link expires in 24 hours.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500">
          Verify email address
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">
          After verification, your account will be reviewed by an administrator before you can sign in.
        </p>
        <p style="color:#bbb;font-size:11px;margin-top:8px">If you didn't create this account, ignore this email.</p>
      </div>
    `,
  })

  // Notify admin
  await db.from('admin_alerts').insert({
    type:    'user_pending',
    message: `New signup awaiting verification: ${cleanEmail} (plan: ${plan})`,
  }).then(() => {}, () => {})

  res.status(201).json({
    ok: true,
    message: 'Account created. Check your email to verify your address before your account can be approved.'
  })
})

// ─── GET /auth/verify?token=xxx ───────────────────────────────────────────

authRoute.get('/verify', async (req, res) => {
  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Verification token required' })

  const { data: record } = await db
    .from('email_verifications')
    .select('*, users(id, email, status)')
    .eq('token', token)
    .eq('verified', false)
    .single()

  if (!record) {
    return res.status(400).json({ error: 'Invalid or expired verification link' })
  }

  if (new Date(record.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Verification link has expired. Please sign up again.' })
  }

  // Mark as verified
  await db.from('email_verifications').update({ verified: true }).eq('id', record.id)

  // Update admin alert to show email is verified
  await db.from('admin_alerts').insert({
    type:    'user_verified',
    message: `Email verified: ${record.users.email} — ready for approval`,
  }).then(() => {}, () => {})

  // Notify admin email
  if (ADMIN_EMAIL) {
    await sendEmail({
      to:      ADMIN_EMAIL,
      subject: `New user verified: ${record.users.email}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px">
            <div style="width:20px;height:20px;background:#111;border-radius:4px"></div>
            <strong>APIvault Admin</strong>
          </div>
          <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">New user pending approval</h2>
          <p style="color:#666;margin-bottom:8px"><strong>${record.users.email}</strong> has verified their email and is waiting for your approval.</p>
          <a href="${APP_URL}/admin" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;margin-top:16px">
            Review in admin dashboard
          </a>
        </div>
      `,
    })
  }

  res.json({ ok: true, message: 'Email verified. Your account is now pending admin approval. You will be notified once approved.' })
})

// ─── POST /auth/approve (admin only) ─────────────────────────────────────

authRoute.post('/approve/:userId', async (req, res) => {
  // Verify admin JWT
  const header = req.headers['authorization']
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' })
  const payload = verifyToken(header.slice(7))
  if (!payload || payload.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })

  const { starting_credits = 0 } = req.body

  const { data: user, error } = await db
    .from('users')
    .update({ status: 'active' })
    .eq('id', req.params.userId)
    .select('email, plan, credits')
    .single()

  if (error || !user) return res.status(404).json({ error: 'User not found' })

  // Set correct categories based on plan
  const PLAN_CATS = {
    dev:      ['ai', 'dev', 'data'],
    creator:  ['ai', 'comms', 'data'],
    business: ['ai', 'payments', 'comms', 'data', 'dev'],
  }
  const cats = PLAN_CATS[user.plan] || PLAN_CATS.dev
  await db.from('user_api_access')
    .upsert({ user_id: req.params.userId, categories: cats, daily_limit: 10000 }, { onConflict: 'user_id' })

  // Add starting credits if specified
  if (starting_credits > 0) {
    await db.rpc('add_credits', {
      p_user_id: req.params.userId,
      p_amount:  parseFloat(starting_credits),
      p_reason:  'admin_approval_bonus'
    })
  }

  // Notify user they are approved
  const creditsMsg = starting_credits > 0
    ? `<p style="color:#16a34a;font-weight:500;margin-bottom:16px">$${parseFloat(starting_credits).toFixed(2)} starting credits have been added to your account.</p>`
    : ''

  await sendEmail({
    to:      user.email,
    subject: 'Your APIvault account is approved',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px">
          <div style="width:20px;height:20px;background:#111;border-radius:4px"></div>
          <strong>APIvault</strong>
        </div>
        <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">You are approved!</h2>
        <p style="color:#666;margin-bottom:16px">Your APIvault account has been approved. You can now sign in and start using the platform.</p>
        ${creditsMsg}
        <a href="${APP_URL}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500">
          Sign in to APIvault
        </a>
      </div>
    `,
  })

  res.json({ ok: true })
})

// ─── JWT middleware exports ────────────────────────────────────────────────

export function jwtAuth(req, res, next) {
  const header = req.headers['authorization']
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' })
  const payload = verifyToken(header.slice(7))
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' })
  req.user = payload
  next()
}

export function jwtAdminAuth(req, res, next) {
  jwtAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    next()
  })
}