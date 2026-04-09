import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getCallerRole(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  return { user, role: profile?.role as string | null }
}

export async function GET(req: NextRequest) {
  const caller = await getCallerRole(req)
  if (!caller || !['super_admin', 'admin'].includes(caller.role || ''))
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = users.map(u => u.id)
  const { data: profiles } = await supabaseAdmin.from('profiles').select('*').in('id', userIds)

  const result = users.map(u => {
    const profile = profiles?.find(p => p.id === u.id)
    return {
      id: u.id, email: u.email,
      nombre: profile?.nombre || null, apellidos: profile?.apellidos || null,
      role: profile?.role || 'readonly', activo: profile?.activo ?? false,
      last_login: u.last_sign_in_at, created_at: u.created_at,
    }
  })

  return NextResponse.json({ usuarios: result })
}

export async function PATCH(req: NextRequest) {
  const caller = await getCallerRole(req)
  if (!caller || !['super_admin', 'admin'].includes(caller.role || ''))
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const { user_id, role, activo } = body
  if (!user_id) return NextResponse.json({ error: 'user_id requerido' }, { status: 400 })

  const { data: targetProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', user_id).single()
  if (targetProfile?.role === 'super_admin' && caller.role !== 'super_admin')
    return NextResponse.json({ error: 'No puedes modificar a un super admin' }, { status: 403 })

  const updates: Record<string, unknown> = {}
  if (role !== undefined) updates.role = role
  if (activo !== undefined) updates.activo = activo

  const { error } = await supabaseAdmin.from('profiles').update(updates).eq('id', user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
