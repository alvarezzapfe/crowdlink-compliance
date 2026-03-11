import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const EmpresaSchema = z.object({
  razon_social: z.string().min(2),
  rfc: z.string().regex(/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/, 'RFC inválido'),
  tipo_persona: z.enum(['moral', 'fisica']),
  giro: z.string().optional(),
  pais: z.string().default('MX'),
  // Representante legal
  rep_legal_nombre: z.string().optional(),
  rep_legal_curp: z.string().optional(),
  // Documentos (URLs a storage)
  acta_constitutiva_url: z.string().url().optional(),
  comprobante_domicilio_url: z.string().url().optional(),
  identificacion_rep_url: z.string().url().optional(),
  // Metadata
  metadata: z.record(z.unknown()).optional(),
})

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req, 'kyc:read')
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // pending | approved | rejected
  const rfc = searchParams.get('rfc')

  let query = supabaseAdmin
    .from('kyc_empresas')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (status) query = query.eq('status', status)
  if (rfc) query = query.ilike('rfc', `%${rfc}%`)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ empresas: data, count: data.length })
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req, 'kyc:write')
  if ('error' in auth) return auth.error

  const body = await req.json()
  const parsed = EmpresaSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Verificar si ya existe el RFC
  const { data: existing } = await supabaseAdmin
    .from('kyc_empresas')
    .select('id, status')
    .eq('rfc', parsed.data.rfc)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'RFC ya registrado', empresa_id: existing.id, status: existing.status },
      { status: 409 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('kyc_empresas')
    .insert({
      ...parsed.data,
      status: 'pending',
      submitted_by_key: auth.keyRecord.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ empresa: data }, { status: 201 })
}
