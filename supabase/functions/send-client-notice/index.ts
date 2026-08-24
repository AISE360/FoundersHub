// ============================================================
// Supabase Edge Function: send-client-notice
// Called manually from the app when founder clicks
// "Send Renewal Notice" on a client card.
// Body: { client_name, client_email, items: [{title, due_date, description}] }
// ============================================================

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(dateStr); target.setHours(0,0,0,0)
  return Math.round((target.getTime() - today.getTime()) / (1000*60*60*24))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }})
  }

  try {
    const { client_name, client_email, items } = await req.json() as {
      client_name: string
      client_email: string
      items: { title: string; due_date: string; description?: string }[]
    }

    if (!client_email || !items?.length) {
      return new Response(JSON.stringify({ error: 'client_email and items are required' }), {
        status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    const sentDate = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })

    const itemRows = items.map(item => {
      const days = daysUntil(item.due_date)
      const urgency = days < 0 ? '🔴 EXPIRED' : days <= 30 ? '🟠 Expiring Soon' : '🟡 Upcoming'
      return `
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #f0f0f0;">
            <div style="font-weight:600;color:#1a1a1a;font-size:14px;">${item.title.replace(/^[^–]+–\s*/, '')}</div>
            ${item.description ? `<div style="color:#6b7280;font-size:12px;margin-top:3px;">${item.description}</div>` : ''}
          </td>
          <td style="padding:14px 20px;border-bottom:1px solid #f0f0f0;white-space:nowrap;font-size:14px;color:#374151;font-weight:600;">
            ${formatDate(item.due_date)}
          </td>
          <td style="padding:14px 20px;border-bottom:1px solid #f0f0f0;white-space:nowrap;text-align:right;">
            <span style="font-size:12px;font-weight:700;">${urgency}</span>
          </td>
        </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:36px 36px 28px;">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
      <div style="background:rgba(255,255,255,0.2);width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;">🌐</div>
      <div>
        <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">AISE 360</div>
        <div style="color:#93c5fd;font-size:13px;">Digital Agency & Web Solutions</div>
      </div>
    </div>
    <div style="background:rgba(255,255,255,0.12);border-radius:10px;padding:16px 20px;">
      <div style="color:#fff;font-size:16px;font-weight:700;">📋 Service Renewal Notice</div>
      <div style="color:#bfdbfe;font-size:13px;margin-top:4px;">Prepared for: <strong style="color:#fff;">${client_name}</strong> &nbsp;•&nbsp; ${sentDate}</div>
    </div>
  </div>

  <!-- Body -->
  <div style="padding:32px 36px;">
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Dear <strong>${client_name}</strong>,
    </p>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 24px;">
      This is a courtesy reminder from <strong>AISE 360</strong> regarding the upcoming renewal dates
      for the digital services we manage on your behalf. Please review the details below and 
      let us know if you'd like to proceed with renewal.
    </p>

    <!-- Services Table -->
    <div style="background:#f8fafc;border-radius:12px;overflow:hidden;margin-bottom:28px;">
      <div style="background:#1e40af;padding:12px 20px;">
        <span style="color:#fff;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Your Services & Renewal Dates</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#eff6ff;">
            <th style="text-align:left;padding:11px 20px;font-size:11px;color:#1e40af;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Service</th>
            <th style="text-align:left;padding:11px 20px;font-size:11px;color:#1e40af;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Expiry Date</th>
            <th style="text-align:right;padding:11px 20px;font-size:11px;color:#1e40af;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Status</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>

    <!-- Note box -->
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:28px;">
      <div style="color:#92400e;font-size:13px;font-weight:700;margin-bottom:4px;">⚠️ Important Note</div>
      <div style="color:#78350f;font-size:13px;line-height:1.6;">
        Auto-renewal is currently <strong>disabled</strong> for all services. 
        Please contact us before the expiry date to avoid any service interruption.
        We recommend renewing at least <strong>7–10 days in advance</strong>.
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:28px;">
      <a href="mailto:aisecureedge360@gmail.com?subject=Renewal%20Request%20-%20${encodeURIComponent(client_name)}&body=Hi%20AISE360%20team%2C%0A%0AI%20would%20like%20to%20proceed%20with%20renewal%20for%20my%20services.%0A%0AThanks%2C%0A${encodeURIComponent(client_name)}"
         style="display:inline-block;background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.2px;">
        ✉️ Contact Us to Renew
      </a>
    </div>

    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
      If you have any questions or would like to discuss your services, feel free to reach out.<br>
      We're happy to help!
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#f1f5f9;padding:20px 36px;border-top:1px solid #e2e8f0;">
    <div style="text-align:center;">
      <div style="color:#1e40af;font-weight:700;font-size:14px;margin-bottom:4px;">AISE 360</div>
      <div style="color:#64748b;font-size:12px;">Digital Agency & Web Solutions</div>
      <div style="margin-top:8px;">
        <a href="mailto:aisecureedge360@gmail.com" style="color:#3b82f6;font-size:12px;text-decoration:none;">aisecureedge360@gmail.com</a>
        &nbsp;•&nbsp;
        <a href="https://aise360.com" style="color:#3b82f6;font-size:12px;text-decoration:none;">aise360.com</a>
      </div>
    </div>
  </div>

</div>
</body></html>`

    const subject = `Service Renewal Reminder — ${client_name} | AISE 360`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AISE 360 <notifications@aise360.com>',
        to: [client_email],
        reply_to: 'aisecureedge360@gmail.com',
        subject,
        html,
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(`Resend error: ${JSON.stringify(data)}`)

    return new Response(JSON.stringify({ sent: true, email: client_email, id: data.id }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})

