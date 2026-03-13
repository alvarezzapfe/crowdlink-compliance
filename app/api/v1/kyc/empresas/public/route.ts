import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Endpoint público — permite submissions sin sesión autenticada
// Usa service role para insertar en kyc_empresas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validación mínima
    if (!body.razon_social || !body.rfc) {
      return NextResponse.json({ error: 'Razón social y RFC requeridos' }, { status: 400 })
    }

    // Sanitizar
    const payload = {
      razon_social: String(body.razon_social).trim().slice(0, 200),
      rfc: String(body.rfc).trim().toUpperCase().slice(0, 13),
      tipo_persona: body.tipo_persona === 'fisica' ? 'fisica' : 'moral',
      giro: String(body.giro || '').trim().slice(0, 100),
      pais: String(body.pais || 'MX').slice(0, 5),
      rep_legal_nombre: String(body.rep_legal_nombre || '').trim().slice(0, 200),
      rep_legal_curp: String(body.rep_legal_curp || '').trim().toUpperCase().slice(0, 18),
      acta_constitutiva_url: body.acta_constitutiva_url || null,
      comprobante_domicilio_url: body.comprobante_domicilio_url || null,
      identificacion_rep_url: body.identificacion_rep_url || null,
      status: 'pending',
      metadata: body.metadata || {},
    }

    const { data, error } = await supabaseAdmin
      .from('kyc_empresas')
      .insert(payload)
      .select('id')
      .single()

    if (error) throw error
    return NextResponse.json({ id: data.id, ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error al registrar solicitud' }, { status: 500 })
  }
}
