import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateBase32Secret(): string {
  // Generate 20 random bytes and encode as base32
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let result = ''
  let buffer = 0
  let bitsLeft = 0
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bitsLeft += 8
    while (bitsLeft >= 5) {
      bitsLeft -= 5
      result += chars[(buffer >> bitsLeft) & 31]
    }
  }
  return result
}

export async function POST(req: NextRequest) {
  try {
    // Read token from Authorization header (not cookies)
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    if (!['admin', 'super_admin', 'compliance_officer', 'readonly'].includes(profile?.role || '')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const secret = generateBase32Secret()
    const issuer = 'Crowdlink Compliance'
    const label = encodeURIComponent(`${issuer}:${user.email}`)
    const otpauth = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
    const qr_url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}&bgcolor=ffffff&color=0F7BF4&qzone=2`

    await supabaseAdmin.from('admin_totp').upsert({
      user_id: user.id, secret, verified: false,
    }, { onConflict: 'user_id' })

    return NextResponse.json({ secret, qr_url })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
