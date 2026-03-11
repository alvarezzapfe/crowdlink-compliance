import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

const CreateKeySchema = z.object({
  client_name: z.string().min(2).max(100),
  scopes: z.array(z.enum(['kyc:read', 'kyc:write', 'pld:read', 'pld:write', '*'])).min(1),
})

// Endpoint admin — proteger con variable de entorno o mover a panel interno
export async function POST(req: NextRequest) {
  // Verificar admin secret (simple por ahora)
  const adminSecret = req.headers.get('x-admin-secret')
  if (adminSecret !== process.env.API_SECRET_SALT) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = CreateKeySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { client_name, scopes } = parsed.data

  // Generar key legible: cl_live_<uuid>
  const rawKey = `cl_live_${uuidv4().replace(/-/g, '')}`

  // Hash para guardar en DB
  const encoder = new TextEncoder()
  const data = encoder.encode(rawKey + process.env.API_SECRET_SALT)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const { data: inserted, error } = await supabaseAdmin
    .from('api_keys')
    .insert({ client_name, scopes, key_hash: keyHash, is_active: true })
    .select('id, client_name, scopes, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    message: 'API key created. Guárdala — no se volverá a mostrar.',
    api_key: rawKey, // Solo se retorna al crear
    ...inserted,
  })
}

export async function GET(req: NextRequest) {
  const adminSecret = req.headers.get('x-admin-secret')
  if (adminSecret !== process.env.API_SECRET_SALT) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('id, client_name, scopes, is_active, last_used_at, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ api_keys: data })
}
