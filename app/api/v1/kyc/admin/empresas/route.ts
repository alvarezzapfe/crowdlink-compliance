import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) return NextResponse.json({ error: 'No autorizado', detail: userError?.message }, { status: 401 })
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden', role: profile?.role }, { status: 403 })
    const { data, error: dbError, count } = await supabaseAdmin
      .from('kyc_empresas')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (dbError) return NextResponse.json({ error: dbError.message, code: dbError.code }, { status: 500 })
    return NextResponse.json({ empresas: data || [], count })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
