import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 255
}

async function getAdminUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user
}

// GET — listar invitaciones
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
            Crowdlink te invita a completar el proceso de verificación de identidad requerido para operar en la plataforma. El proceso toma aproximadamente 10 minutos.
          </p>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${invite_url}" style="display:inline-block;background:#0F7BF4;color:white;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;">
              Completar verificación KYC →
            </a>
          </div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
            <div style="font-size:11px;color:#94A3B8;margin-bottom:5px;font-weight:600;letter-spacing:0.05em;">LINK DIRECTO</div>
            <div style="font-size:12px;color:#475569;word-break:break-all;font-family:monospace;">${invite_url}</div>
          </div>
          <div style="display:flex;gap:12px;">
            <div style="flex:1;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:10px 14px;">
              <div style="font-size:11px;font-weight:700;color:#92400E;margin-bottom:2px;">Vigencia</div>
              <div style="font-size:13px;color:#B45309;">72 horas</div>
            </div>
            <div style="flex:1;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px 14px;">
              <div style="font-size:11px;font-weight:700;color:#1D4ED8;margin-bottom:2px;">Uso</div>
              <div style="font-size:13px;color:#1D4ED8;">Un solo acceso</div>
            </div>
          </div>
        </td></tr>
        <tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:18px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.6;">
            Link personal e intransferible. Si no solicitaste este acceso, ignora este mensaje.<br>
            PorCuanto S.A. de C.V. · IFC · CNBV · LFPDPPP
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function GET(req: NextRequest) {
  const user = await getAdminUser(req)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  return NextResponse.json({ invitations: data })
}

// POST — crear invitación (solo genera token, sin enviar email)
export async function POST(req: NextRequest) {
  const user = await getAdminUser(req)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const email = (body.email || '').trim().toLowerCase()
  const nombre_empresa = (body.nombre_empresa || '').trim().slice(0, 200)

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  const { data: inv, error } = await supabaseAdmin
    .from('invitations')
    .insert({ email, nombre_empresa, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Error interno' }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const invite_url = `${baseUrl}/invite/${inv.token}`

  // Send email via Resend if configured
  let email_sent = false
  if (process.env.RESEND_API_KEY) {
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: [email],
          subject: `${nombre_empresa ? nombre_empresa + ' — ' : ''}Invitación KYC Crowdlink`,
          html: buildEmailHTML({ nombre_empresa, invite_url }),
        }),
      })
      email_sent = emailRes.ok
    } catch { email_sent = false }
  }

  return NextResponse.json({ invitation: inv, invite_url, email_sent })
}
