'use client'
import { useState } from 'react'
import { cl } from '@/lib/design'
import { IconUser, IconBuilding } from '@/components/Icons'

export default function KycGatePage() {
  const [hovered, setHovered] = useState<string | null>(null)

  const options = [
    {
      id: 'empresa', href: '/kyc/inicio',
      icon: <IconBuilding size={22} color="#059669" strokeWidth={1.8} />,
      label: 'KYC Empresas',
      sublabel: 'Solicitantes',
      desc: 'Completa el proceso de onboarding, información financiera, documentos y conexión Ekatena.',
      accent: '#059669', accentLight: '#ECFDF5',
    },
    {
      id: 'admin', href: '/login',
      icon: <IconUser size={22} color="#0F7BF4" strokeWidth={1.8} />,
      label: 'Panel Admin',
      sublabel: 'Solo administradores',
      desc: 'Revisión de expedientes KYC, generación de invitaciones, score crediticio y toma de decisiones.',
      accent: '#0F7BF4', accentLight: '#EBF3FF',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: cl.gray50, fontFamily: cl.fontFamily, display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '0 2rem', height: '60px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <a href="/gate" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: cl.gray500, fontSize: '0.82rem', fontWeight: '500' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
          Regresar
        </a>
        <div style={{ width: '1px', height: '18px', background: cl.gray200 }} />
        <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '20px', width: 'auto' }} />
        <div style={{ width: '1px', height: '18px', background: cl.gray200 }} />
        <span style={{ color: cl.gray500, fontSize: '0.82rem', fontWeight: '500' }}>KYC Empresas</span>
      </div>

      {/* Header */}
      <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '2.5rem 2rem 2rem' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0F7BF4' }} />
            <span style={{ color: '#0F7BF4', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.06em' }}>KYC EMPRESAS</span>
          </div>
          <h1 style={{ color: cl.gray900, fontSize: '1.75rem', fontWeight: '800', margin: '0 0 0.4rem', letterSpacing: '-0.02em' }}>¿Cómo quieres acceder?</h1>
          <p style={{ color: cl.gray500, fontSize: '0.9rem', margin: 0 }}>Elige tu tipo de acceso</p>
        </div>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, padding: '2.5rem 2rem' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {options.map(o => (
            <a key={o.id} href={o.href} style={{ textDecoration: 'none' }}
              onMouseEnter={() => setHovered(o.id)} onMouseLeave={() => setHovered(null)}>
              <div style={{
                background: cl.white,
                border: `1.5px solid ${hovered === o.id ? o.accent : cl.gray200}`,
                borderRadius: '16px', padding: '2rem',
                boxShadow: hovered === o.id ? `0 8px 24px rgba(0,0,0,0.09), 0 0 0 4px ${o.accentLight}` : '0 2px 8px rgba(0,0,0,0.05)',
                transform: hovered === o.id ? 'translateY(-3px)' : 'none',
                transition: 'all 0.2s ease', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: '1.25rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: o.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {o.icon}
                  </div>
                  <span style={{ background: o.accentLight, color: o.accent, fontSize: '0.68rem', fontWeight: '700', padding: '0.25rem 0.65rem', borderRadius: '9999px' }}>{o.sublabel}</span>
                </div>
                <div>
                  <h2 style={{ color: cl.gray900, fontSize: '1.1rem', fontWeight: '700', margin: '0 0 0.45rem' }}>{o.label}</h2>
                  <p style={{ color: cl.gray500, fontSize: '0.85rem', margin: 0, lineHeight: 1.65 }}>{o.desc}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: `1px solid ${cl.gray100}` }}>
                  <span style={{ color: o.accent, fontSize: '0.85rem', fontWeight: '700' }}>Acceder</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={o.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: hovered === o.id ? 'translateX(4px)' : 'none', transition: 'transform 0.2s' }}>
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
                  </svg>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
    </div>
  )
}
