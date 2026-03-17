import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PLD_EMAILS = ['luis@crowdlink.mx', 'lalvarezzapfe@gmail.com', 'pld@crowdlink.mx']
const KYC_ADMIN_EMAILS = ['luis@crowdlink.mx', 'lalvarezzapfe@gmail.com']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // / → /gate siempre
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/gate', request.url))
  }

  // Rutas públicas — sin sesión requerida
  if (
    pathname === '/gate' ||
    pathname === '/kyc' ||
    pathname === '/kyc/inicio' ||
    pathname === '/kyc/wizard' ||
    pathname === '/login' ||
    pathname === '/reset-password' ||
    pathname === '/pld/login' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/api/') ||
    pathname.match(/\.(png|ico|svg|jpg|jpeg|webp|css|js)$/)
  ) {
    return NextResponse.next()
  }

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

  // No autenticado
  if (!user) {
    if (pathname.startsWith('/pld')) return NextResponse.redirect(new URL('/pld/login', request.url))
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const email = user.email || ''

  // ── PLD: solo emails con acceso PLD ──────────────────────────────────────
  if (pathname.startsWith('/pld')) {
    if (!PLD_EMAILS.includes(email)) {
      // Redirige a su área correspondiente en vez de exponer la ruta
      return NextResponse.redirect(new URL('/kyc/admin', request.url))
    }
    return response
  }

  // ── KYC Admin: solo emails con acceso KYC ────────────────────────────────
  if (pathname.startsWith('/kyc/admin')) {
    if (!KYC_ADMIN_EMAILS.includes(email)) {
      return NextResponse.redirect(new URL('/gate', request.url))
    }
    return response
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
