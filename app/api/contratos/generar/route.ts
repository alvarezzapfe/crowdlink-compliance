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

  const { data: instancia, error: instError } = await supabaseAdmin
    .from('contratos_instancias')
    .select('*, contratos_templates(file_url, file_name, variables)')
    .eq('id', instancia_id)
    .single()
  if (instError || !instancia) return NextResponse.json({ error: 'Instancia no encontrada' }, { status: 404 })

  const template = instancia.contratos_templates as { file_url: string; file_name: string; variables: string[] }
  const datos: Record<string, string> = instancia.datos || {}

  const fileKey = template.file_url.split('/contratos-templates/')[1]?.split('?')[0]
  let templateBuffer: Buffer

  if (fileKey) {
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from('contratos-templates')
      .createSignedUrl(decodeURIComponent(fileKey), 60)
    if (signedError || !signedData?.signedUrl) {
      const response = await fetch(template.file_url)
      if (!response.ok) return NextResponse.json({ error: 'No se pudo descargar el template' }, { status: 500 })
      templateBuffer = Buffer.from(await response.arrayBuffer())
    } else {
      const response = await fetch(signedData.signedUrl)
      if (!response.ok) return NextResponse.json({ error: 'No se pudo descargar el template' }, { status: 500 })
      templateBuffer = Buffer.from(await response.arrayBuffer())
    }
  } else {
    const response = await fetch(template.file_url)
    if (!response.ok) return NextResponse.json({ error: 'No se pudo descargar el template' }, { status: 500 })
    templateBuffer = Buffer.from(await response.arrayBuffer())
  }

  const outputBuffer = await substituteVariables(templateBuffer, datos)

  const outputKey = `generados/${instancia_id}_${Date.now()}.docx`
  const { error: uploadError } = await supabaseAdmin.storage
    .from('contratos-generados')
    .upload(outputKey, outputBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    })
  if (uploadError) return NextResponse.json({ error: `Error guardando: ${uploadError.message}` }, { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage.from('contratos-generados').getPublicUrl(outputKey)

  await supabaseAdmin.from('contratos_instancias').update({
    output_url: publicUrl, status: 'generado', updated_at: new Date().toISOString(),
  }).eq('id', instancia_id)

  return NextResponse.json({ ok: true, download_url: publicUrl })
}

async function substituteVariables(buffer: Buffer, datos: Record<string, string>): Promise<Buffer> {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(buffer)
  const xmlFiles = ['word/document.xml', 'word/header1.xml', 'word/footer1.xml']
  for (const fileName of xmlFiles) {
    const file = zip.file(fileName)
    if (!file) continue
    let content = await file.async('string')
    for (const [key, value] of Object.entries(datos)) {
      if (!value) continue
      const escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), escaped)
    }
    zip.file(fileName, content)
  }
  return Buffer.from(await zip.generateAsync({ type: 'arraybuffer' }))
}
