// server/services/notify.js
import { db } from '../db.js'

// Sends an admin notification through both channels:
// 1. admin_alerts table (already surfaced in your admin dashboard)
// 2. Email, via Resend's API (https://resend.com) — pick any provider you like,
//    this is just a thin fetch call. Requires RESEND_API_KEY and ADMIN_EMAIL
//    env vars on Railway. If either is missing, the email step is skipped
//    silently and only the dashboard alert is written — nothing breaks.

export async function notifyAdmin({ type, apiId, message, subject }) {
  // 1. Dashboard alert — always written
  await db.from('admin_alerts').insert({
    type: type || 'health_check',
    api_id: apiId || null,
    message,
    resolved: false,
  })

  // 2. Email — best effort, never throws
  const apiKey = process.env.RESEND_API_KEY
  const toEmail = process.env.ADMIN_EMAIL
  if (!apiKey || !toEmail) return

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.ALERT_FROM_EMAIL || 'alerts@apivault.uk',
        to: toEmail,
        subject: subject || 'APIvault health alert',
        text: message,
      }),
    })
  } catch (err) {
    // Email failure shouldn't block anything — the dashboard alert already landed.
    console.error('notifyAdmin: email send failed', err.message)
  }
}