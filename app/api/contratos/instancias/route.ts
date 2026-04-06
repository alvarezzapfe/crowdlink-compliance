import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  let query = supabaseAdmin
    .from('contratos_instancias')
    .select('*, contratos_templates(nombre, file_name)')
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ instancias: data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { template_id, nombre_cliente, email_cliente, razon_social, rfc, modo, datos, created_by } = body
  if (!template_id || !nombre_cliente || !email_cliente || !modo)
    return NextResponse.json({ error: 'template_id, nombre_cliente, email_cliente y modo son requeridos' }, { status: 400 })
  const token = modo === 'link_cliente' ? randomUUID() : null
  const token_expires_at = token ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null
  const { data, error } = await supabaseAdmin
    .from('contratos_instancias')
    .insert({
      template_id, nombre_cliente, email_cliente,
      razon_social: razon_social || null, rfc: rfc || null,
      modo, token, token_expires_at, datos: datos || {},
      status: modo === 'wizard_interno' ? 'borrador' : 'enviado',
      created_by: created_by || null,
    })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ instancia: data })
}
