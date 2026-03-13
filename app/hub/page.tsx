'use client'
import { useState } from 'react'
import PldPanel from '@/components/PldPanel'
import OnboardingWizard from '@/components/OnboardingWizard'
import ReportesPanel from '@/components/ReportesPanel'

const sections = [
  {
    id: 'pld',
    label: 'Sistema PLD',
    sublabel: 'Prevención de Lavado de Dinero',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 14l3.5 3.5L19 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    status: 'active',
  },
  {
    id: 'onboarding',
    label: 'Onboarding Empresas',
    sublabel: 'KYC & Score Crediticio',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="6" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M4 11h20" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 16h4M9 19h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    status: 'active',
  },
  {
    id: 'reportes',
    label: 'Reportes Regulatorios',
    sublabel: 'CNBV · R01 · R10 · R27',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M7 4h10l7 7v13a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M17 4v7h7M10 16h8M10 20h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    status: 'construction',
  },
]

export default function HubPage() {
  const [active, setActive] = useState<string | null>(null)

  if (active === 'pld') return <PldPanel onBack={() => setActive(null)} />
  if (active === 'onboarding') return <OnboardingWizard onBack={() => setActive(null)} />
  if (active === 'reportes') return <ReportesPanel onBack={() => setActive(null)} />

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0C10',
      fontFamily: "'DM Mono', 'Fira Code', monospace",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '900px' }}>
        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#00FF88', boxShadow: '0 0 12px #00FF88',
              animation: 'pulse 2s infinite',
            }} />
            <span style={{ color: '#00FF88', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              Sistema activo
            </span>
          </div>
          <h1 style={{
            color: '#F0F0F0', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            fontWeight: '400', letterSpacing: '-0.02em', margin: 0,
          }}>
            crowdlink<span style={{ color: '#00FF88' }}>—</span>compliance
          </h1>
          <p style={{ color: '#4A5568', fontSize: '0.85rem', marginTop: '0.5rem', letterSpacing: '0.05em' }}>
            HUB REGULATORIO · INFRAESTRUCTURA PRIVADA
          </p>
        </div>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActive(section.id)}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '2rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget
                el.style.background = 'rgba(0,255,136,0.05)'
                el.style.borderColor = 'rgba(0,255,136,0.3)'
                el.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.background = 'rgba(255,255,255,0.03)'
                el.style.borderColor = 'rgba(255,255,255,0.08)'
                el.style.transform = 'translateY(0)'
              }}
            >
              {section.status === 'construction' && (
                <div style={{
                  position: 'absolute', top: '1rem', right: '1rem',
                  background: 'rgba(255,170,0,0.15)', border: '1px solid rgba(255,170,0,0.3)',
                  borderRadius: '4px', padding: '2px 8px',
                  color: '#FFAA00', fontSize: '0.6rem', letterSpacing: '0.15em',
                }}>
                  EN CONSTRUCCIÓN
                </div>
              )}
              <div style={{ color: section.status === 'construction' ? '#4A5568' : '#00FF88', marginBottom: '1.25rem' }}>
                {section.icon}
              </div>
              <div style={{
                color: section.status === 'construction' ? '#4A5568' : '#F0F0F0',
                fontSize: '1.1rem', fontWeight: '500', marginBottom: '0.4rem',
              }}>
                {section.label}
              </div>
              <div style={{ color: '#4A5568', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                {section.sublabel}
              </div>
              {section.status === 'active' && (
                <div style={{
                  marginTop: '1.5rem', color: '#00FF88', fontSize: '0.75rem',
                  letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  ABRIR →
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '3rem', paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '1rem',
        }}>
          <span style={{ color: '#2D3748', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
            CROWDLINK COMPLIANCE v0.1.0
          </span>
          <span style={{ color: '#2D3748', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
            LFPDPPP · PLD · CNBV
          </span>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
