'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { cl } from '@/lib/design'
import { IconShield, IconBuilding } from '@/components/Icons'

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

  const modules = [
    {
      id: 'pld', href: '/pld', active: true,
      icon: <IconShield size={18} color="#0F7BF4" strokeWidth={1.8} />,
      label: 'Sistema PLD',
      desc: 'Prevención de Lavado de Dinero. Consulta listas negras OFAC, SAT 69-B, ONU y UIF. Reportes CNBV.',
      tags: ['OFAC', 'SAT 69-B', 'ONU', 'UIF'],
      accent: cl.blue, accentLight: cl.blueLight,
    },
    {
      id: 'kyc', href: '/kyc', active: true,
      icon: <IconBuilding size={18} color="#059669" strokeWidth={1.8} />,
      label: 'KYC Empresas',
      desc: 'Onboarding y verificación de empresas. Score Ekatena, buró de crédito y validación documental.',
      tags: ['Ekatena', 'Buró', 'CNBV', 'LFPDPPP'],
      accent: '#059669', accentLight: '#ECFDF5',
    },
    {
      id: 'term-sheet', href: '/term-sheet', active: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      ),
      label: 'Term Sheets',
      desc: 'Genera propuestas de crédito con tabla de amortización, tasas, underwriting fee y descarga en PDF.',
      tags: ['Bullet', 'Mensual', 'Trimestral', 'PDF'],
      accent: '#7C3AED', accentLight: '#F5F3FF',
    },
    {
      id: 'contratos', href: '/contratos', active: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0891B2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      ),
      label: 'Contratos',
      desc: 'Personaliza contratos de adhesión. Carga tu machote Word, llénalo con wizard o envíaselo al cliente por email.',
      tags: ['Wizard', 'Word', 'Email', 'Token'],
      accent: '#0891B2', accentLight: '#ECFEFF',
    },
    {
      id: 'siti', href: '/siti', active: false,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9333EA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
        </svg>
      ),
      label: 'SITI AA',
      desc: 'Cumplimiento regulatorio ante la CNBV. Gestión y envío de reportes SITI para Instituciones de Tecnología Financiera.',
      tags: ['CNBV', 'LRITF', 'CUITF', 'Reportes'],
      accent: '#9333EA', accentLight: '#FAF5FF',
    },
    {
      id: 'condusef', href: '/condusef', active: false,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      ),
      label: 'Reportes CONDUSEF',
      desc: 'Genera y gestiona reportes regulatorios para CONDUSEF: RECA, UNES, reclamaciones y transparencia.',
      tags: ['RECA', 'UNES', 'REUNE', 'SIPRES'],
      accent: '#EA580C', accentLight: '#FFF7ED',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: cl.gray50, fontFamily: cl.fontFamily }}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '0 2rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '22px', width: 'auto' }} />
            <div style={{ width: '1px', height: '18px', background: cl.gray200, margin: '0 1rem' }} />
            <span style={{ color: cl.gray400, fontSize: '0.82rem', fontWeight: '500' }}>Compliance Hub</span>
          </div>
          <a href="/admin/usuarios" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748B', fontSize: '0.78rem', fontWeight: '500', textDecoration: 'none', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Usuarios
          </a>
        </div>
        <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '2.5rem 2rem 2rem' }}>
          <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3DFFA0' }} />
              <span style={{ color: '#059669', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.06em' }}>COMPLIANCE HUB</span>
            </div>
            <h1 style={{ color: cl.gray900, fontSize: '1.75rem', fontWeight: '800', margin: '0 0 0.4rem', letterSpacing: '-0.02em' }}>Bienvenido</h1>
            <p style={{ color: cl.gray500, fontSize: '0.9rem', margin: 0 }}>Selecciona el módulo que deseas operar</p>
          </div>
        </div>
        <div style={{ flex: 1, padding: '2rem' }}>
          <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem' }}>
            {modules.map(m => (
              <a key={m.id} href={m.active ? m.href : undefined}
                style={{ textDecoration: 'none', cursor: m.active ? 'pointer' : 'default', opacity: m.active ? 1 : 0.6 }}
                onMouseEnter={() => m.active && setHovered(m.id)}
                onMouseLeave={() => setHovered(null)}>
                <div style={{
                  background: cl.white,
                  border: `1.5px solid ${hovered === m.id ? m.accent : cl.gray200}`,
                  borderRadius: '12px', padding: '1.25rem',
                  boxShadow: hovered === m.id ? `0 8px 24px rgba(0,0,0,0.09), 0 0 0 4px ${m.accentLight}` : '0 2px 8px rgba(0,0,0,0.05)',
                  transform: hovered === m.id ? 'translateY(-3px)' : 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: m.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {m.icon}
                    </div>
                    <span style={{
                      background: m.active ? m.accentLight : cl.gray100,
                      color: m.active ? m.accent : cl.gray400,
                      fontSize: '0.6rem', fontWeight: '700', padding: '0.25rem 0.65rem', borderRadius: '9999px'
                    }}>
                      {m.active ? 'ACTIVO' : 'PRÓXIMO'}
                    </span>
                  </div>
                  <div>
                    <h2 style={{ color: cl.gray900, fontSize: '0.88rem', fontWeight: '700', margin: '0 0 0.3rem' }}>{m.label}</h2>
                    <p style={{ color: cl.gray500, fontSize: '0.75rem', margin: 0, lineHeight: 1.55 }}>{m.desc}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {m.tags.map(t => (
                      <span key={t} style={{ background: cl.gray100, color: cl.gray500, fontSize: '0.7rem', fontWeight: '500', padding: '0.2rem 0.55rem', borderRadius: '6px', border: `1px solid ${cl.gray200}` }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: `1px solid ${cl.gray100}`, marginTop: 'auto' }}>
                    <span style={{ color: m.active ? m.accent : cl.gray400, fontSize: '0.85rem', fontWeight: '700' }}>
                      {m.active ? 'Acceder →' : 'Próximamente'}
                    </span>
                    {m.active && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={m.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: hovered === m.id ? 'translateX(4px)' : 'none', transition: 'transform 0.2s' }}>
                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
                      </svg>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
    </div>
  )
}
