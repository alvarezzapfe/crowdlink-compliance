import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = (body.token || '').trim()

    // Validar formato UUID
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_REGEX.test(token)) {
      return NextResponse.json({ error: 'Token inválido', code: 'INVALID' }, { status: 400 })
    }

    const { data: inv, error } = await supabaseAdmin
      .from('invitations')
      .select('id, email, nombre_empresa, expires_at, used, used_at')
      .eq('token', token)
      .single()

    if (error || !inv) {
      return NextResponse.json({ error: 'Invitación no encontrada', code: 'INVALID' }, { status: 404 })
    }

    if (inv.used) {
      return NextResponse.json({ error: 'Invitación ya utilizada', code: 'USED' }, { status: 410 })
    }

    if (new Date(inv.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitación expirada', code: 'EXPIRED' }, { status: 410 })
    }

    return NextResponse.json({
      email: inv.email,
      nombre_empresa: inv.nombre_empresa,
      expires_at: inv.expires_at,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
