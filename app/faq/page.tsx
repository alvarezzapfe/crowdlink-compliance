'use client'
import { useState } from 'react'

const PASOS = [
  { num: '01', icon: '🔐', color: '#0891B2', titulo: 'Registro y KYC', desc: 'Crea tu cuenta en crowdlink.mx, completa tu perfil y verifica tu identidad. Subimos tu información al buró de crédito y validamos tus documentos.', tiempo: '~15 min', detalle: ['Crea tu cuenta con email y contraseña', 'Sube tu INE/pasaporte vigente', 'Comprobante de domicilio reciente', 'CURP y RFC', 'Verificación automática con Ekatena'] },
  { num: '02', icon: '📋', color: '#7C3AED', titulo: 'Firma de Contrato', desc: 'Recibes tu Contrato de Comisión Mercantil por email. Lo llenas en 5 minutos con tus datos fiscales y bancarios a través de nuestro wizard.', tiempo: '~5 min', detalle: ['Recibes link por email de Crowdlink', 'Seleccionas si eres PF o PM', 'Ingresas datos fiscales y bancarios', 'Se genera el Word automáticamente', 'Descargas y firmas el contrato'] },
  { num: '03', icon: '🔍', color: '#059669', titulo: 'Explorar Proyectos', desc: 'Accede al marketplace de Crowdlink. Cada proyecto muestra tasa, plazo, garantías, score del solicitante y documentación completa.', tiempo: 'A tu ritmo', detalle: ['Tasas desde 18% hasta 36% anual', 'Plazos de 6 a 36 meses', 'Score de riesgo A, B, C, D', 'Proyectos con y sin garantía hipotecaria', 'Documentación financiera del solicitante'] },
  { num: '04', icon: '💸', color: '#D97706', titulo: 'Inversión', desc: 'Selecciona el proyecto y el monto que deseas invertir. El mínimo es $5,000 MXN. Transfieres vía SPEI a la cuenta CLABE de Crowdlink.', tiempo: '~10 min', detalle: ['Monto mínimo: $5,000 MXN', 'Transferencia SPEI a CLABE Crowdlink', 'Confirmación en tiempo real', 'Recibo de aportación digital', 'Inicio inmediato del conteo de intereses'] },
  { num: '05', icon: '📈', color: '#DC2626', titulo: 'Rendimientos', desc: 'Recibes pagos mensuales de capital e intereses directamente en tu cuenta bancaria registrada. Puedes reinvertir o retirar.', tiempo: 'Mensual', detalle: ['Pagos el día pactado cada mes', 'Directo a tu cuenta bancaria', 'Estado de cuenta en la plataforma', 'Constancias fiscales anuales (ISR)', 'Opción de reinversión automática'] },
]

const FAQS = [
  { cat: 'Inversión', color: '#0891B2', preguntas: [
    { q: '¿Cuál es el monto mínimo para invertir?', a: 'El monto mínimo es de $5,000 MXN por proyecto. No hay límite máximo, aunque para montos mayores a $50,000 MXN aplicamos un proceso de validación adicional conforme a las disposiciones de la CNBV.' },
    { q: '¿Qué rendimientos puedo esperar?', a: 'Las tasas varían entre 18% y 36% anual dependiendo del perfil de riesgo del solicitante (A, B, C, D). Los proyectos de menor riesgo ofrecen tasas más conservadoras. La tasa exacta se muestra en cada proyecto antes de invertir.' },
    { q: '¿Cuándo empiezo a recibir pagos?', a: 'Los pagos comienzan el mes siguiente a la originación del crédito. Si tu inversión se confirma el día 15, tu primer pago llegará el día 15 del siguiente mes. Los pagos son directamente a la cuenta bancaria que registraste.' },
    { q: '¿Puedo cancelar mi inversión?', a: 'Una vez realizada la transferencia y confirmada la inversión, no es posible cancelarla. El capital y los intereses se devuelven en los plazos pactados. En caso de prepago del solicitante, recibirás tu capital anticipadamente.' },
  ]},
  { cat: 'Seguridad y Regulación', color: '#7C3AED', preguntas: [
    { q: '¿Crowdlink está regulado?', a: 'Sí. PorCuanto, S.A. de C.V. opera como Institución de Financiamiento Colectivo bajo la LRITF, autorizada por la CNBV con número CASFIM 0065022. Estamos sujetos a supervisión continua y reportes regulares a CNBV y CONDUSEF.' },
    { q: '¿Qué pasa si el solicitante no paga?', a: 'Contamos con proceso de cobranza activa extrajudicial y judicial. Para créditos con garantía hipotecaria existe mecanismo de recuperación sobre el bien. La inversión en crowdfunding implica riesgo de crédito y no está garantizada por el IPAB.' },
    { q: '¿Cómo se protege mi información?', a: 'Toda la información se almacena cifrada con estándares bancarios. Cumplimos con la LFPDPPP y las disposiciones de la CNBV en materia de seguridad. Nunca compartimos tu información sin tu consentimiento.' },
  ]},
  { cat: 'Contratos y Documentos', color: '#059669', preguntas: [
    { q: '¿Qué es el Contrato de Comisión Mercantil?', a: 'Es el contrato de adhesión que regula la relación entre tú como inversionista y Crowdlink como intermediario. Define los términos, comisiones, plazos y mecanismos de pago. Es el documento oficial exigido por la CNBV.' },
    { q: '¿Necesito notarizar el contrato?', a: 'No. El contrato de comisión mercantil no requiere notarización. La firma autógrafa en el Word generado es suficiente, junto con el registro electrónico en nuestra plataforma.' },
    { q: '¿Cómo obtengo mis constancias fiscales?', a: 'Cada año antes del 15 de febrero generamos y enviamos tu constancia de retenciones (ISR) al correo registrado. También puedes descargarla en cualquier momento desde tu panel en crowdlink.mx.' },
  ]},
  { cat: 'Operación', color: '#D97706', preguntas: [
    { q: '¿Cómo transfiero mi inversión?', a: 'Transferencia SPEI a la CLABE que te proporcionamos por proyecto. Es importante que el monto sea exacto y uses la referencia numérica asignada. Transferencias incorrectas se devuelven en 24-48 horas hábiles.' },
    { q: '¿Puedo invertir como empresa?', a: 'Sí, aceptamos personas morales. El proceso de KYC incluye escrituras, representante legal y poderes notariales. El contrato en ese caso es de Comisión Mercantil para Persona Moral.' },
    { q: '¿Cuál es la comisión de Crowdlink?', a: 'Crowdlink cobra 2% a 4% anual sobre el saldo vigente, descontada del rendimiento. La tasa que ves en la plataforma ya considera esta comisión — es la tasa neta que recibirás.' },
  ]},
]

export default function FAQPage() {
  const [pasoActivo, setPasoActivo] = useState(0)
  const [faqAbierta, setFaqAbierta] = useState<string | null>(null)
  const [catActiva, setCatActiva] = useState('Inversión')
  const paso = PASOS[pasoActivo]

  const hexToRgb = (hex: string) => {
    const map: Record<string, string> = { '#0891B2': '8,145,178', '#7C3AED': '124,58,237', '#059669': '5,150,105', '#D97706': '217,119,6', '#DC2626': '220,38,38' }
    return map[hex] || '8,145,178'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', fontFamily: "'DM Sans', -apple-system, sans-serif", color: 'white' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap'); *{box-sizing:border-box} ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#0A0F1E} ::-webkit-scrollbar-thumb{background:#1E293B;border-radius:2px} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} .animate-in{animation:fadeIn 0.3s ease forwards} .paso-btn{transition:all 0.2s} .paso-btn:hover{transform:translateY(-2px)} .faq-item{transition:all 0.2s} .faq-item:hover{border-color:rgba(255,255,255,0.15)!important}`}</style>

      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 2rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a href="/gate" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: '#3EE8A0', fontWeight: '800', fontSize: '1.1rem', letterSpacing: '-0.02em' }}>crowd</span>
            <span style={{ color: 'white', fontWeight: '800', fontSize: '1.1rem', letterSpacing: '-0.02em' }}>link</span>
          </a>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)' }} />
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>FAQ & Tutorial</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a href="/gate" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', textDecoration: 'none', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>← Hub</a>
          <a href="https://crowdlink.mx" target="_blank" rel="noreferrer" style={{ color: '#3EE8A0', fontSize: '0.78rem', textDecoration: 'none', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(62,232,160,0.3)', background: 'rgba(62,232,160,0.05)' }}>crowdlink.mx ↗</a>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(62,232,160,0.1)', border: '1px solid rgba(62,232,160,0.25)', borderRadius: '20px', padding: '0.35rem 1rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3EE8A0', animation: 'pulse 2s infinite' }} />
            <span style={{ color: '#3EE8A0', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.08em' }}>GUÍA DE INVERSIÓN</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: '800', margin: '0 0 1rem', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            Todo lo que necesitas<br /><span style={{ background: 'linear-gradient(135deg, #3EE8A0, #0891B2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>saber para invertir</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>Plataforma regulada por la CNBV · CASFIM 0065022 · Tasas desde 18% anual</p>
        </div>

        <div style={{ marginBottom: '5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>CÓMO INVERTIR EN CROWDLINK</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {PASOS.map((p, i) => (
              <button key={i} className="paso-btn" onClick={() => setPasoActivo(i)}
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', borderRadius: '10px', border: `1px solid ${pasoActivo === i ? p.color : 'rgba(255,255,255,0.08)'}`, background: pasoActivo === i ? `rgba(${hexToRgb(p.color)},0.12)` : 'rgba(255,255,255,0.03)', cursor: 'pointer', fontFamily: 'inherit' }}>
                <span style={{ fontSize: '1rem' }}>{p.icon}</span>
                <span style={{ color: pasoActivo === i ? 'white' : 'rgba(255,255,255,0.45)', fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap' }}>{p.titulo}</span>
                {pasoActivo === i && <span style={{ background: p.color, color: 'white', fontSize: '0.6rem', fontWeight: '800', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{p.num}</span>}
              </button>
            ))}
          </div>

          <div key={pasoActivo} className="animate-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: `linear-gradient(135deg, rgba(${hexToRgb(paso.color)},0.08), rgba(255,255,255,0.02))`, border: `1px solid ${paso.color}30`, borderRadius: '16px', padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: `${paso.color}20`, border: `1px solid ${paso.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{paso.icon}</div>
                <div>
                  <p style={{ color: paso.color, fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 0.2rem' }}>PASO {paso.num}</p>
                  <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: '700', margin: 0, letterSpacing: '-0.02em' }}>{paso.titulo}</h3>
                </div>
                <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.3rem 0.7rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>⏱ {paso.tiempo}</span>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', lineHeight: 1.8, margin: 0 }}>{paso.desc}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '2rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 1.25rem' }}>EN ESTE PASO</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {paso.detalle.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '6px', background: `${paso.color}20`, border: `1px solid ${paso.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem' }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke={paso.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: 1.5 }}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
            {PASOS.map((p, i) => (
              <button key={i} onClick={() => setPasoActivo(i)} style={{ width: pasoActivo === i ? '24px' : '8px', height: '8px', borderRadius: '4px', background: pasoActivo === i ? p.color : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <button onClick={() => setPasoActivo(Math.max(0, pasoActivo - 1))} disabled={pasoActivo === 0}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '0.6rem 1.25rem', borderRadius: '9px', cursor: pasoActivo === 0 ? 'default' : 'pointer', opacity: pasoActivo === 0 ? 0.3 : 1, fontFamily: 'inherit', fontSize: '0.82rem' }}>← Anterior</button>
            <a href="https://crowdlink.mx" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #3EE8A0, #0891B2)', color: '#0A0F1E', textDecoration: 'none', padding: '0.7rem 1.5rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700' }}>Comenzar en crowdlink.mx ↗</a>
            <button onClick={() => setPasoActivo(Math.min(PASOS.length - 1, pasoActivo + 1))} disabled={pasoActivo === PASOS.length - 1}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '0.6rem 1.25rem', borderRadius: '9px', cursor: pasoActivo === PASOS.length - 1 ? 'default' : 'pointer', opacity: pasoActivo === PASOS.length - 1 ? 0.3 : 1, fontFamily: 'inherit', fontSize: '0.82rem' }}>Siguiente →</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden', marginBottom: '5rem' }}>
          {[{ val: '$5,000', label: 'Mínimo de inversión', color: '#3EE8A0' }, { val: '18–36%', label: 'Rendimiento anual', color: '#0891B2' }, { val: 'CNBV', label: 'CASFIM 0065022', color: '#7C3AED' }, { val: '100%', label: 'Digital, sin papel', color: '#D97706' }].map((s, i) => (
            <div key={i} style={{ background: '#0D1321', padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ color: s.color, fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>{s.val}</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', margin: 0, lineHeight: 1.4 }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>PREGUNTAS FRECUENTES</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {FAQS.map(cat => (
              <button key={cat.cat} onClick={() => setCatActiva(cat.cat)}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: `1px solid ${catActiva === cat.cat ? cat.color : 'rgba(255,255,255,0.08)'}`, background: catActiva === cat.cat ? `${cat.color}15` : 'transparent', color: catActiva === cat.cat ? cat.color : 'rgba(255,255,255,0.45)', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                {cat.cat}
              </button>
            ))}
          </div>

          {FAQS.filter(c => c.cat === catActiva).map(cat => (
            <div key={cat.cat} className="animate-in">
              {cat.preguntas.map((faq, i) => {
                const key = `${cat.cat}-${i}`
                const open = faqAbierta === key
                return (
                  <div key={i} className="faq-item" onClick={() => setFaqAbierta(open ? null : key)}
                    style={{ border: `1px solid ${open ? cat.color + '30' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', marginBottom: '0.75rem', overflow: 'hidden', cursor: 'pointer', background: open ? `${cat.color}06` : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.5rem' }}>
                      <span style={{ color: open ? 'white' : 'rgba(255,255,255,0.8)', fontSize: '0.9rem', fontWeight: '500', lineHeight: 1.4, flex: 1, marginRight: '1rem' }}>{faq.q}</span>
                      <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: open ? `${cat.color}20` : 'rgba(255,255,255,0.05)', border: `1px solid ${open ? cat.color + '40' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                          <polyline points="2 4 6 8 10 4" stroke={open ? cat.color : 'rgba(255,255,255,0.4)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                    {open && (
                      <div className="animate-in" style={{ padding: '0 1.5rem 1.25rem', borderTop: `1px solid ${cat.color}15` }}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.8, margin: '1rem 0 0' }}>{faq.a}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '5rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(62,232,160,0.06), rgba(8,145,178,0.06))', border: '1px solid rgba(62,232,160,0.15)', borderRadius: '20px', padding: '3rem 2rem' }}>
          <p style={{ color: '#3EE8A0', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>¿LISTO PARA INVERTIR?</p>
          <h2 style={{ color: 'white', fontSize: '1.75rem', fontWeight: '800', margin: '0 0 1rem', letterSpacing: '-0.02em' }}>Empieza hoy en crowdlink.mx</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', margin: '0 0 2rem' }}>Regulado por la CNBV · Sin comisiones ocultas · 100% digital</p>
          <a href="https://crowdlink.mx" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #3EE8A0, #0891B2)', color: '#0A0F1E', textDecoration: 'none', padding: '0.9rem 2rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '800' }}>Crear mi cuenta ↗</a>
        </div>

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', margin: 0 }}>PorCuanto, S.A. de C.V. · ITF autorizada CNBV · CASFIM 0065022</p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', margin: 0 }}>La inversión en crowdfunding conlleva riesgo y no está garantizada por el IPAB.</p>
        </div>
      </div>
    </div>
  )
}
