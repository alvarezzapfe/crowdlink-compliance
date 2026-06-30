'use client'
import { useState, useEffect } from 'react'
import SimuladorInversiones from '@/components/SimuladorInversiones'

export default function SimuladorPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050A14',
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      color: 'white',
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .btn-primary{transition:all 0.2s}
        .btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(62,232,160,0.35)!important}
        .back-link{transition:all 0.2s;text-decoration:none}
        .back-link:hover{color:rgba(255,255,255,0.7)!important}
      `}</style>

      {/* Background effects — same as main page */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(62,232,160,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(8,145,178,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Nav */}
      <nav style={{
        position: 'relative',
        zIndex: 10,
        padding: '0 2rem',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="/" className="back-link" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
            Inicio
          </a>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#3EE8A0', fontWeight: '900', fontSize: '1.2rem', letterSpacing: '-0.03em' }}>crowd</span>
            <span style={{ color: 'white', fontWeight: '900', fontSize: '1.2rem', letterSpacing: '-0.03em' }}>link</span>
          </div>
        </div>
        <a href="/login" className="btn-primary" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'linear-gradient(135deg, #3EE8A0, #0891B2)',
          color: '#050A14',
          textDecoration: 'none',
          padding: '0.55rem 1.25rem',
          borderRadius: '9px',
          fontSize: '0.85rem',
          fontWeight: '700',
        }}>
          Iniciar sesión →
        </a>
      </nav>

      {/* Main content */}
      <main style={{
        position: 'relative',
        zIndex: 5,
        padding: '3rem 2rem 4rem',
        animation: mounted ? 'fadeUp 0.5s ease forwards' : 'none',
        opacity: mounted ? 1 : 0,
      }}>
        <SimuladorInversiones />
      </main>

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 5,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        maxWidth: '900px',
        margin: '0 auto',
        padding: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem' }}>
          PorCuanto, S.A. de C.V. · Institución de Financiamiento Colectivo
        </p>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <a href="/" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', textDecoration: 'none' }}>Inicio</a>
          <a href="/faq" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', textDecoration: 'none' }}>FAQ</a>
          <a href="https://crowdlink.mx" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', textDecoration: 'none' }}>crowdlink.mx ↗</a>
        </div>
      </footer>
    </div>
  )
}
