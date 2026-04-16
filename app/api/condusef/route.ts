import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const anio = searchParams.get('anio') || new Date().getFullYear().toString()

  const { data, error } = await supabaseAdmin
    .from('condusef_reportes')
    .select('*')
    .like('periodo', `${anio}%`)
    .order('periodo', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reportes: data })
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  const registro = formData.get('registro') as string
  const tipo_reporte = formData.get('tipo_reporte') as string
  const periodicidad = formData.get('periodicidad') as string
  const periodo = formData.get('periodo') as string

  if (!file || !registro || !tipo_reporte || !periodo)
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

  const filePath = `${registro}/${periodo}/${tipo_reporte.replace(/\s+/g, '_')}_${Date.now()}.pdf`
  const arrayBuffer = await file.arrayBuffer()

  // Borrar archivo anterior si existe
  const { data: existing } = await supabaseAdmin
    .from('condusef_reportes')
    .select('file_path')
    .eq('registro', registro)
    .eq('tipo_reporte', tipo_reporte)
    .eq('periodo', periodo)
    .single()

  if (existing?.file_path) {
    await supabaseAdmin.storage.from('condusef-reportes').remove([existing.file_path])
  }

  const { error: uploadError } = await supabaseAdmin.storage
    .from('condusef-reportes')
    .upload(filePath, arrayBuffer, { contentType: 'application/pdf', upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: signedData } = await supabaseAdmin.storage
    .from('condusef-reportes')
    .createSignedUrl(filePath, 60 * 60 * 24 * 30)

  const { error: dbError } = await supabaseAdmin
    .from('condusef_reportes')
    .upsert({
      registro, tipo_reporte, periodicidad, periodo,
      file_name: file.name, file_path: filePath,
      file_url: signedData?.signedUrl,
      status: 'cargado',
      uploaded_by: user.id,
      uploaded_at: new Date().toISOString(),
    }, { onConflict: 'registro,tipo_reporte,periodo' })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, file_path } = await req.json()
  if (file_path) await supabaseAdmin.storage.from('condusef-reportes').remove([file_path])
  await supabaseAdmin.from('condusef_reportes').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
