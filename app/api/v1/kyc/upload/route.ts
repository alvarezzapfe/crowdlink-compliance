import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

// Magic bytes para validar MIME real (no extensión)
const MAGIC: { mime: string; ext: string; bytes: number[]; offset?: number }[] = [
  { mime: 'application/pdf', ext: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46] },         // %PDF
  { mime: 'image/jpeg',      ext: 'jpg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',       ext: 'png', bytes: [0x89, 0x50, 0x4E, 0x47] },          // .PNG
]

function detectMime(buffer: ArrayBuffer): { mime: string; ext: string } | null {
  const header = new Uint8Array(buffer, 0, Math.min(16, buffer.byteLength))
  for (const m of MAGIC) {
    const offset = m.offset ?? 0
    if (header.length < offset + m.bytes.length) continue
    if (m.bytes.every((b, i) => header[offset + i] === b)) {
      return { mime: m.mime, ext: m.ext }
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const tipo = formData.get('tipo') as string | null // acta | domicilio | identificacion

    if (!file || !tipo) {
      return NextResponse.json({ error: 'Archivo y tipo requeridos' }, { status: 400 })
    }

    if (!['acta', 'domicilio', 'identificacion'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de documento no válido' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Archivo excede 10 MB' }, { status: 400 })
    }

    // Leer buffer y validar magic bytes
    const buffer = await file.arrayBuffer()
    const detected = detectMime(buffer)

    if (!detected) {
      return NextResponse.json(
        { error: 'Formato no permitido. Solo PDF, JPG o PNG.' },
        { status: 400 }
      )
    }

    const path = `kyc/${randomUUID()}-${tipo}.${detected.ext}`

    const { error } = await supabaseAdmin.storage
      .from('kyc-docs')
      .upload(path, Buffer.from(buffer), {
        contentType: detected.mime,
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
    }

    return NextResponse.json({ path })
  } catch (e) {
    console.error('Upload error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
