import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabaseAdmin
    .from('contratos_instancias')
    .select('*, contratos_templates(*)')
    .eq('id', params.id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ instancia: data })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { datos, status } = body
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (datos !== undefined) updates.datos = datos
  if (status !== undefined) {
    updates.status = status
    if (status === 'completado') updates.completed_at = new Date().toISOString()
  }
  const { data, error } = await supabaseAdmin
    .from('contratos_instancias')
    .update(updates)
    .eq('id', params.id)
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ instancia: data })
}
