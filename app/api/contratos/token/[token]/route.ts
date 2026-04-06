import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  const { data, error } = await supabaseAdmin
    .from('contratos_instancias')
    .select('*, contratos_templates(nombre, variables)')
    .eq('token', params.token)
    .single()
  if (error || !data) return NextResponse.json({ error: 'Token inválido o no encontrado' }, { status: 404 })
  if (data.token_expires_at && new Date(data.token_expires_at) < new Date())
    return NextResponse.json({ error: 'Este link ha expirado' }, { status: 410 })
  if (data.status === 'generado')
    return NextResponse.json({ error: 'Este contrato ya fue completado' }, { status: 409 })
  return NextResponse.json({
    instancia: {
      id: data.id,
      nombre_cliente: data.nombre_cliente,
      razon_social: data.razon_social,
      rfc: data.rfc,
      datos: data.datos,
      status: data.status,
      template: data.contratos_templates,
    }
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  const body = await req.json()
  const { datos } = body
  const { data: instancia, error: findError } = await supabaseAdmin
    .from('contratos_instancias')
    .select('id, token_expires_at, status')
    .eq('token', params.token)
    .single()
  if (findError || !instancia) return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
  if (instancia.token_expires_at && new Date(instancia.token_expires_at) < new Date())
    return NextResponse.json({ error: 'Este link ha expirado' }, { status: 410 })
  if (instancia.status === 'generado')
    return NextResponse.json({ error: 'Este contrato ya fue completado' }, { status: 409 })
  const { data, error } = await supabaseAdmin
    .from('contratos_instancias')
    .update({ datos, status: 'completado', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', instancia.id)
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, instancia_id: data.id })
}
