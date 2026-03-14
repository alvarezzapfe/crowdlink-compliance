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
      // Handle password reset redirect from Supabase
      if (window.location.hash.includes('type=recovery')) {
        window.location.href = '/reset-password' + window.location.hash
        return
      }
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return // sin sesión — mostrar gate igual, sin redirigir
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setUser({ email: user.email || '', role: profile?.role || 'empresa' })
    }
    load()
  }, [])

  const modules = [
    {
      id: 'pld', href: '/pld',
      icon: <IconShield size={24} color="#0F7BF4" strokeWidth={1.8} />,
      label: 'Sistema PLD',
      desc: 'Prevención de Lavado de Dinero. Consulta listas negras OFAC, SAT 69-B, ONU y UIF. Reportes CNBV.',
      tags: ['OFAC', 'SAT 69-B', 'ONU', 'UIF'],
      accent: cl.blue, accentLight: cl.blueLight,
    },
    {
      id: 'kyc', href: '/kyc',
      icon: <IconBuilding size={24} color="#059669" strokeWidth={1.8} />,
      label: 'KYC Empresas',
      desc: 'Onboarding y verificación de empresas. Score Ekatena, buró de crédito y validación documental.',
      tags: ['Ekatena', 'Buró', 'CNBV', 'LFPDPPP'],
      accent: '#059669', accentLight: '#ECFDF5',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: cl.gray50, fontFamily: cl.fontFamily }}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Logo bar - no logout button */}
        <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '0 2rem', height: '60px', display: 'flex', alignItems: 'center' }}>
          <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '22px', width: 'auto' }} />
          <div style={{ width: '1px', height: '18px', background: cl.gray200, margin: '0 1rem' }} />
          <span style={{ color: cl.gray400, fontSize: '0.82rem', fontWeight: '500' }}>Compliance Hub</span>
        </div>
        <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '2.5rem 2rem 2rem' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3DFFA0' }} />
              <span style={{ color: '#059669', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.06em' }}>COMPLIANCE HUB</span>
            </div>
            <h1 style={{ color: cl.gray900, fontSize: '1.75rem', fontWeight: '800', margin: '0 0 0.4rem', letterSpacing: '-0.02em' }}>Bienvenido</h1>
            <p style={{ color: cl.gray500, fontSize: '0.9rem', margin: 0 }}>Selecciona el módulo que deseas operar</p>
          </div>
        </div>

        <div style={{ flex: 1, padding: '2.5rem 2rem' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {modules.map(m => (
              <a key={m.id} href={m.href} style={{ textDecoration: 'none' }}
                onMouseEnter={() => setHovered(m.id)} onMouseLeave={() => setHovered(null)}>
                <div style={{
                  background: cl.white,
                  border: `1.5px solid ${hovered === m.id ? m.accent : cl.gray200}`,
                  borderRadius: '16px', padding: '2rem',
                  boxShadow: hovered === m.id ? `0 8px 24px rgba(0,0,0,0.09), 0 0 0 4px ${m.accentLight}` : '0 2px 8px rgba(0,0,0,0.05)',
                  transform: hovered === m.id ? 'translateY(-3px)' : 'none',
                  transition: 'all 0.2s ease', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: '1.25rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: m.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {m.icon}
                    </div>
                    <span style={{ background: m.accentLight, color: m.accent, fontSize: '0.68rem', fontWeight: '700', padding: '0.25rem 0.65rem', borderRadius: '9999px' }}>ACTIVO</span>
                  </div>
                  <div>
                    <h2 style={{ color: cl.gray900, fontSize: '1.1rem', fontWeight: '700', margin: '0 0 0.45rem' }}>{m.label}</h2>
                    <p style={{ color: cl.gray500, fontSize: '0.85rem', margin: 0, lineHeight: 1.65 }}>{m.desc}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {m.tags.map(t => (
                      <span key={t} style={{ background: cl.gray100, color: cl.gray500, fontSize: '0.7rem', fontWeight: '500', padding: '0.2rem 0.55rem', borderRadius: '6px', border: `1px solid ${cl.gray200}` }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: `1px solid ${cl.gray100}` }}>
                    <span style={{ color: m.accent, fontSize: '0.85rem', fontWeight: '700' }}>Acceder al módulo</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={m.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: hovered === m.id ? 'translateX(4px)' : 'none', transition: 'transform 0.2s' }}>
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
                    </svg>
                  </div>
                </div>
              </a>
            ))}
          </div>
          <p style={{ color: cl.gray300, fontSize: '0.75rem', textAlign: 'center', marginTop: '2.5rem' }}>
            PorCuanto S.A. de C.V. · IFC · CNBV · Art. 47 CUITF · LFPDPPP
          </p>
        </div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
    </div>
  )
}
