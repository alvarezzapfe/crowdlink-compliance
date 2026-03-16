import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const body = await req.json()
    const { invitation_id, email, invite_url: directUrl, nombre_empresa: directNombre } = body

    let inv_email = email
    let invite_url = directUrl
    let nombre_empresa = directNombre || ''

    if (invitation_id) {
      const { data: inv } = await supabaseAdmin.from('invitations').select('*').eq('id', invitation_id).single()
      if (!inv) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdlink-compliance.vercel.app'
      invite_url = `${baseUrl}/invite/${inv.token}`
      inv_email = inv.email
      nombre_empresa = inv.nombre_empresa || ''
    }

    if (!inv_email || !invite_url) {
      return NextResponse.json({ error: 'Faltan datos para enviar el email' }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Resend no configurado' }, { status: 500 })
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: [inv_email],
        subject: `${nombre_empresa ? nombre_empresa + ' — ' : ''}Invitación KYC Crowdlink`,
        html: buildEmailHTML({ nombre_empresa, invite_url }),
      }),
    })

    if (!emailRes.ok) {
      const err = await emailRes.json()
      console.error('Resend error:', err)
      return NextResponse.json({ error: err.message || 'Error enviando email', resend: err }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('send-email error:', e)
    return NextResponse.json({ error: 'Error interno', detail: String(e) }, { status: 500 })
  }
}

function buildEmailHTML({ nombre_empresa, invite_url }: { nombre_empresa: string; invite_url: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

        <!-- HEADER -->
        <tr><td style="background:linear-gradient(135deg,#0F7BF4 0%,#00C98A 100%);padding:32px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <img src="https://crowdlink-compliance.vercel.app/crowdlink-logo.png" alt="crowdlink" height="28" style="display:block;" />
                <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:6px;letter-spacing:0.05em;">COMPLIANCE HUB</div>
              </td>
              <td align="right">
                <div style="background:rgba(255,255,255,0.2);border-radius:8px;padding:6px 12px;display:inline-block;">
                  <span style="color:white;font-size:11px;font-weight:600;">KYC Verification</span>
                </div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- BODY -->
        <tr><td style="padding:40px 40px 32px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0F172A;letter-spacing:-0.02em;">
            ${nombre_empresa ? nombre_empresa + ', completa' : 'Completa'} tu registro KYC
          </h1>
          <p style="margin:0 0 32px;font-size:15px;color:#475569;line-height:1.7;">
            Crowdlink te invita a completar el proceso de verificación de identidad requerido para operar en la plataforma. El proceso toma aproximadamente 10 minutos.
          </p>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td align="center">
              <a href="${invite_url}" style="display:inline-block;background:#0F7BF4;color:white;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:-0.01em;">
                Completar verificación KYC →
              </a>
            </td></tr>
          </table>

          <!-- INFO BADGES -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td width="48%" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:14px 18px;text-align:center;">
                <div style="font-size:10px;font-weight:700;color:#92400E;letter-spacing:0.08em;margin-bottom:4px;">VIGENCIA</div>
                <div style="font-size:15px;font-weight:700;color:#B45309;">72 horas</div>
              </td>
              <td width="4%"></td>
              <td width="48%" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:14px 18px;text-align:center;">
                <div style="font-size:10px;font-weight:700;color:#1D4ED8;letter-spacing:0.08em;margin-bottom:4px;">USO</div>
                <div style="font-size:15px;font-weight:700;color:#1D4ED8;">Un solo acceso</div>
              </td>
            </tr>
          </table>

          <!-- LINK DIRECTO -->
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 18px;">
            <div style="font-size:10px;color:#94A3B8;margin-bottom:6px;font-weight:700;letter-spacing:0.08em;">LINK DIRECTO</div>
            <div style="font-size:12px;color:#475569;word-break:break-all;font-family:'Courier New',monospace;line-height:1.5;">${invite_url}</div>
          </div>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 40px;">
          <p style="margin:0 0 4px;font-size:12px;color:#94A3B8;text-align:center;">
            Link personal e intransferible. Si no solicitaste este acceso, ignora este mensaje.
          </p>
          <p style="margin:0;font-size:11px;color:#CBD5E1;text-align:center;">
            PorCuanto S.A. de C.V. · IFC · CNBV · LFPDPPP
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
