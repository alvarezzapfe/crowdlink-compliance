import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const UpdateSchema = z.object({
  status: z.enum(['pending', 'in_review', 'approved', 'rejected']).optional(),
  notas: z.string().optional(),
  acta_constitutiva_url: z.string().url().optional(),
  comprobante_domicilio_url: z.string().url().optional(),
  identificacion_rep_url: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await validateApiKey(req, 'kyc:read')
  if ('error' in auth) return auth.error

  const { data, error } = await supabaseAdmin
    .from('kyc_empresas')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

  return NextResponse.json({ empresa: data })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await validateApiKey(req, 'kyc:write')
  if ('error' in auth) return auth.error

  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('kyc_empresas')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ empresa: data })
}
