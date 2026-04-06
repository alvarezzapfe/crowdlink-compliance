'use client'
import { useState, useEffect } from 'react'

const CLIENT_STEPS = [
  {
    title: 'Datos de tu empresa', subtitle: 'Información legal del solicitante',
    fields: [
      { key: 'RAZON_SOCIAL', label: 'Razón Social', placeholder: 'Empresa ABC, S.A. de C.V.' },
      { key: 'RFC', label: 'RFC', placeholder: 'EAB200101ABC' },
      { key: 'ESCRITURA_NUMERO', label: 'No. Escritura Pública', placeholder: '12,345' },
      { key: 'ESCRITURA_FECHA', label: 'Fecha de Escritura', placeholder: '15 de enero de 2020' },
      { key: 'NOTARIO_NOMBRE', label: 'Nombre del Notario', placeholder: 'Juan Pérez García' },
      { key: 'NOTARIA_NUMERO', label: 'No. de Notaría', placeholder: '42' },
      { key: 'NOTARIA_LOCALIDAD', label: 'Localidad de la Notaría', placeholder: 'Ciudad de México' },
      { key: 'FOLIO_MERCANTIL', label: 'Folio Mercantil', placeholder: 'N-2024001234' },
      { key: 'REP_LEGAL_NOMBRE', label: 'Nombre del Rep. Legal', placeholder: 'María González López' },
      { key: 'ESCRITURA_PODER_NUMERO', label: 'No. Escritura de Poder', placeholder: '67,890' },
      { key: 'ESCRITURA_PODER_FECHA', label: 'Fecha del Poder', placeholder: '1 de marzo de 2022' },
      { key: 'DOMICILIO', label: 'Domicilio completo', placeholder: 'Av. Reforma 123, Col. Juárez, CP 06600, CDMX', wide: true },
      { key: 'EMAIL_CLIENTE', label: 'Correo electrónico', placeholder: 'legal@empresa.com' },
    ]
  },
  {
    title: 'Datos bancarios', subtitle: 'Cuenta donde recibirás el crédito',
    fields: [
      { key: 'BANCO', label: 'Institución bancaria', placeholder: 'BBVA México' },
      { key: 'NUMERO_CUENTA', label: 'Número de cuenta', placeholder: '0123456789' },
      { key: 'CLABE', label: 'CLABE interbancaria (18 dígitos)', placeholder: '012180001234567891' },
    ]
  }
]

interface Inst { id: string; nombre_cliente: string; razon_social: string | null; datos: Record<string,string>; template: { nombre: string; variables: string[] } }

export default function ClientFillPage({ params }: { params: { token: string } }) {
  const [instancia, setInstancia] = useState<Inst | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)
  const [datos, setDatos] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch(`/api/contratos/token/${params.token}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else { setInstancia(d.instancia); setDatos(d.instancia.datos || {}) }; setLoading(false) })
      .catch(() => { setError('Error de red'); setLoading(false) })
  }, [params.token])

  async function handleSubmit() {
    setSubmitting(true)
    const res = await fetch(`/api/contratos/token/${params.token}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ datos }) })
    const data = await res.json()
    setSubmitting(false)
    if (data.ok) setDone(true); else setError(data.error || 'Error al enviar')
  }

  const s = { fontFamily: "'Inter',-apple-system,sans-serif" }

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', ...s }}><p style={{ color:'#94A3B8' }}>Cargando…</p></div>

  if (error) {
    const msgs: Record<string,{title:string;desc:string;emoji:string}> = {
      'Este link ha expirado': { title:'Link expirado', desc:'Este enlace ya no es válido. Contacta a Crowdlink para solicitar uno nuevo.', emoji:'⏰' },
      'Este contrato ya fue completado': { title:'Contrato completado', desc:'Ya enviaste tu información. Crowdlink se pondrá en contacto contigo.', emoji:'✅' },
    }
    const info = msgs[error] || { title:'Error', desc:error, emoji:'⚠️' }
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F8FAFC', ...s }}>
        <div style={{ textAlign:'center', maxWidth:'400px', padding:'2rem' }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>{info.emoji}</div>
          <h1 style={{ color:'#0F172A', fontSize:'1.3rem', fontWeight:'700', margin:'0 0 0.75rem' }}>{info.title}</h1>
          <p style={{ color:'#64748B', fontSize:'0.875rem', lineHeight:1.7, margin:'0 0 1.5rem' }}>{info.desc}</p>
          <a href="mailto:contacto@crowdlink.mx" style={{ color:'#0891B2', fontWeight:'600', textDecoration:'none' }}>contacto@crowdlink.mx</a>
        </div>
      </div>
    )
  }

  if (done) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F8FAFC', ...s }}>
      <div style={{ textAlign:'center', maxWidth:'440px', padding:'2rem' }}>
        <div style={{ width:'72px', height:'72px', borderRadius:'18px', background:'#ECFDF5', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1 style={{ color:'#0F172A', fontSize:'1.4rem', fontWeight:'800', margin:'0 0 0.75rem' }}>¡Listo, {instancia?.nombre_cliente}!</h1>
        <p style={{ color:'#64748B', fontSize:'0.9rem', lineHeight:1.7, margin:'0 0 1.5rem' }}>Tu información fue enviada. El equipo de Crowdlink preparará tu contrato y te contactará pronto.</p>
        <div style={{ background:'#F0FDF4', border:'1px solid #A7F3D0', borderRadius:'10px', padding:'0.9rem 1.25rem' }}>
          <p style={{ color:'#065F46', fontSize:'0.78rem', margin:0 }}>¿Dudas? <strong>contacto@crowdlink.mx</strong> · <strong>55 5160 9091</strong></p>
        </div>
      </div>
    </div>
  )

  if (!instancia) return null
  const currentStep = CLIENT_STEPS[step]
  const totalSteps = CLIENT_STEPS.length

  return (
    <div style={{ minHeight:'100vh', background:'#F8FAFC', ...s }}>
      <div style={{ background:'#0F172A', padding:'0 2rem', height:'58px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <span style={{ color:'#3EE8A0', fontWeight:'800', fontSize:'1.1rem' }}>crowd</span>
          <span style={{ color:'white', fontWeight:'800', fontSize:'1.1rem' }}>link</span>
          <div style={{ width:'1px', height:'16px', background:'rgba(255,255,255,0.2)', margin:'0 8px' }} />
          <span style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.78rem' }}>Contrato digital</span>
        </div>
      </div>
      <div style={{ maxWidth:'640px', margin:'0 auto', padding:'2.5rem 1.5rem' }}>
        <div style={{ marginBottom:'2rem', textAlign:'center' }}>
          <h1 style={{ color:'#0F172A', fontSize:'1.5rem', fontWeight:'800', margin:'0 0 0.5rem' }}>Hola, {instancia.nombre_cliente}</h1>
          <p style={{ color:'#64748B', fontSize:'0.9rem', margin:0 }}>Completa tu <strong>{instancia.template.nombre}</strong>. Tarda menos de 5 minutos.</p>
        </div>
        <div style={{ marginBottom:'1.75rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem' }}>
            <span style={{ color:'#94A3B8', fontSize:'0.75rem' }}>Paso {step+1} de {totalSteps}</span>
            <span style={{ color:'#0891B2', fontSize:'0.75rem', fontWeight:'600' }}>{currentStep.title}</span>
          </div>
          <div style={{ height:'6px', background:'#E2E8F0', borderRadius:'3px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${((step+1)/totalSteps)*100}%`, background:'#0891B2', borderRadius:'3px', transition:'width 0.3s' }} />
          </div>
        </div>
        <div style={{ background:'white', border:'1px solid #E2E8F0', borderRadius:'16px', padding:'2rem', marginBottom:'1.25rem' }}>
          <p style={{ color:'#94A3B8', fontSize:'0.78rem', margin:'0 0 1.5rem' }}>{currentStep.subtitle}</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            {currentStep.fields.map(field => (
              <div key={field.key} style={{ gridColumn:(field as {wide?:boolean}).wide ? '1 / -1' : 'auto' }}>
                <label style={{ color:'#475569', fontSize:'0.8rem', fontWeight:'500', display:'block', marginBottom:'0.4rem' }}>{field.label}</label>
                <input value={datos[field.key]||''} onChange={e => setDatos(p=>({...p,[field.key]:e.target.value}))} placeholder={field.placeholder}
                  style={{ width:'100%', background:'white', border:'1.5px solid #E2E8F0', borderRadius:'9px', padding:'0.7rem 0.9rem', color:'#1E293B', fontSize:'0.88rem', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:'10px', padding:'0.85rem 1rem', marginBottom:'1.5rem' }}>
          <p style={{ color:'#92400E', fontSize:'0.75rem', margin:0 }}>🔒 Tu información es confidencial y solo se usará para formalizar tu contrato con Crowdlink.</p>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <button onClick={() => setStep(s=>Math.max(0,s-1))} disabled={step===0}
            style={{ background:'transparent', color:'#64748B', border:'1px solid #E2E8F0', borderRadius:'9px', padding:'0.7rem 1.25rem', fontSize:'0.85rem', fontWeight:'500', cursor:step===0?'default':'pointer', opacity:step===0?0.3:1, fontFamily:'inherit' }}>
            ← Anterior
          </button>
          {step < totalSteps-1 ? (
            <button onClick={() => setStep(s=>s+1)}
              style={{ background:'#0891B2', color:'white', border:'none', borderRadius:'9px', padding:'0.7rem 1.5rem', fontSize:'0.85rem', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' }}>
              Siguiente →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              style={{ background:'#059669', color:'white', border:'none', borderRadius:'9px', padding:'0.7rem 1.5rem', fontSize:'0.85rem', fontWeight:'600', cursor:submitting?'default':'pointer', opacity:submitting?0.6:1, fontFamily:'inherit' }}>
              {submitting ? 'Enviando…' : '✓ Enviar información'}
            </button>
          )}
        </div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); *{box-sizing:border-box}`}</style>
    </div>
  )
}
