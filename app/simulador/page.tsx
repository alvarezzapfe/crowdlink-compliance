'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import SimuladorInversiones from '@/components/SimuladorInversiones'
import { IconArrowLeft, IconLock } from '@/components/Icons'

const B = {
  blue: '#1478FB',
  mint: '#28C89C',
  ink: '#0A1628',
  textSoft: '#5B6B7F',
  textMuted: '#8D99A8',
  bg: '#FFFFFF',
  bgOff: '#F6F9FC',
  border: '#E6EBF1',
  fontDisplay: "'DM Sans', -apple-system, sans-serif",
  fontBody: "'Inter', -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",
}

export default function SimuladorPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <div style={{ minHeight: '100vh', background: B.bgOff, fontFamily: B.fontBody, color: B.ink }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
        .nav-link{color:${B.textSoft};text-decoration:none;font-size:0.85rem;font-weight:500;padding:0.5rem 0.75rem;border-radius:8px;transition:all 0.15s}
        .nav-link:hover{color:${B.ink};background:${B.bgOff}}
        .nav-link:focus-visible{outline:2px solid ${B.blue};outline-offset:2px}
        .btn-primary{transition:all 0.15s;text-decoration:none}
        .btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(20,120,251,0.3)!important}
        .btn-primary:focus-visible{outline:2px solid ${B.blue};outline-offset:2px}
      `}</style>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: '64px', padding: '0 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${B.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="/" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.6rem' }}>
            <IconArrowLeft size={14} color={B.textSoft} strokeWidth={2} />
            Inicio
          </a>
          <div style={{ width: '1px', height: '20px', background: B.border }} />
          <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Image src="/crowdlink-logo.png" alt="Crowdlink" width={140} height={22} priority style={{ height: '22px', width: 'auto' }} />
          </a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <a href="/faq" className="nav-link">FAQ</a>
          <div style={{ width: '1px', height: '20px', background: B.border, margin: '0 0.5rem' }} />
          <a href="/login" className="btn-primary" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            background: B.blue, color: 'white',
            padding: '0.55rem 1.25rem', borderRadius: '10px',
            fontSize: '0.85rem', fontWeight: '600', fontFamily: B.fontBody,
          }}>
            <IconLock size={14} color="white" strokeWidth={2} />
            Entrar
          </a>
        </div>
      </nav>

      {/* Main content */}
      <main style={{
        padding: '3rem 2rem 4rem',
        animation: mounted ? 'fadeUp 0.4s ease forwards' : 'none',
        opacity: mounted ? 1 : 0,
      }}>
        <SimuladorInversiones />
      </main>

      {/* Trust bar */}
      <div style={{ borderTop: `1px solid ${B.border}`, background: B.bg }}>
        <div style={{
          maxWidth: '960px', margin: '0 auto', padding: '0.75rem 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '1.5rem', flexWrap: 'wrap',
        }}>
          {['CASFIM 0065022', 'CNBV', 'LRITF', 'IFC dual debt + equity'].map((cred, i) => (
            <span key={i} style={{
              fontFamily: B.fontMono, fontSize: '0.68rem', fontWeight: '600',
              color: B.textMuted, letterSpacing: '0.04em',
            }}>
              {cred}{i < 3 ? <span style={{ marginLeft: '1.5rem', color: B.border }}>|</span> : ''}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        maxWidth: '960px', margin: '0 auto', padding: '1.5rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Image src="/crowdlink-logo.png" alt="Crowdlink" width={100} height={16} style={{ height: '16px', width: 'auto', opacity: 0.35 }} />
          <span style={{ color: B.textMuted, fontSize: '0.72rem' }}>
            PorCuanto, S.A. de C.V. &middot; IFC
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <a href="/" style={{ color: B.textMuted, fontSize: '0.72rem', textDecoration: 'none' }}>Inicio</a>
          <a href="/faq" style={{ color: B.textMuted, fontSize: '0.72rem', textDecoration: 'none' }}>FAQ</a>
          <a href="https://crowdlink.mx" target="_blank" rel="noreferrer" style={{ color: B.textMuted, fontSize: '0.72rem', textDecoration: 'none' }}>
            crowdlink.mx &#8599;
          </a>
        </div>
      </footer>
    </div>
  )
}
