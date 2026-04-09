import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  const { data: invite, error } = await supabaseAdmin
    .from('user_invitations').select('*').eq('token', params.token).single()

  if (error || !invite) return NextResponse.json({ error: 'Invitación no encontrada', code: 'NOT_FOUND' }, { status: 404 })
  if (invite.status === 'accepted') return NextResponse.json({ error: 'Esta invitación ya fue usada', code: 'USED' }, { status: 409 })
  if (invite.status === 'revoked') return NextResponse.json({ error: 'Esta invitación fue revocada', code: 'REVOKED' }, { status: 410 })
  if (new Date(invite.expires_at) < new Date()) {
    await supabaseAdmin.from('user_invitations').update({ status: 'expired' }).eq('id', invite.id)
    return NextResponse.json({ error: 'Esta invitación ha expirado', code: 'EXPIRED' }, { status: 410 })
  }
  return NextResponse.json({ email: invite.email, nombre: invite.nombre, role: invite.role })
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { password, nombre, apellidos } = await req.json()
  if (!password || password.length < 8)
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })

  const { data: invite, error: invError } = await supabaseAdmin
    .from('user_invitations').select('*').eq('token', params.token).single()
  if (invError || !invite || invite.status !== 'pending')
    return NextResponse.json({ error: 'Invitación inválida o ya usada' }, { status: 400 })
  if (new Date(invite.expires_at) < new Date())
    return NextResponse.json({ error: 'La invitación ha expirado' }, { status: 410 })

  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: invite.email, password, email_confirm: true,
  })
  if (createError) {
    if (createError.message.includes('already'))
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email' }, { status: 409 })
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  await supabaseAdmin.from('profiles').upsert({
    id: newUser.user.id, email: invite.email,
    nombre: nombre || invite.nombre || null, apellidos: apellidos || null,
    role: invite.role, activo: false, invited_by: invite.invited_by,
  })

  await supabaseAdmin.from('user_invitations').update({
    status: 'accepted', accepted_at: new Date().toISOString(),
  }).eq('id', invite.id)

  return NextResponse.json({ ok: true, user_id: newUser.user.id, email: invite.email })
}
