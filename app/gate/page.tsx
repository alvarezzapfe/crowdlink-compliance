'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import { cl } from '@/lib/design'
import { IconShield, IconBuilding } from '@/components/Icons'

const INACTIVITY_MS = 10 * 60 * 1000

async function doLogout() {
  const { createClient } = await import('@/lib/supabase-client')
  const supabase = createClient()
  await supabase.auth.signOut()
  document.cookie = 'cl_2fa_verified=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  window.location.href = '/login?reason=inactivity'
}

function LogoutBtn() {
  async function handleLogout() {
    const { createClient } = await import('@/lib/supabase-client')
    const supabase = createClient()
    await supabase.auth.signOut()
    document.cookie = 'cl_2fa_verified=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    window.location.href = '/'
  }
  return (
    <button onClick={handleLogout}
      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#EF4444', fontSize: '0.75rem', fontWeight: '500', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '7px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontFamily: 'inherit' }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      Salir
    </button>
  )
}

function ModuleCard({ m, hovered, setHovered }: { m: any; hovered: string | null; setHovered: (id: string | null) => void }) {
  const isHovered = hovered === m.id
  return (
    <a href={m.active ? m.href : undefined}
      style={{ textDecoration: 'none', cursor: m.active ? 'pointer' : 'default' }}
      onMouseEnter={() => m.active && setHovered(m.id)}
      onMouseLeave={() => setHovered(null)}>
      <div style={{
        background: '#fff',
        border: `1.5px solid ${isHovered ? m.accent : '#E2E8F0'}`,
        borderRadius: '12px', padding: '1rem 1.1rem',
        boxShadow: isHovered ? `0 6px 20px rgba(0,0,0,0.08), 0 0 0 3px ${m.accentLight}` : '0 1px 4px rgba(0,0,0,0.05)',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.18s ease',
        opacity: m.active ? 1 : 0.55,
        display: 'flex', flexDirection: 'column' as const, gap: '0.7rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: m.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {m.icon}
          </div>
          <span style={{ background: m.active ? m.accentLight : '#F1F5F9', color: m.active ? m.accent : '#94A3B8', fontSize: '0.58rem', fontWeight: '700', padding: '0.2rem 0.55rem', borderRadius: '9999px', letterSpacing: '0.04em' }}>
            {m.active ? 'ACTIVO' : 'PRÓXIMO'}
          </span>
        </div>
        <div>
          <h2 style={{ color: '#0F172A', fontSize: '0.83rem', fontWeight: '700', margin: '0 0 0.25rem', letterSpacing: '-0.01em' }}>{m.label}</h2>
          <p style={{ color: '#64748B', fontSize: '0.72rem', margin: 0, lineHeight: 1.5 }}>{m.desc}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' as const }}>
          {m.tags.map((t: string) => (
            <span key={t} style={{ background: '#F8FAFC', color: '#64748B', fontSize: '0.63rem', fontWeight: '500', padding: '0.15rem 0.45rem', borderRadius: '5px', border: '1px solid #E2E8F0' }}>{t}</span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.65rem', borderTop: '1px solid #F1F5F9', marginTop: 'auto' }}>
          <span style={{ color: m.active ? m.accent : '#94A3B8', fontSize: '0.78rem', fontWeight: '700' }}>
            {m.active ? 'Acceder →' : 'Próximamente'}
          </span>
          {m.active && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={m.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: isHovered ? 'translateX(3px)' : 'none', transition: 'transform 0.18s' }}>
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
            </svg>
          )}
        </div>
      </div>
    </a>
  )
}

export default function GatePage() {
  const [user, setUser] = useState<{ email: string; role: string } | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (window.location.hash.includes('type=recovery')) {
        window.location.href = '/reset-password' + window.location.hash
        return
      }
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setUser({ email: user.email || '', role: profile?.role || 'empresa' })
    }
    load()
  }, [])

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doLogout(), INACTIVITY_MS)
  }, [])
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [resetTimer])

  const modules = [
    {
      id: 'pld', href: '/pld', active: true,
      icon: <IconShield size={16} color="#0F7BF4" strokeWidth={1.8} />,
      label: 'Sistema PLD',
      desc: 'Listas negras OFAC, SAT 69-B, ONU y UIF. Reportes CNBV.',
      tags: ['OFAC', 'SAT 69-B', 'UIF'],
      accent: cl.blue, accentLight: cl.blueLight,
    },
    {
      id: 'kyc', href: '/kyc', active: true,
      icon: <IconBuilding size={16} color="#059669" strokeWidth={1.8} />,
      label: 'KYC Empresas',
      desc: 'Score Ekatena, buró de crédito y validación documental.',
      tags: ['Ekatena', 'Buró', 'CNBV'],
      accent: '#059669', accentLight: '#ECFDF5',
    },
    {
      id: 'term-sheet', href: '/term-sheet', active: true,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      ),
      label: 'Term Sheets',
      desc: 'Propuestas de crédito con amortización y descarga en PDF.',
      tags: ['Bullet', 'Mensual', 'PDF'],
      accent: '#7C3AED', accentLight: '#F5F3FF',
    },
    {
      id: 'contratos', href: '/contratos', active: true,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0891B2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      ),
      label: 'Contratos',
      desc: 'Machotes de adhesión con wizard o envío directo al cliente.',
      tags: ['Wizard', 'Word', 'Email'],
      accent: '#0891B2', accentLight: '#ECFEFF',
    },
    {
      id: 'nda', href: '/nda', active: true,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      ),
      label: 'NDAs',
      desc: 'Convenios de Confidencialidad. Genera el Word y envía por email.',
      tags: ['Word', 'Email', 'Resend'],
      accent: '#0D9488', accentLight: '#F0FDFA',
    },
    {
      id: 'siti', href: '/siti', active: false,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9333EA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
        </svg>
      ),
      label: 'SITI AA',
      desc: 'Reportes SITI ante CNBV para Instituciones de Tecnología Financiera.',
      tags: ['CNBV', 'LRITF', 'CUITF'],
      accent: '#9333EA', accentLight: '#FAF5FF',
    },
    {
      id: 'condusef', href: '/condusef', active: true,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      ),
      label: 'CONDUSEF',
      desc: 'Reportes regulatorios RECA, UNES, reclamaciones y transparencia.',
      tags: ['RECA', 'UNES', 'SIPRES'],
      accent: '#EA580C', accentLight: '#FFF7ED',
    },
  ]

  const row1 = modules.slice(0, 4)
  const row2 = modules.slice(4)

  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: '#F1F5F9', fontFamily: cl.fontFamily, display: 'flex', flexDirection: 'column' }}>

      {/* Navbar */}
      <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '0 1.75rem', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '20px', width: 'auto' }} />
          <div style={{ width: '1px', height: '16px', background: cl.gray200 }} />
          <span style={{ color: cl.gray400, fontSize: '0.78rem', fontWeight: '500' }}>Compliance Hub</span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <a href="/faq" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: cl.gray500, fontSize: '0.75rem', fontWeight: '500', textDecoration: 'none', padding: '0.35rem 0.75rem', borderRadius: '7px', border: `1px solid ${cl.gray200}` }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            FAQ
          </a>
          <a href="/admin/usuarios" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: cl.gray500, fontSize: '0.75rem', fontWeight: '500', textDecoration: 'none', padding: '0.35rem 0.75rem', borderRadius: '7px', border: `1px solid ${cl.gray200}` }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Usuarios
          </a>
          <LogoutBtn />
        </div>
      </div>

      {/* Page header */}
      <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '0.85rem 1.75rem', flexShrink: 0 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3DFFA0' }} />
              <span style={{ color: '#059669', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.07em' }}>COMPLIANCE HUB</span>
            </div>
            <h1 style={{ color: cl.gray900, fontSize: '1.2rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
              Bienvenido{user?.email ? `, ${user.email.split('@')[0]}` : ''}
            </h1>
          </div>
          <p style={{ color: cl.gray400, fontSize: '0.75rem', margin: 0 }}>Selecciona el módulo que deseas operar</p>
        </div>
      </div>

      {/* Cards grid */}
      <div style={{ flex: 1, padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem' }}>
            {row1.map(m => <ModuleCard key={m.id} m={m} hovered={hovered} setHovered={setHovered} />)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem' }}>
            {row2.map(m => <ModuleCard key={m.id} m={m} hovered={hovered} setHovered={setHovered} />)}
            <div />
          </div>
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
    </div>
  )
}
