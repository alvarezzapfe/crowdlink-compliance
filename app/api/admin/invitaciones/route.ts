import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getCaller(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data: profile } = await supabaseAdmin.from('profiles').select('role, nombre').eq('id', user.id).single()
  return { user, role: profile?.role as string | null, nombre: profile?.nombre as string | null }
}

export async function GET(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller || !['super_admin', 'admin'].includes(caller.role || ''))
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { data, error } = await supabaseAdmin.from('user_invitations').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invitaciones: data })
}

export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller || !['super_admin', 'admin'].includes(caller.role || ''))
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { email, nombre, role } = await req.json()
  if (!email || !role) return NextResponse.json({ error: 'email y role son requeridos' }, { status: 400 })

  const { data: existing } = await supabaseAdmin.from('user_invitations').select('id').eq('email', email).eq('status', 'pending').single()
  if (existing) return NextResponse.json({ error: 'Ya existe una invitación pendiente para ese email' }, { status: 409 })

  const { data: invite, error } = await supabaseAdmin.from('user_invitations')
    .insert({ email, nombre: nombre || null, role, invited_by: caller.user.id })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdlink-compliance.vercel.app'
  const registerUrl = `${baseUrl}/register/${invite.token}`
  const roleLabels: Record<string, string> = { admin: 'Administrador', compliance_officer: 'Compliance Officer', readonly: 'Solo lectura' }
  const expiresDate = new Date(invite.expires_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  const invitadoPor = caller.nombre || 'Luis Álvarez'

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Crowdlink Compliance <noreply@crowdlink.mx>',
        to: email,
        subject: 'Invitación — Crowdlink Compliance Hub',
        html: `<div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto">
          <div style="background:#0F172A;padding:24px 32px;border-radius:16px 16px 0 0">
            <span style="color:#3EE8A0;font-weight:800;font-size:1.2rem">crowd</span><span style="color:white;font-weight:800;font-size:1.2rem">link</span>
          </div>
          <div style="background:white;padding:32px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 16px 16px">
            <p style="color:#64748B;margin:0 0 6px">Hola ${nombre || email},</p>
            <h1 style="color:#0F172A;font-size:1.3rem;font-weight:700;margin:0 0 16px">Te invitaron al Compliance Hub</h1>
            <p style="color:#475569;font-size:0.875rem;line-height:1.7;margin:0 0 24px">
              <strong>${invitadoPor}</strong> te ha invitado con el rol de <strong>${roleLabels[role] || role}</strong>.
            </p>
            <div style="text-align:center;margin:28px 0">
              <a href="${registerUrl}" style="background:#1E6FF1;color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;display:inline-block">Crear mi cuenta →</a>
            </div>
            <p style="color:#94A3B8;font-size:0.75rem">Link válido hasta el ${expiresDate}</p>
          </div>
        </div>`
      }),
    })
  }

  return NextResponse.json({ ok: true, invite, register_url: registerUrl })
}

export async function DELETE(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller || !['super_admin', 'admin'].includes(caller.role || ''))
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { id } = await req.json()
  await supabaseAdmin.from('user_invitations').update({ status: 'revoked' }).eq('id', id)
  return NextResponse.json({ ok: true })
}
