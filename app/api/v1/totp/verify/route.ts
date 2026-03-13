import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── TOTP puro sin dependencias ────────────────────────────────────────────────
// RFC 6238 — TOTP = HOTP con counter = floor(unix_time / 30)

function base32Decode(s: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const str = s.toUpperCase().replace(/=+$/, '')
  let bits = 0, value = 0
  const out: number[] = []
  for (const char of str) {
    const idx = alphabet.indexOf(char)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) { bits -= 8; out.push((value >> bits) & 0xff) }
  }
  return new Uint8Array(out)
}

async function hotp(secret: string, counter: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', base32Decode(secret),
    { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  )
  const buf = new ArrayBuffer(8)
  const view = new DataView(buf)
  // Write counter as big-endian uint64
  view.setUint32(0, Math.floor(counter / 0x100000000), false)
  view.setUint32(4, counter >>> 0, false)
  const sig = await crypto.subtle.sign('HMAC', key, buf)
  const bytes = new Uint8Array(sig)
  const offset = bytes[19] & 0xf
  const code = (
    ((bytes[offset] & 0x7f) << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  ) % 1000000
  return code.toString().padStart(6, '0')
}

async function verifyTotp(secret: string, code: string): Promise<boolean> {
  const counter = Math.floor(Date.now() / 1000 / 30)
  // Ventana de ±1 step (90 segundos) para tolerancia de reloj
  for (const delta of [-1, 0, 1]) {
    const expected = await hotp(secret, counter + delta)
    if (expected === code) return true
  }
  return false
}

function extractSessionToken(cookieHeader: string): string | null {
  const matches = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/)
  if (!matches) return null
  try {
    const decoded = decodeURIComponent(matches[1])
    const parsed = JSON.parse(decoded)
    return parsed.access_token || null
  } catch { return null }
}

// ─── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie') || ''
    const authToken = extractSessionToken(cookieHeader)
    if (!authToken) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(authToken)
    if (error || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await req.json()
    const code = (body.code || '').trim()
    const isSetup = body.setup === true

    // Validar formato
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Código inválido — debe ser 6 dígitos' }, { status: 400 })
    }

    if (isSetup) {
      // En setup, el secret viene en el body (recién generado)
      const secret = (body.secret || '').trim()
      if (!secret) return NextResponse.json({ error: 'Secret requerido' }, { status: 400 })

      const valid = await verifyTotp(secret, code)
      if (!valid) return NextResponse.json({ error: 'Código incorrecto. Verifica la hora de tu dispositivo.' }, { status: 400 })

      // Marcar como verified
      await supabaseAdmin.from('admin_totp').update({ verified: true }).eq('user_id', user.id)
      return NextResponse.json({ ok: true })

    } else {
      // Verificación normal — leer secret de BD
      const { data: totp } = await supabaseAdmin
        .from('admin_totp')
        .select('secret, verified')
        .eq('user_id', user.id)
        .single()

      if (!totp || !totp.verified) {
        return NextResponse.json({ error: '2FA no configurado' }, { status: 400 })
      }

      const valid = await verifyTotp(totp.secret, code)
      if (!valid) return NextResponse.json({ error: 'Código incorrecto o expirado' }, { status: 400 })

      return NextResponse.json({ ok: true })
    }
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
