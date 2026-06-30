'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  IconShield, IconBuilding, IconDoc, IconCreditCard, IconGrid,
  IconFilter, IconBarChart, IconLock, IconChevronRight,
} from '@/components/Icons'

/* ─── Brand tokens ───────────────────────────────────────────── */

const B = {
  blue: '#1478FB',
  blueDark: '#1060D8',
  blueLight: '#EBF3FF',
  mint: '#28C89C',
  mintDark: '#1FA882',
  mintLight: '#EDFAF5',
  ink: '#0A1628',
  textSoft: '#5B6B7F',
  textMuted: '#8D99A8',
  bg: '#FFFFFF',
  bgOff: '#F6F9FC',
  border: '#E6EBF1',
  borderLight: '#F0F3F7',
  shadow: '0 1px 3px rgba(10,22,40,0.06), 0 1px 2px rgba(10,22,40,0.04)',
  shadowMd: '0 4px 12px rgba(10,22,40,0.07), 0 1px 3px rgba(10,22,40,0.04)',
  shadowLg: '0 12px 32px rgba(10,22,40,0.08), 0 4px 8px rgba(10,22,40,0.04)',
  fontDisplay: "'DM Sans', -apple-system, sans-serif",
  fontBody: "'Inter', -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",
}

const MODULOS = [
  { icon: IconShield,     label: 'Sistema PLD',   desc: 'Consultas OFAC, SAT 69-B, listas ONU y UIF en tiempo real', color: B.mint },
  { icon: IconBuilding,   label: 'KYC Empresas',  desc: 'Alta de empresas con validación Ekatena, Buró y CNBV',     color: B.blue },
  { icon: IconDoc,        label: 'Term Sheets',    desc: 'Genera hojas de términos bullet, mensual o trimestral',     color: '#7C3AED' },
  { icon: IconCreditCard, label: 'Contratos',      desc: 'Wizard de contratos de adhesión con firma y envío',         color: '#D97706' },
  { icon: IconGrid,       label: 'SITI AA',        desc: 'Reportes CNBV: LRITF, CUITF y anexos regulatorios',        color: '#059669' },
  { icon: IconFilter,     label: 'CONDUSEF',       desc: 'Registros RECA, UNES y SIPRES actualizados',               color: '#DC2626' },
]

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <div style={{ minHeight: '100vh', background: B.bg, fontFamily: B.fontBody, color: B.ink }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
        .nav-link{color:${B.textSoft};text-decoration:none;font-size:0.88rem;font-weight:500;padding:0.5rem 0.75rem;border-radius:8px;transition:all 0.15s}
        .nav-link:hover{color:${B.ink};background:${B.bgOff}}
        .nav-link:focus-visible{outline:2px solid ${B.blue};outline-offset:2px}
        .btn-primary{transition:all 0.15s;text-decoration:none}
        .btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(20,120,251,0.3)!important}
        .btn-primary:focus-visible{outline:2px solid ${B.blue};outline-offset:2px}
        .btn-outline{transition:all 0.15s;text-decoration:none}
        .btn-outline:hover{border-color:${B.blue}!important;color:${B.blue}!important;background:${B.blueLight}!important}
        .btn-outline:focus-visible{outline:2px solid ${B.blue};outline-offset:2px}
        .mod-card{transition:all 0.2s}
        .mod-card:hover{transform:translateY(-3px);box-shadow:${B.shadowLg}!important}
        .mod-card:focus-visible{outline:2px solid ${B.blue};outline-offset:2px}
        .sim-cta{transition:all 0.2s;text-decoration:none}
        .sim-cta:hover{box-shadow:${B.shadowLg}!important;border-color:${B.mint}!important}
        .sim-cta:focus-visible{outline:2px solid ${B.mint};outline-offset:2px}
      `}</style>

      {/* ── Nav ────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: '64px', padding: '0 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${B.border}`,
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <Image src="/crowdlink-logo.png" alt="Crowdlink" width={160} height={26} priority style={{ height: '26px', width: 'auto' }} />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <a href="#plataforma" className="nav-link">Plataforma</a>
          <a href="/simulador" className="nav-link">Simulador</a>
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

      {/* ── Hero ───────────────────────────────────────────── */}
      <section style={{
        maxWidth: '1000px', margin: '0 auto',
        padding: '5rem 2rem 3rem', textAlign: 'center',
        animation: mounted ? 'fadeUp 0.5s ease forwards' : 'none',
      }}>
        {/* Eyebrow */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
          background: B.bgOff, border: `1px solid ${B.border}`,
          borderRadius: '20px', padding: '0.4rem 1rem', marginBottom: '1.75rem',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: B.mint, animation: 'pulse 2.5s infinite' }} />
          <span style={{ color: B.textSoft, fontSize: '0.75rem', fontWeight: '600', fontFamily: B.fontBody }}>
            Plataforma interna &middot; IFC regulada por CNBV
          </span>
        </div>

        <h1 style={{
          fontFamily: B.fontDisplay, fontWeight: '900',
          fontSize: 'clamp(2.4rem, 5.5vw, 4rem)',
          lineHeight: 1.08, letterSpacing: '-0.04em',
          marginBottom: '1.25rem', color: B.ink,
        }}>
          La infraestructura de<br />
          <span style={{ color: B.blue }}>financiamiento colectivo</span><br />
          de M&eacute;xico
        </h1>

        <p style={{
          color: B.textSoft, fontFamily: B.fontBody,
          fontSize: 'clamp(1rem, 2vw, 1.15rem)',
          lineHeight: 1.7, maxWidth: '580px', margin: '0 auto 2.5rem',
        }}>
          Hub de cumplimiento regulatorio, KYC, contratos y reportes
          de PorCuanto, S.A. de C.V.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/login" className="btn-primary" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: B.blue, color: 'white',
            padding: '0.85rem 2rem', borderRadius: '12px',
            fontSize: '0.95rem', fontWeight: '700', fontFamily: B.fontDisplay,
            boxShadow: '0 4px 16px rgba(20,120,251,0.2)',
          }}>
            Entrar a la plataforma
          </a>
          <a href="/simulador" className="btn-outline" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'transparent', color: B.textSoft,
            padding: '0.85rem 2rem', borderRadius: '12px',
            fontSize: '0.95rem', fontWeight: '600', fontFamily: B.fontDisplay,
            border: `1.5px solid ${B.border}`,
          }}>
            <IconBarChart size={16} color={B.mint} strokeWidth={2} />
            Abrir simulador
          </a>
        </div>
      </section>

      {/* ── Trust bar ──────────────────────────────────────── */}
      <div style={{
        borderTop: `1px solid ${B.border}`, borderBottom: `1px solid ${B.border}`,
        background: B.bgOff,
      }}>
        <div style={{
          maxWidth: '1000px', margin: '0 auto',
          padding: '1rem 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '2rem', flexWrap: 'wrap',
        }}>
          {[
            'CASFIM 0065022',
            'CNBV',
            'LRITF',
            'IFC dual debt + equity',
          ].map((cred, i) => (
            <span key={i} style={{
              fontFamily: B.fontMono, fontSize: '0.72rem', fontWeight: '600',
              color: B.textMuted, letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              {cred}
              {i < 3 && <span style={{ color: B.border }}>|</span>}
            </span>
          ))}
        </div>
      </div>

      {/* ── La plataforma ──────────────────────────────────── */}
      <section id="plataforma" style={{
        maxWidth: '1000px', margin: '0 auto',
        padding: '4rem 2rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{
            fontFamily: B.fontMono, fontSize: '0.7rem', fontWeight: '600',
            color: B.blue, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
          }}>
            Uso interno del equipo
          </span>
          <h2 style={{
            fontFamily: B.fontDisplay, fontWeight: '800',
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            letterSpacing: '-0.03em', marginTop: '0.5rem', color: B.ink,
          }}>
            La plataforma
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {MODULOS.map((m, i) => {
            const Icono = m.icon
            return (
              <div key={i} className="mod-card" tabIndex={0} style={{
                background: B.bg, border: `1px solid ${B.border}`,
                borderRadius: '14px', padding: '1.5rem',
                boxShadow: B.shadow, cursor: 'default',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: `${m.color}10`, border: `1px solid ${m.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icono size={18} color={m.color} strokeWidth={1.8} />
                  </div>
                  <span style={{
                    fontFamily: B.fontDisplay, fontSize: '0.92rem',
                    fontWeight: '700', color: B.ink,
                  }}>
                    {m.label}
                  </span>
                </div>
                <p style={{
                  color: B.textSoft, fontSize: '0.82rem',
                  lineHeight: 1.6, margin: 0, fontFamily: B.fontBody,
                }}>
                  {m.desc}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Simulador CTA ──────────────────────────────────── */}
      <section style={{ background: B.bgOff, borderTop: `1px solid ${B.border}`, borderBottom: `1px solid ${B.border}` }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem 2rem' }}>
          <a href="/simulador" className="sim-cta" style={{
            display: 'block', background: B.bg, border: `1px solid ${B.border}`,
            borderRadius: '16px', padding: '2rem 2.5rem',
            boxShadow: B.shadow,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div style={{ flex: '1 1 360px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <IconBarChart size={16} color={B.mint} strokeWidth={2} />
                  <span style={{
                    fontFamily: B.fontMono, fontSize: '0.68rem', fontWeight: '700',
                    color: B.mint, letterSpacing: '0.08em',
                  }}>
                    SIMULADOR DE INVERSIONES &middot; P&Uacute;BLICO
                  </span>
                </div>
                <h3 style={{
                  fontFamily: B.fontDisplay, fontWeight: '800',
                  fontSize: '1.3rem', letterSpacing: '-0.02em',
                  color: B.ink, margin: '0 0 0.5rem',
                }}>
                  Compara Crowdlink vs CETES, S&amp;P 500 y pagar&eacute;s
                </h3>
                <p style={{ color: B.textSoft, fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
                  Proyecta rendimientos a tu plazo con tasas reales de Banxico,
                  c&aacute;lculo de ISR y ajuste por tipo de cambio.
                </p>
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: B.mint, color: 'white',
                padding: '0.75rem 1.5rem', borderRadius: '12px',
                fontSize: '0.88rem', fontWeight: '700', fontFamily: B.fontDisplay,
                whiteSpace: 'nowrap' as const,
                boxShadow: '0 4px 12px rgba(40,200,156,0.2)',
              }}>
                Abrir simulador
                <IconChevronRight size={16} color="white" strokeWidth={2.5} />
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer style={{
        maxWidth: '1000px', margin: '0 auto',
        padding: '2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Image src="/crowdlink-logo.png" alt="Crowdlink" width={110} height={18} style={{ height: '18px', width: 'auto', opacity: 0.4 }} />
          <span style={{ color: B.textMuted, fontSize: '0.72rem' }}>
            PorCuanto, S.A. de C.V. &middot; Instituci&oacute;n de Financiamiento Colectivo
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {[
            { label: 'Simulador', href: '/simulador' },
            { label: 'FAQ', href: '/faq' },
            { label: 'crowdlink.mx', href: 'https://crowdlink.mx', ext: true },
          ].map((l, i) => (
            <a key={i} href={l.href} {...(l.ext ? { target: '_blank', rel: 'noreferrer' } : {})}
              style={{ color: B.textMuted, fontSize: '0.75rem', textDecoration: 'none' }}>
              {l.label}{l.ext ? ' \u2197' : ''}
            </a>
          ))}
        </div>
      </footer>
    </div>
  )
}
