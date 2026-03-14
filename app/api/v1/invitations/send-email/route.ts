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
      return NextResponse.json({ error: err.message || 'Error enviando email' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

function buildEmailHTML({ nombre_empresa, invite_url }: { nombre_empresa: string; invite_url: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#0F7BF4,#3DFFA0);padding:28px 32px;">
          <div style="font-size:20px;font-weight:700;color:white;">crowdlink</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:2px;">Compliance Hub</div>
        </td></tr>
        <tr><td style="padding:36px 40px 28px;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0F172A;">
            ${nombre_empresa ? nombre_empresa + ', completa' : 'Completa'} tu registro KYC
          </h1>
          <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6;">
            Crowdlink te invita a completar el proceso de verificación de identidad requerido para operar en la plataforma.
          </p>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${invite_url}" style="display:inline-block;background:#0F7BF4;color:white;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;">
              Completar verificación KYC →
            </a>
          </div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 18px;">
            <div style="font-size:11px;color:#94A3B8;margin-bottom:5px;font-weight:600;">LINK DIRECTO</div>
            <div style="font-size:12px;color:#475569;word-break:break-all;font-family:monospace;">${invite_url}</div>
          </div>
        </td></tr>
        <tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:18px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94A3B8;">
            PorCuanto S.A. de C.V. · IFC · CNBV · LFPDPPP
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
