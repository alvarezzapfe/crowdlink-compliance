import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const PUBLIC_ROUTES = ['/', '/login', '/faq', '/reset-password']
  const PUBLIC_PREFIXES = ['/auth/', '/invite/', '/api/', '/contratos/fill/', '/register/', '/kyc', '/pld/login']

  const isPublic =
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some(p => pathname.startsWith(p)) ||
    !!pathname.match(/\.(png|ico|svg|jpg|jpeg|webp|css|js|woff|woff2)$/)

  if (isPublic) return NextResponse.next()

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const { data: profile } = await supabase
    .from('profiles').select('role, activo, session_token').eq('id', user.id).single()

  if (!profile?.activo) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=inactive', request.url))
  }

  // Verificar sesión única — cookie debe coincidir con DB
  const cookieToken = request.cookies.get('cl_session_token')?.value
  if (!cookieToken || cookieToken !== profile.session_token) {
    return NextResponse.redirect(new URL('/login?error=session', request.url))
  }

  if (pathname.startsWith('/admin/usuarios') && !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.redirect(new URL('/gate', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
