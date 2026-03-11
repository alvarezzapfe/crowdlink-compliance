import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const ConsultaSchema = z.object({
  nombre: z.string().optional(),
  rfc: z.string().optional(),
  curp: z.string().optional(),
  tipo: z.enum(['persona_fisica', 'persona_moral']).optional(),
}).refine((d) => d.nombre || d.rfc || d.curp, {
  message: 'Debes enviar al menos nombre, rfc o curp',
})

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req, 'pld:read')
  if ('error' in auth) return auth.error

  const body = await req.json()
  const parsed = ConsultaSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { nombre, rfc, curp } = parsed.data
  const resultados: Record<string, unknown>[] = []

  // Búsqueda en nuestra tabla de listas locales
  let query = supabaseAdmin.from('pld_listas').select('*')

  if (rfc) query = query.or(`rfc.eq.${rfc}`)
  else if (curp) query = query.or(`curp.eq.${curp}`)
  else if (nombre) query = query.ilike('nombre_completo', `%${nombre}%`)

  const { data: localResults } = await query.limit(20)
  if (localResults) resultados.push(...localResults)

  // Log de la consulta para auditoría
  await supabaseAdmin.from('pld_consultas').insert({
    query_nombre: nombre,
    query_rfc: rfc,
    query_curp: curp,
    resultados_count: resultados.length,
    consultado_por_key: auth.keyRecord.id,
  })

  return NextResponse.json({
    hits: resultados.length,
    alerta: resultados.length > 0,
    resultados,
    meta: {
      fuentes_consultadas: ['pld_local'],
      // TODO: integrar OFAC SDN API, Lista SAT 69-B
      fuentes_pendientes: ['ofac_sdn', 'sat_69b', 'onu_consolidada'],
    },
  })
}

// GET — historial de consultas del cliente
export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req, 'pld:read')
  if ('error' in auth) return auth.error

  const { data, error } = await supabaseAdmin
    .from('pld_consultas')
    .select('*')
    .eq('consultado_por_key', auth.keyRecord.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ consultas: data })
}
