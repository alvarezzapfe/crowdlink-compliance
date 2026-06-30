'use client'
import { useState, useEffect, useId } from 'react'
import Image from 'next/image'
import {
  IconLock, IconDoc, IconSearch, IconCreditCard, IconTrendingUp,
  IconUser, IconCheck, IconChevronRight, IconShield, IconBarChart,
  IconArrowLeft, IconClock, IconBuilding, IconInfo,
} from '@/components/Icons'

/* ─── Brand tokens (same as main + simulador) ────────────────── */

const B = {
  blue: '#1478FB',
  blueDark: '#1060D8',
  blueLight: '#EBF3FF',
  mint: '#28C89C',
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

/* ─── Steps data ─────────────────────────────────────────────── */

const PASOS = [
  {
    num: '01', Icon: IconLock, color: B.blue,
    titulo: 'Registro y KYC', tiempo: '~15 min',
    desc: 'Crea tu cuenta en crowdlink.mx, completa tu perfil y verifica tu identidad. Subimos tu informacion al buro de credito y validamos tus documentos.',
    detalle: [
      'Crea tu cuenta con email y contrasena',
      'Sube tu INE o pasaporte vigente',
      'Comprobante de domicilio reciente',
      'CURP y RFC',
      'Verificacion automatica con Ekatena',
    ],
  },
  {
    num: '02', Icon: IconDoc, color: '#7C3AED',
    titulo: 'Firma de contrato', tiempo: '~5 min',
    desc: 'Recibes tu Contrato de Comision Mercantil por email. Lo llenas en 5 minutos con tus datos fiscales y bancarios a traves de nuestro wizard.',
    detalle: [
      'Recibes link por email de Crowdlink',
      'Seleccionas si eres PF o PM',
      'Ingresas datos fiscales y bancarios',
      'Se genera el Word automaticamente',
      'Descargas y firmas el contrato',
    ],
  },
  {
    num: '03', Icon: IconSearch, color: '#059669',
    titulo: 'Explorar proyectos', tiempo: 'A tu ritmo',
    desc: 'Accede al marketplace de Crowdlink. Cada proyecto muestra tasa, plazo, garantias, score del solicitante y documentacion completa.',
    detalle: [
      'Tasas de rendimiento variables por proyecto',
      'Plazos de 6 a 36 meses',
      'Score de riesgo A, B, C, D',
      'Proyectos con y sin garantia hipotecaria',
      'Documentacion financiera del solicitante',
    ],
  },
  {
    num: '04', Icon: IconCreditCard, color: '#D97706',
    titulo: 'Inversion', tiempo: '~10 min',
    desc: 'Selecciona el proyecto y el monto que deseas invertir. El minimo es $5,000 MXN. Transfieres via SPEI a la cuenta CLABE de Crowdlink.',
    detalle: [
      'Monto minimo: $5,000 MXN',
      'Transferencia SPEI a CLABE Crowdlink',
      'Confirmacion en tiempo real',
      'Recibo de aportacion digital',
      'Inicio inmediato del conteo de intereses',
    ],
  },
  {
    num: '05', Icon: IconTrendingUp, color: B.mint,
    titulo: 'Rendimientos', tiempo: 'Mensual',
    desc: 'Recibes pagos mensuales de capital e intereses directamente en tu cuenta bancaria registrada. Puedes reinvertir o retirar.',
    detalle: [
      'Pagos el dia pactado cada mes',
      'Directo a tu cuenta bancaria',
      'Estado de cuenta en la plataforma',
      'Constancias fiscales anuales (ISR)',
      'Opcion de reinversion automatica',
    ],
  },
]

/* ─── FAQ data ───────────────────────────────────────────────── */

const PREGUNTAS = [
  {
    q: 'Que es Crowdlink y como esta regulado?',
    a: 'Crowdlink es la marca comercial de PorCuanto, S.A. de C.V., una Institucion de Financiamiento Colectivo (IFC) autorizada por la CNBV con numero CASFIM 0065022. Operamos bajo la Ley para Regular las Instituciones de Tecnologia Financiera (LRITF) y estamos sujetos a supervision continua de CNBV y CONDUSEF. Como IFC de deuda y capital, conectamos inversionistas con solicitantes de credito verificados.',
  },
  {
    q: 'Quien puede invertir en Crowdlink?',
    a: 'Cualquier persona fisica o moral residente en Mexico con RFC, cuenta bancaria a su nombre y que complete el proceso de KYC (verificacion de identidad). Para personas morales se requieren ademas escrituras constitutivas y poderes del representante legal. No hay requisito de ingreso minimo.',
  },
  {
    q: 'Cual es el monto minimo de inversion?',
    a: 'El monto minimo es de $5,000 MXN por proyecto. No hay limite maximo, aunque para montos mayores a $50,000 MXN la CNBV requiere un proceso de validacion adicional. Puedes diversificar invirtiendo en multiples proyectos simultaneamente.',
  },
  {
    q: 'Que rendimientos puedo esperar y con que riesgo?',
    a: 'Los rendimientos varian segun el perfil de riesgo de cada proyecto. Como referencia, las tasas son superiores a CETES o pagares bancarios, pero tambien conllevan mayor riesgo. Cada proyecto muestra su tasa, plazo y score de riesgo (A, B, C, D) antes de invertir. Puedes comparar rendimientos en nuestro simulador.',
  },
  {
    q: 'Mi inversion esta garantizada o cubierta por el IPAB?',
    a: 'No. El crowdfunding de deuda NO esta cubierto por el IPAB ni por ningun fondo de garantia gubernamental. Existe riesgo real de perdida parcial o total del capital invertido si el acreditado no cumple con sus pagos. Crowdlink mitiga el riesgo con analisis crediticio, diversificacion y en algunos casos garantias hipotecarias, pero no lo elimina. Invierte solo lo que estarias dispuesto a perder.',
  },
  {
    q: 'Como funciona el proceso de KYC?',
    a: 'El KYC (Know Your Customer) es obligatorio por regulacion. Consiste en verificar tu identidad con INE o pasaporte, comprobante de domicilio, CURP y RFC. Usamos Ekatena para validacion automatica y consultamos buro de credito. El proceso toma aproximadamente 15 minutos y se completa en linea.',
  },
  {
    q: 'Que impuestos pago sobre mis rendimientos?',
    a: 'Los intereses generados estan sujetos a ISR. Para 2026, la tasa de retencion provisional es de 0.90% anual sobre el capital invertido (art. 21 LIF). Crowdlink realiza la retencion y te entrega constancia fiscal anual antes del 15 de febrero. Consulta a tu contador para determinar tu carga fiscal total.',
  },
  {
    q: 'Que pasa si el acreditado no paga?',
    a: 'Crowdlink activa un proceso de cobranza extrajudicial inmediato. Si persiste el incumplimiento, se procede por via judicial. En creditos con garantia hipotecaria existe un mecanismo de recuperacion sobre el bien. Sin embargo, la recuperacion no esta garantizada y puede tomar meses. El riesgo de impago es inherente al crowdfunding de deuda.',
  },
  {
    q: 'Como retiro mi dinero?',
    a: 'Los pagos mensuales de capital e intereses se depositan automaticamente en la cuenta bancaria que registraste durante el KYC. No necesitas solicitar retiro: los pagos llegan el dia pactado. Al final del plazo, recibes tu ultimo pago de capital e intereses.',
  },
  {
    q: 'Cual es la comision de Crowdlink?',
    a: 'Crowdlink cobra entre 2% y 4% anual sobre el saldo vigente, descontada directamente del rendimiento. La tasa que ves en la plataforma ya incluye esta comision: es la tasa neta que recibiras. No hay comisiones ocultas ni cargos adicionales por apertura o retiro.',
  },
]

/* ─── Accordion item component ───────────────────────────────── */

function AccordionItem({ pregunta, respuesta, open, onToggle, index }: {
  pregunta: string
  respuesta: string
  open: boolean
  onToggle: () => void
  index: number
}) {
  const headingId = `faq-heading-${index}`
  const panelId = `faq-panel-${index}`

  return (
    <div style={{
      background: B.bg,
      border: `1px solid ${open ? `${B.blue}30` : B.border}`,
      borderRadius: '14px',
      marginBottom: '0.75rem',
      boxShadow: open ? B.shadowMd : B.shadow,
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}>
      <button
        id={headingId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: B.fontBody,
          textAlign: 'left' as const,
        }}
      >
        <span style={{
          color: open ? B.ink : B.textSoft,
          fontSize: '0.95rem',
          fontWeight: open ? '600' : '500',
          lineHeight: 1.5,
          flex: 1,
        }}>
          {pregunta}
        </span>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          background: open ? B.blueLight : B.bgOff,
          border: `1px solid ${open ? `${B.blue}30` : B.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s',
        }}>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke={open ? B.blue : B.textMuted}
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}
            aria-hidden="true"
          >
            <polyline points="6,9 12,15 18,9" />
          </svg>
        </div>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        hidden={!open}
        style={{
          padding: open ? '0 1.5rem 1.5rem' : '0 1.5rem',
          maxHeight: open ? '500px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.25s ease, padding 0.2s ease',
        }}
      >
        {open && (
          <div style={{ borderTop: `1px solid ${B.borderLight}`, paddingTop: '1rem' }}>
            <p style={{
              color: B.textSoft,
              fontSize: '0.9rem',
              lineHeight: 1.8,
              margin: 0,
              fontFamily: B.fontBody,
            }}>
              {respuesta}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function FAQPage() {
  const [pasoActivo, setPasoActivo] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [faqAbierta, setFaqAbierta] = useState(0)

  useEffect(() => { setMounted(true) }, [])

  const paso = PASOS[pasoActivo]
  const PasoIcon = paso.Icon

  return (
    <div style={{ minHeight: '100vh', background: B.bgOff, fontFamily: B.fontBody, color: B.ink }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @media(prefers-reduced-motion:reduce){
          *{animation:none!important;transition:none!important}
          .faq-panel{max-height:none!important}
        }
        .nav-link{color:${B.textSoft};text-decoration:none;font-size:0.85rem;font-weight:500;padding:0.5rem 0.75rem;border-radius:8px;transition:all 0.15s}
        .nav-link:hover{color:${B.ink};background:${B.bg}}
        .nav-link:focus-visible{outline:2px solid ${B.blue};outline-offset:2px}
        .btn-primary{transition:all 0.15s;text-decoration:none}
        .btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(20,120,251,0.3)!important}
        .btn-primary:focus-visible{outline:2px solid ${B.blue};outline-offset:2px}
        .btn-outline{transition:all 0.15s;text-decoration:none}
        .btn-outline:hover{border-color:${B.blue}!important;color:${B.blue}!important;background:${B.blueLight}!important}
        .btn-outline:focus-visible{outline:2px solid ${B.blue};outline-offset:2px}
        .step-btn{transition:all 0.15s;cursor:pointer}
        .step-btn:hover{transform:translateY(-2px);box-shadow:${B.shadowMd}}
        .step-btn:focus-visible{outline:2px solid ${B.blue};outline-offset:2px}
        .nav-btn{transition:all 0.15s}
        .nav-btn:hover:not(:disabled){border-color:${B.blue}!important;color:${B.blue}!important}
        .nav-btn:focus-visible{outline:2px solid ${B.blue};outline-offset:2px}
        .sim-cta-link{transition:all 0.2s;text-decoration:none}
        .sim-cta-link:hover{box-shadow:${B.shadowLg}!important;border-color:${B.mint}!important}
        .sim-cta-link:focus-visible{outline:2px solid ${B.mint};outline-offset:2px}
      `}</style>

      {/* ── Nav ────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: '64px', padding: '0 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(246,249,252,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
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
          <a href="/simulador" className="nav-link">Simulador</a>
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

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem 2rem 4rem' }}>

        {/* ── Hero ───────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: B.bg, border: `1px solid ${B.border}`,
            borderRadius: '20px', padding: '0.4rem 1rem', marginBottom: '1.5rem',
            boxShadow: B.shadow,
          }}>
            <IconInfo size={13} color={B.blue} strokeWidth={2} />
            <span style={{
              fontFamily: B.fontBody, fontSize: '0.78rem', fontWeight: '600', color: B.textSoft,
            }}>
              Guia de inversion
            </span>
          </div>
          <h1 style={{
            fontFamily: B.fontDisplay, fontWeight: '900',
            fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            lineHeight: 1.1, letterSpacing: '-0.04em',
            marginBottom: '1rem', color: B.ink,
          }}>
            Todo lo que necesitas<br />
            <span style={{ color: B.blue }}>saber para invertir</span>
          </h1>
          <p style={{
            color: B.textSoft, fontSize: '1rem', fontFamily: B.fontBody,
            maxWidth: '500px', margin: '0 auto', lineHeight: 1.7,
          }}>
            Regulada por CNBV &middot; CASFIM 0065022 &middot; IFC de deuda y capital
          </p>
        </div>

        {/* ── Trust bar ────────────────────────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap',
          marginBottom: '3.5rem', padding: '1rem 0',
          borderTop: `1px solid ${B.border}`, borderBottom: `1px solid ${B.border}`,
        }}>
          {[
            { val: '$5,000', label: 'Minimo de inversion' },
            { val: 'CNBV', label: 'CASFIM 0065022' },
            { val: '100%', label: 'Digital, sin papel' },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center', minWidth: '120px' }}>
              <p style={{
                fontFamily: B.fontMono, fontSize: '1.1rem', fontWeight: '700',
                color: B.ink, margin: '0 0 0.2rem', letterSpacing: '-0.02em',
              }}>
                {stat.val}
              </p>
              <p style={{
                fontFamily: B.fontBody, fontSize: '0.72rem',
                color: B.textMuted, margin: 0,
              }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Steps tutorial ───────────────────────────────── */}
        <section style={{ marginBottom: '4rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{
              fontFamily: B.fontMono, fontSize: '0.7rem', fontWeight: '600',
              color: B.blue, letterSpacing: '0.1em',
            }}>
              COMO INVERTIR EN CROWDLINK
            </span>
          </div>

          {/* Step tabs */}
          <div style={{
            display: 'flex', gap: '0.5rem', marginBottom: '2rem',
            overflowX: 'auto', paddingBottom: '0.5rem',
          }}>
            {PASOS.map((p, i) => {
              const StepIcon = p.Icon
              const active = pasoActivo === i
              return (
                <button
                  key={i}
                  className="step-btn"
                  onClick={() => setPasoActivo(i)}
                  aria-pressed={active}
                  style={{
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.7rem 1.1rem', borderRadius: '12px',
                    border: `1.5px solid ${active ? p.color : B.border}`,
                    background: active ? `${p.color}08` : B.bg,
                    fontFamily: B.fontBody, fontSize: '0.85rem',
                    fontWeight: '600',
                    color: active ? B.ink : B.textMuted,
                    boxShadow: active ? B.shadowMd : B.shadow,
                  }}
                >
                  <span style={{
                    fontFamily: B.fontMono, fontSize: '0.72rem', fontWeight: '700',
                    color: active ? p.color : B.textMuted,
                  }}>
                    {p.num}
                  </span>
                  <StepIcon size={16} color={active ? p.color : B.textMuted} strokeWidth={1.8} />
                  <span style={{ whiteSpace: 'nowrap' as const }}>{p.titulo}</span>
                </button>
              )
            })}
          </div>

          {/* Step content */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
          }}>
            {/* Left: step info */}
            <div style={{
              background: B.bg,
              border: `1px solid ${B.border}`,
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: B.shadow,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '14px',
                  background: `${paso.color}10`, border: `1px solid ${paso.color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <PasoIcon size={24} color={paso.color} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontFamily: B.fontMono, fontSize: '0.68rem', fontWeight: '700',
                    color: paso.color, letterSpacing: '0.08em', margin: '0 0 0.2rem',
                  }}>
                    PASO {paso.num}
                  </p>
                  <h3 style={{
                    fontFamily: B.fontDisplay, fontSize: '1.25rem',
                    fontWeight: '800', color: B.ink, margin: 0, letterSpacing: '-0.02em',
                  }}>
                    {paso.titulo}
                  </h3>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  background: B.bgOff, border: `1px solid ${B.border}`,
                  borderRadius: '8px', padding: '0.3rem 0.75rem',
                }}>
                  <IconClock size={13} color={B.textMuted} strokeWidth={2} />
                  <span style={{
                    fontFamily: B.fontMono, fontSize: '0.72rem', fontWeight: '600',
                    color: B.textSoft,
                  }}>
                    {paso.tiempo}
                  </span>
                </div>
              </div>
              <p style={{
                color: B.textSoft, fontSize: '0.95rem', lineHeight: 1.8, margin: 0,
                fontFamily: B.fontBody,
              }}>
                {paso.desc}
              </p>
            </div>

            {/* Right: checklist */}
            <div style={{
              background: B.bg,
              border: `1px solid ${B.border}`,
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: B.shadow,
            }}>
              <p style={{
                fontFamily: B.fontMono, fontSize: '0.68rem', fontWeight: '700',
                color: B.textMuted, letterSpacing: '0.08em', margin: '0 0 1.5rem',
              }}>
                EN ESTE PASO
              </p>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.85rem' }}>
                {paso.detalle.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '7px',
                      background: B.mintLight, border: `1px solid ${B.mint}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: '0.05rem',
                    }}>
                      <IconCheck size={12} color={B.mint} strokeWidth={2.5} />
                    </div>
                    <span style={{
                      color: B.textSoft, fontSize: '0.9rem', lineHeight: 1.6,
                      fontFamily: B.fontBody,
                    }}>
                      {d}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step dots + nav */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: '1.5rem', gap: '1rem',
          }}>
            <button
              className="nav-btn"
              onClick={() => setPasoActivo(Math.max(0, pasoActivo - 1))}
              disabled={pasoActivo === 0}
              style={{
                background: B.bg, border: `1px solid ${B.border}`,
                color: B.textSoft, padding: '0.6rem 1.25rem', borderRadius: '10px',
                cursor: pasoActivo === 0 ? 'default' : 'pointer',
                opacity: pasoActivo === 0 ? 0.4 : 1,
                fontFamily: B.fontBody, fontSize: '0.85rem', fontWeight: '500',
                boxShadow: B.shadow,
              }}
            >
              Anterior
            </button>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {PASOS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPasoActivo(i)}
                  aria-label={`Paso ${p.num}`}
                  style={{
                    width: pasoActivo === i ? '28px' : '8px',
                    height: '8px', borderRadius: '4px',
                    background: pasoActivo === i ? p.color : B.border,
                    border: 'none', cursor: 'pointer', padding: 0,
                    transition: 'all 0.2s',
                  }}
                />
              ))}
            </div>

            <button
              className="nav-btn"
              onClick={() => setPasoActivo(Math.min(PASOS.length - 1, pasoActivo + 1))}
              disabled={pasoActivo === PASOS.length - 1}
              style={{
                background: B.bg, border: `1px solid ${B.border}`,
                color: B.textSoft, padding: '0.6rem 1.25rem', borderRadius: '10px',
                cursor: pasoActivo === PASOS.length - 1 ? 'default' : 'pointer',
                opacity: pasoActivo === PASOS.length - 1 ? 0.4 : 1,
                fontFamily: B.fontBody, fontSize: '0.85rem', fontWeight: '500',
                boxShadow: B.shadow,
              }}
            >
              Siguiente
            </button>
          </div>
        </section>

        {/* ── FAQ accordion ────────────────────────────────── */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{
              fontFamily: B.fontMono, fontSize: '0.7rem', fontWeight: '600',
              color: B.blue, letterSpacing: '0.1em',
            }}>
              PREGUNTAS FRECUENTES
            </span>
            <h2 style={{
              fontFamily: B.fontDisplay, fontWeight: '800',
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              letterSpacing: '-0.03em', marginTop: '0.5rem', color: B.ink,
            }}>
              Resuelve tus dudas
            </h2>
          </div>

          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            {PREGUNTAS.map((faq, i) => (
              <AccordionItem
                key={i}
                index={i}
                pregunta={faq.q}
                respuesta={faq.a}
                open={faqAbierta === i}
                onToggle={() => setFaqAbierta(faqAbierta === i ? -1 : i)}
              />
            ))}
          </div>
        </section>

        {/* ── Simulator CTA ────────────────────────────────── */}
        <section style={{ marginBottom: '3rem' }}>
          <a href="/simulador" className="sim-cta-link" style={{
            display: 'block', background: B.bg, border: `1px solid ${B.border}`,
            borderRadius: '16px', padding: '2rem 2.5rem',
            boxShadow: B.shadow,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div style={{ flex: '1 1 320px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <IconBarChart size={16} color={B.mint} strokeWidth={2} />
                  <span style={{
                    fontFamily: B.fontMono, fontSize: '0.68rem', fontWeight: '700',
                    color: B.mint, letterSpacing: '0.08em',
                  }}>
                    SIMULADOR DE INVERSIONES
                  </span>
                </div>
                <h3 style={{
                  fontFamily: B.fontDisplay, fontWeight: '800',
                  fontSize: '1.2rem', letterSpacing: '-0.02em',
                  color: B.ink, margin: '0 0 0.5rem',
                }}>
                  Compara rendimientos en el simulador
                </h3>
                <p style={{ color: B.textSoft, fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
                  Proyecta Crowdlink vs CETES, S&amp;P 500 y pagares con tasas reales de Banxico y calculo de ISR.
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
        </section>

        {/* ── Bottom CTA ───────────────────────────────────── */}
        <section style={{
          textAlign: 'center',
          background: B.bg, border: `1px solid ${B.border}`,
          borderRadius: '20px', padding: '3rem 2rem',
          boxShadow: B.shadow, marginBottom: '2rem',
        }}>
          <span style={{
            fontFamily: B.fontMono, fontSize: '0.7rem', fontWeight: '700',
            color: B.blue, letterSpacing: '0.1em',
          }}>
            LISTO PARA INVERTIR?
          </span>
          <h2 style={{
            fontFamily: B.fontDisplay, fontWeight: '800',
            fontSize: '1.6rem', letterSpacing: '-0.02em',
            color: B.ink, margin: '0.75rem 0 0.75rem',
          }}>
            Entra a la plataforma
          </h2>
          <p style={{ color: B.textSoft, fontSize: '0.9rem', margin: '0 0 2rem', fontFamily: B.fontBody }}>
            Regulada por CNBV &middot; Sin comisiones ocultas &middot; 100% digital
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/login" className="btn-primary" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: B.blue, color: 'white',
              padding: '0.85rem 2rem', borderRadius: '12px',
              fontSize: '0.95rem', fontWeight: '700', fontFamily: B.fontDisplay,
              boxShadow: '0 4px 16px rgba(20,120,251,0.2)',
            }}>
              <IconLock size={15} color="white" strokeWidth={2} />
              Entrar a la plataforma
            </a>
            <a href="/simulador" className="btn-outline" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'transparent', color: B.textSoft,
              padding: '0.85rem 2rem', borderRadius: '12px',
              fontSize: '0.95rem', fontWeight: '600', fontFamily: B.fontDisplay,
              border: `1.5px solid ${B.border}`,
            }}>
              <IconBarChart size={15} color={B.mint} strokeWidth={2} />
              Abrir simulador
            </a>
          </div>
        </section>
      </div>

      {/* ── Trust bar ──────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${B.border}`, background: B.bg }}>
        <div style={{
          maxWidth: '1000px', margin: '0 auto', padding: '0.75rem 2rem',
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

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer style={{
        maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Image src="/crowdlink-logo.png" alt="Crowdlink" width={100} height={16} style={{ height: '16px', width: 'auto', opacity: 0.35 }} />
          <span style={{ color: B.textMuted, fontSize: '0.72rem' }}>
            PorCuanto, S.A. de C.V. &middot; IFC &middot; La inversion en crowdfunding conlleva riesgo y no esta garantizada por el IPAB.
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <a href="/" style={{ color: B.textMuted, fontSize: '0.72rem', textDecoration: 'none' }}>Inicio</a>
          <a href="/simulador" style={{ color: B.textMuted, fontSize: '0.72rem', textDecoration: 'none' }}>Simulador</a>
          <a href="https://crowdlink.mx" target="_blank" rel="noreferrer" style={{ color: B.textMuted, fontSize: '0.72rem', textDecoration: 'none' }}>
            crowdlink.mx &#8599;
          </a>
        </div>
      </footer>
    </div>
  )
}
