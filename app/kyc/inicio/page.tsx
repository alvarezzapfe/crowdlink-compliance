'use client'
import { useState } from 'react'
import { cl } from '@/lib/design'
import { IconShield, IconDoc, IconZap, IconBuilding, IconCreditCard, IconUser } from '@/components/Icons'

export default function KycInicioPage() {
  const [hovered, setHovered] = useState(false)

  const pasos = [
    { icon: <IconBuilding size={15} color="#0F7BF4" />, label: 'Datos de la empresa', desc: 'Razón social, RFC' },
    { icon: <IconUser size={15} color="#0F7BF4" />, label: 'Representante Legal', desc: 'Nombre y CURP' },
    { icon: <IconCreditCard size={15} color="#0F7BF4" />, label: 'Perfil Financiero', desc: 'Facturación, recursos' },
    { icon: <IconDoc size={15} color="#0F7BF4" />, label: 'Documentos', desc: 'Acta, identificaciones' },
    { icon: <IconZap size={15} color="#0F7BF4" />, label: 'Ekatena', desc: 'Score crediticio (opcional)' },
  ]

  return (
    <div style={{ height: '100vh', background: cl.gray50, fontFamily: cl.fontFamily, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Nav */}
      <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '0 2rem', height: '56px', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
        <a href="/kyc" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: cl.gray500, fontSize: '0.82rem', fontWeight: '500' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
          Regresar
        </a>
        <div style={{ width: '1px', height: '16px', background: cl.gray200 }} />
        <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '19px', width: 'auto' }} />
        <div style={{ width: '1px', height: '16px', background: cl.gray200 }} />
        <span style={{ color: cl.gray400, fontSize: '0.8rem', fontWeight: '500' }}>KYC Empresas</span>
      </div>

      {/* Content — todo en un solo view */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 2rem' }}>
        <div style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Hero compacto */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#EBF3FF', border: '1.5px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
              <IconShield size={22} color="#0F7BF4" strokeWidth={1.8} />
            </div>
            <h1 style={{ color: cl.gray900, fontSize: '1.45rem', fontWeight: '800', margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>Verificación KYC</h1>
            <p style={{ color: cl.gray500, fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>
              Para operar en Crowdlink verificamos tu empresa. Proceso de <strong style={{ color: cl.gray700 }}>~10 minutos</strong>.
            </p>
          </div>

          {/* Pasos en 2 columnas */}
          <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '14px', padding: '1rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ color: cl.gray400, fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>PASOS DEL PROCESO</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {pasos.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.6rem', background: cl.gray50, borderRadius: '8px', border: `1px solid ${cl.gray100}` }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#EBF3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {p.icon}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: cl.gray800, fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</div>
                    <div style={{ color: cl.gray400, fontSize: '0.68rem' }}>{p.desc}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', width: '18px', height: '18px', borderRadius: '50%', background: cl.gray100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: cl.gray400, fontSize: '0.6rem', fontWeight: '700' }}>{i + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Aviso LFPDPPP */}
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '0.7rem 0.9rem', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <IconShield size={14} color="#B45309" />
            <p style={{ color: '#92400E', fontSize: '0.75rem', margin: 0, lineHeight: 1.5 }}>
              Tu información está protegida bajo la <strong>LFPDPPP</strong> y solo se usará para verificación regulatoria CNBV.
            </p>
          </div>

          {/* CTA */}
          <a href="/kyc/wizard"
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', background: hovered ? '#0A6ACD' : '#0F7BF4', color: 'white', textDecoration: 'none', padding: '0.9rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '700', boxShadow: '0 4px 12px rgba(15,123,244,0.25)', transform: hovered ? 'translateY(-1px)' : 'none', transition: 'all 0.2s' }}>
            Iniciar verificación KYC
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
            </svg>
          </a>

          <p style={{ color: cl.gray300, fontSize: '0.68rem', textAlign: 'center', margin: 0 }}>
            PorCuanto S.A. de C.V. · IFC · CNBV · LFPDPPP
          </p>
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
    </div>
  )
}
