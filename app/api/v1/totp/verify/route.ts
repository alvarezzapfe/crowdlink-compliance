import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    'raw', base32Decode(secret).buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  )
  const buf = new ArrayBuffer(8)
  const view = new DataView(buf)
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
  for (const delta of [-2, -1, 0, 1, 2]) {
    const expected = await hotp(secret, counter + delta)
    if (expected === code) return true
  }
  return false
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const authToken = authHeader.replace('Bearer ', '')

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(authToken)
    if (error || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await req.json()
    const code = (body.code || '').trim()
    const isSetup = body.setup === true

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    if (isSetup) {
      const secret = (body.secret || '').trim()
      if (!secret) return NextResponse.json({ error: 'Secret requerido' }, { status: 400 })
      const valid = await verifyTotp(secret, code)
      if (!valid) return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 })
      await supabaseAdmin.from('admin_totp').update({ verified: true }).eq('user_id', user.id)
      return NextResponse.json({ ok: true, verified: true })
    } else {
      const { data: totp } = await supabaseAdmin
        .from('admin_totp').select('secret, verified').eq('user_id', user.id).single()
      if (!totp || !totp.verified) return NextResponse.json({ error: '2FA no configurado' }, { status: 400 })
      console.log('TOTP verify — secret:', totp.secret, 'code:', code, 'time:', Date.now())
    const valid = await verifyTotp(totp.secret, code)
    console.log('TOTP result:', valid)
      if (!valid) return NextResponse.json({ error: 'Código incorrecto o expirado' }, { status: 400 })
      return NextResponse.json({ ok: true, verified: true })
    }
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
