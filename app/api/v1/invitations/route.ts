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

  return NextResponse.json({ invitation: inv, invite_url })
}
