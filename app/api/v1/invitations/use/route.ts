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

    const sessionToken = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(sessionToken)
    if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const token = (body.token || '').trim()

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_REGEX.test(token)) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
    }

    // Verificar que el token pertenece al email del usuario autenticado
    const { data: inv } = await supabaseAdmin
      .from('invitations')
      .select('id, email, used')
      .eq('token', token)
      .single()

    if (!inv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (inv.email !== user.email) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    if (inv.used) return NextResponse.json({ ok: true }) // idempotente

    // Marcar como usado
    await supabaseAdmin.from('invitations').update({
      used: true,
      used_at: new Date().toISOString(),
    }).eq('id', inv.id)

    // Crear perfil si no existe
    await supabaseAdmin.from('profiles').upsert({
      id: user.id,
      email: user.email,
      nombre: user.email?.split('@')[0],
      role: 'empresa',
    }, { onConflict: 'id', ignoreDuplicates: true })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
