import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/permissions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Extrae el path de storage de una URL pública de Supabase
// Formato: https://<project>.supabase.co/storage/v1/object/public/kyc-docs/<path>
function extractPathFromPublicUrl(url: string): string | null {
  const marker = '/storage/v1/object/public/kyc-docs/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length)
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // ── Auth: verificar que es admin ──
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    if (!isAdmin(profile?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // ── Generar signed URL ──
    const { path: rawPath } = await req.json()

    if (!rawPath || typeof rawPath !== 'string') {
      return NextResponse.json({ error: 'Path requerido' }, { status: 400 })
    }

    // Retrocompatibilidad: si es URL pública completa, extraer el path
    let storagePath: string
    if (rawPath.startsWith('https://')) {
      const extracted = extractPathFromPublicUrl(rawPath)
      if (!extracted) {
        return NextResponse.json({ error: 'URL no reconocida' }, { status: 400 })
      }
      storagePath = extracted
    } else {
      storagePath = rawPath
    }

    const { data, error } = await supabaseAdmin.storage
      .from('kyc-docs')
      .createSignedUrl(storagePath, 15 * 60) // 15 minutos

    if (error || !data?.signedUrl) {
      console.error('Signed URL error:', error)
      return NextResponse.json({ error: 'No se pudo generar URL' }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (e) {
    console.error('Signed URL error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
