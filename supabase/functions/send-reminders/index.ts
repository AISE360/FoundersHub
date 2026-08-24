// ============================================================
// Supabase Edge Function: send-reminders
// Runs daily via cron — sends email digest of upcoming renewals
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const NOTIFY_EMAIL   = Deno.env.get('NOTIFY_EMAIL')!
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function urgencyColor(days: number): string {
  if (days < 0)   return '#dc2626'
  if (days <= 7)  return '#dc2626'
  if (days <= 14) return '#ea580c'
  return '#d97706'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

Deno.serve(async (_req) => {
  try {
    const today = new Date()
    const in30  = new Date(today)
    in30.setDate(in30.getDate() + 30)
    const in30Str = in30.toISOString().split('T')[0]

    const { data: followUps, error: fuErr } = await supabase
      .from('follow_ups')
      .select('*, project:projects(title)')
      .eq('is_done', false)
      .lte('due_date', in30Str)
      .order('due_date', { ascending: true })

    if (fuErr) throw fuErr

    if (!followUps || followUps.length === 0) {
      return new Response(JSON.stringify({ sent: false, reason: 'Nothing due in 30 days' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const overdue  = followUps.filter(f => daysUntil(f.due_date) < 0)
    const upcoming = followUps.filter(f => daysUntil(f.due_date) >= 0)

    const renderRows = (items: typeof followUps) => items.map(f => {
      const days = daysUntil(f.due_date)
      const color = urgencyColor(days)
      const label = days < 0 ? `${Math.abs(days)}d overdue!` : days === 0 ? 'TODAY!' : `in ${days}d`
      return `<tr>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;">
          <div style="font-weight:600;color:#1a1a1a;font-size:14px;">${f.title}</div>
          ${f.description ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${f.description}</div>` : ''}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;white-space:nowrap;">
          <span style="color:#6b7280;font-size:13px;">${formatDate(f.due_date)}</span>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;white-space:nowrap;text-align:right;">
          <span style="background:${color}20;color:${color};font-weight:700;font-size:12px;padding:4px 10px;border-radius:20px;">${label}</span>
        </td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:640px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px;">
    <div style="color:#fff;font-size:20px;font-weight:700;">🏢 AISE 360 — FoundersHub</div>
    <div style="color:#c4b5fd;font-size:13px;margin-top:4px;">Daily Reminder Digest • ${today.toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}</div>
    <div style="margin-top:16px;display:flex;gap:12px;">
      ${overdue.length > 0 ? `<span style="background:rgba(220,38,38,0.25);color:#fca5a5;padding:5px 14px;border-radius:20px;font-size:13px;font-weight:600;">🔴 ${overdue.length} Overdue</span>` : ''}
      ${upcoming.length > 0 ? `<span style="background:rgba(255,255,255,0.15);color:#fff;padding:5px 14px;border-radius:20px;font-size:13px;font-weight:600;">⏰ ${upcoming.length} Upcoming</span>` : ''}
    </div>
  </div>
  <div style="padding:28px 32px;">
    ${overdue.length > 0 ? `
    <h2 style="color:#dc2626;font-size:15px;font-weight:700;margin:0 0 12px;">🔴 Action Required — Overdue</h2>
    <table style="width:100%;border-collapse:collapse;background:#fff5f5;border-radius:10px;overflow:hidden;margin-bottom:28px;">
      <thead><tr style="background:#fee2e2;">
        <th style="text-align:left;padding:10px 16px;font-size:11px;color:#991b1b;font-weight:700;text-transform:uppercase;">Item</th>
        <th style="text-align:left;padding:10px 16px;font-size:11px;color:#991b1b;font-weight:700;text-transform:uppercase;">Due</th>
        <th style="text-align:right;padding:10px 16px;font-size:11px;color:#991b1b;font-weight:700;text-transform:uppercase;">Status</th>
      </tr></thead>
      <tbody>${renderRows(overdue)}</tbody>
    </table>` : ''}
    ${upcoming.length > 0 ? `
    <h2 style="color:#4f46e5;font-size:15px;font-weight:700;margin:0 0 12px;">⏰ Upcoming (next 30 days)</h2>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="background:#f5f3ff;">
        <th style="text-align:left;padding:10px 16px;font-size:11px;color:#5b21b6;font-weight:700;text-transform:uppercase;">Item</th>
        <th style="text-align:left;padding:10px 16px;font-size:11px;color:#5b21b6;font-weight:700;text-transform:uppercase;">Due</th>
        <th style="text-align:right;padding:10px 16px;font-size:11px;color:#5b21b6;font-weight:700;text-transform:uppercase;">Time Left</th>
      </tr></thead>
      <tbody>${renderRows(upcoming)}</tbody>
    </table>` : ''}
    <div style="margin-top:28px;text-align:center;">
      <a href="https://pjzwllwhdbezgbjnldnj.supabase.co" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">Open FoundersHub →</a>
    </div>
  </div>
  <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">AISE 360 FoundersHub • Automated daily reminder at 9:00 AM IST</p>
  </div>
</div></body></html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'FoundersHub Reminders <notifications@aise360.com>',
        to: [NOTIFY_EMAIL],
        subject: `⏰ ${followUps.length} reminder${followUps.length > 1 ? 's' : ''} — FoundersHub ${today.toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}`,
        html,
      }),
    })
    const resData = await res.json()
    if (!res.ok) throw new Error(`Resend error: ${JSON.stringify(resData)}`)

    return new Response(JSON.stringify({
      sent: true, email: NOTIFY_EMAIL,
      itemCount: followUps.length, overdueCount: overdue.length, upcomingCount: upcoming.length,
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
})

