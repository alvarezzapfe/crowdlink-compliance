import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Genera un secret base32 aleatorio sin dependencias externas
function generateBase32Secret(length = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => chars[b % 32]).join('')
}

export async function POST(req: NextRequest) {
  try {
    // Obtener usuario autenticado de la cookie de sesión
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Leer la cookie de sesión del request
    const cookieHeader = req.headers.get('cookie') || ''
    const authToken = extractSessionToken(cookieHeader)
    if (!authToken) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(authToken)
    if (error || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Verificar que es admin
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const secret = generateBase32Secret()
    const issuer = 'Crowdlink Compliance'
    const label = encodeURIComponent(`${issuer}:${user.email}`)
    const otpauth = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
    const qr_url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}&bgcolor=ffffff&color=0F7BF4&qzone=2`

    // Guardar/actualizar secret (no verified aún)
    await supabaseAdmin.from('admin_totp').upsert({
      user_id: user.id,
      secret,
      verified: false,
    }, { onConflict: 'user_id' })

    return NextResponse.json({ secret, qr_url })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

function extractSessionToken(cookieHeader: string): string | null {
  // Supabase guarda el token en sb-[project]-auth-token
  const matches = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/)
  if (!matches) return null
  try {
    const decoded = decodeURIComponent(matches[1])
    const parsed = JSON.parse(decoded)
    return parsed.access_token || null
  } catch {
    return null
  }
}
