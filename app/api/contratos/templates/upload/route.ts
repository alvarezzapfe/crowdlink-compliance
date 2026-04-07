import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const nombre = formData.get('nombre') as string
  const descripcion = formData.get('descripcion') as string

  if (!file || !nombre)
    return NextResponse.json({ error: 'file y nombre son requeridos' }, { status: 400 })
  if (!file.name.endsWith('.docx'))
    return NextResponse.json({ error: 'Solo se aceptan archivos .docx' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const safeName = file.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
  const storageKey = `templates/${Date.now()}_${safeName}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('contratos-templates')
    .upload(storageKey, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: false,
    })
  if (uploadError)
    return NextResponse.json({ error: `Error subiendo archivo: ${uploadError.message}` }, { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage.from('contratos-templates').getPublicUrl(storageKey)

  const variables = await detectVariables(buffer)

  const { data, error } = await supabaseAdmin
    .from('contratos_templates')
    .insert({ nombre, descripcion: descripcion || null, file_url: publicUrl, file_name: file.name, variables })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ template: data, variables_detectadas: variables.length })
}

async function detectVariables(buffer: Buffer): Promise<string[]> {
  try {
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(buffer)
    const docXml = await zip.file('word/document.xml')?.async('string')
    if (!docXml) return []
    const textContent = docXml.replace(/<[^>]+>/g, ' ')
    const matches = textContent.match(/\{\{([A-Z0-9_]+)\}\}/g) || []
    const unique = [...new Set(matches.map(m => m.replace(/[{}]/g, '').trim()))]
    return unique
  } catch {
    return []
  }
}
