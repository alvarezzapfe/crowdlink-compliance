import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { instancia_id } = body
  if (!instancia_id) return NextResponse.json({ error: 'instancia_id es requerido' }, { status: 400 })

  const { data: instancia, error } = await supabaseAdmin
    .from('contratos_instancias')
    .select('*, contratos_templates(nombre)')
    .eq('id', instancia_id)
    .single()
  if (error || !instancia) return NextResponse.json({ error: 'Instancia no encontrada' }, { status: 404 })
  if (instancia.modo !== 'link_cliente') return NextResponse.json({ error: 'No es de tipo link_cliente' }, { status: 400 })
  if (!instancia.token) return NextResponse.json({ error: 'No hay token generado' }, { status: 400 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdlink-compliance.vercel.app'
  const wizardUrl = `${baseUrl}/contratos/fill/${instancia.token}`
  const templateNombre = (instancia.contratos_templates as { nombre: string })?.nombre || 'Contrato'
  const expiresDate = instancia.token_expires_at
    ? new Date(instancia.token_expires_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    : '7 días'

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Crowdlink Compliance <noreply@plinius.mx>',
        to: instancia.email_cliente,
        subject: `Crowdlink — Completa tu contrato: ${templateNombre}`,
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
          <h2 style="color:#0F172A">Hola ${instancia.nombre_cliente},</h2>
          <p style="color:#475569">Crowdlink te solicita que completes tu <strong>${templateNombre}</strong>.</p>
          <div style="margin:28px 0">
            <a href="${wizardUrl}" style="background:#0891B2;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">
              Completar contrato →
            </a>
          </div>
          <p style="color:#94A3B8;font-size:13px">Link válido hasta: ${expiresDate}<br>${wizardUrl}</p>
          <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0"/>
          <p style="color:#94A3B8;font-size:12px">PorCuanto S.A. de C.V. · Torre Esmeralda III, CDMX</p>
        </div>`
      }),
    })
  }

  return NextResponse.json({ ok: true, wizard_url: wizardUrl, email_enviado_a: instancia.email_cliente })
}
