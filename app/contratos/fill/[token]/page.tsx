'use client'
import { useState, useEffect } from 'react'

type TipoPersona = 'pf' | 'pm'
type TipoContrato = 'inv_deuda' | 'inv_capital' | 'sol_deuda_sin_garantia' | 'sol_deuda_con_garantia' | 'sol_capital'

const TIPO_COLORS: Record<TipoContrato, { color: string; bg: string; label: string }> = {
  inv_deuda:              { color: '#0891B2', bg: '#ECFEFF', label: 'Inversionista Deuda' },
  inv_capital:            { color: '#7C3AED', bg: '#F5F3FF', label: 'Inversionista Capital' },
  sol_deuda_sin_garantia: { color: '#059669', bg: '#ECFDF5', label: 'Solicitante Deuda' },
  sol_deuda_con_garantia: { color: '#D97706', bg: '#FFFBEB', label: 'Solicitante Deuda + Garantía' },
  sol_capital:            { color: '#DC2626', bg: '#FEF2F2', label: 'Solicitante Capital' },
}

type FieldDef = { key: string; label: string; placeholder: string; wide?: boolean }

const F: Record<string, FieldDef> = {
  RAZON_SOCIAL:            { key: 'RAZON_SOCIAL',            label: 'Razón Social',                  placeholder: 'Empresa ABC, S.A. de C.V.',    wide: true },
  RFC_PM:                  { key: 'RFC',                     label: 'RFC',                           placeholder: 'EAB200101ABC' },
  ESCRITURA_NUMERO:        { key: 'ESCRITURA_NUMERO',        label: 'No. Escritura constitutiva',    placeholder: '12,345' },
  ESCRITURA_FECHA:         { key: 'ESCRITURA_FECHA',         label: 'Fecha de escritura',            placeholder: '15 de enero de 2020' },
  NOTARIO_NOMBRE:          { key: 'NOTARIO_NOMBRE',          label: 'Nombre del Notario',            placeholder: 'Juan Pérez García',            wide: true },
  NOTARIA_NUMERO:          { key: 'NOTARIA_NUMERO',          label: 'No. de Notaría',                placeholder: '42' },
  NOTARIA_LOCALIDAD:       { key: 'NOTARIA_LOCALIDAD',       label: 'Localidad de la Notaría',       placeholder: 'Ciudad de México' },
  FOLIO_MERCANTIL:         { key: 'FOLIO_MERCANTIL',         label: 'Folio mercantil',               placeholder: 'N-2024001234' },
  FOLIO_FECHA:             { key: 'FOLIO_FECHA',             label: 'Fecha del folio',               placeholder: '16 de abril de 2020' },
  REP_LEGAL_NOMBRE:        { key: 'REP_LEGAL_NOMBRE',        label: 'Nombre del Representante Legal',placeholder: 'María González López',         wide: true },
  PODER_ESCRITURA_NUMERO:  { key: 'PODER_ESCRITURA_NUMERO',  label: 'No. Escritura de poder',        placeholder: '67,890' },
  PODER_ESCRITURA_FECHA:   { key: 'PODER_ESCRITURA_FECHA',   label: 'Fecha del poder',               placeholder: '1 de marzo de 2022' },
  PODER_NOTARIO_NOMBRE:    { key: 'PODER_NOTARIO_NOMBRE',    label: 'Notario del poder',             placeholder: 'Pedro López Ruiz',             wide: true },
  PODER_NOTARIA_NUMERO:    { key: 'PODER_NOTARIA_NUMERO',    label: 'No. Notaría del poder',         placeholder: '137' },
  PODER_NOTARIA_LOCALIDAD: { key: 'PODER_NOTARIA_LOCALIDAD', label: 'Localidad notaría del poder',   placeholder: 'Cuautitlán Izcalli' },
  NOMBRE_COMPLETO:         { key: 'NOMBRE_COMPLETO',         label: 'Nombre completo',               placeholder: 'Juan Pérez García',            wide: true },
  CURP:                    { key: 'CURP',                    label: 'CURP',                          placeholder: 'PEGJ800101HDFRRL09' },
  RFC_PF:                  { key: 'RFC',                     label: 'RFC',                           placeholder: 'PEGJ800101ABC' },
  DOMICILIO:               { key: 'DOMICILIO',               label: 'Domicilio fiscal completo',     placeholder: 'Av. Reforma 123, Col. Juárez, CP 06600, CDMX', wide: true },
  EMAIL:                   { key: 'EMAIL',                   label: 'Correo electrónico',            placeholder: 'contacto@empresa.com' },
  MONTO_CREDITO:           { key: 'MONTO_CREDITO',           label: 'Monto del crédito ($)',         placeholder: '500,000.00' },
  TASA_ORDINARIA:          { key: 'TASA_ORDINARIA',          label: 'Tasa ordinaria anual (%)',      placeholder: '24' },
  PLAZO:                   { key: 'PLAZO',                   label: 'Plazo',                         placeholder: '12 meses' },
  BANCO_DISPERSION:        { key: 'BANCO_DISPERSION',        label: 'Banco',                         placeholder: 'BBVA México',                  wide: true },
  CUENTA_DISPERSION:       { key: 'CUENTA_DISPERSION',       label: 'Número de cuenta',              placeholder: '0123456789' },
  CLABE_DISPERSION:        { key: 'CLABE_DISPERSION',        label: 'CLABE interbancaria',           placeholder: '012180001234567891' },
  GARANTIA_DESCRIPCION:    { key: 'GARANTIA_DESCRIPCION',    label: 'Descripción del bien',         placeholder: 'Casa habitación en Lomas de Chapultepec', wide: true },
  GARANTIA_DOMICILIO:      { key: 'GARANTIA_DOMICILIO',      label: 'Domicilio del bien',            placeholder: 'Calle X No. Y, Col. Z, CP 11000, CDMX', wide: true },
  GARANTIA_VALOR:          { key: 'GARANTIA_VALOR',          label: 'Valor del bien ($)',            placeholder: '3,000,000.00' },
}

function getSteps(tipo: TipoContrato, persona: TipoPersona): { icon: string; title: string; fields: FieldDef[] }[] {
  const isInv = tipo === 'inv_deuda' || tipo === 'inv_capital'
  const isDeuda = tipo === 'inv_deuda' || tipo === 'sol_deuda_sin_garantia' || tipo === 'sol_deuda_con_garantia'
  const conGarantia = tipo === 'sol_deuda_con_garantia'
  const steps = []
  if (isInv && persona === 'pf') {
    steps.push({ icon: '👤', title: 'Tus datos personales', fields: [F.NOMBRE_COMPLETO, F.CURP, F.RFC_PF, F.DOMICILIO, F.EMAIL] })
  } else {
    steps.push({ icon: '🏢', title: 'Datos de tu empresa', fields: [F.RAZON_SOCIAL, F.RFC_PM, F.ESCRITURA_NUMERO, F.ESCRITURA_FECHA, F.NOTARIO_NOMBRE, F.NOTARIA_NUMERO, F.NOTARIA_LOCALIDAD, F.FOLIO_MERCANTIL, F.FOLIO_FECHA] })
    steps.push({ icon: '👤', title: 'Representante Legal', fields: [F.REP_LEGAL_NOMBRE, F.PODER_ESCRITURA_NUMERO, F.PODER_ESCRITURA_FECHA, F.PODER_NOTARIO_NOMBRE, F.PODER_NOTARIA_NUMERO, F.PODER_NOTARIA_LOCALIDAD, F.DOMICILIO, F.EMAIL] })
  }
  if (tipo === 'sol_deuda_sin_garantia' || tipo === 'sol_deuda_con_garantia')
    steps.push({ icon: '💰', title: 'Condiciones del crédito', fields: [F.MONTO_CREDITO, F.TASA_ORDINARIA, F.PLAZO] })
  if (conGarantia)
    steps.push({ icon: '🏠', title: 'Garantía hipotecaria', fields: [F.GARANTIA_DESCRIPCION, F.GARANTIA_DOMICILIO, F.GARANTIA_VALOR] })
  if (isDeuda)
    steps.push({ icon: '🏦', title: 'Datos bancarios', fields: [F.BANCO_DISPERSION, F.CUENTA_DISPERSION, F.CLABE_DISPERSION] })
  return steps
}

interface Instancia {
  id: string; nombre_cliente: string; datos: Record<string, string>
  tipo_persona: TipoPersona | null
  template: { nombre: string; variables: string[]; tipo_contrato?: TipoContrato }
}

export default function ClientFillPage({ params }: { params: { token: string } }) {
  const [instancia, setInstancia] = useState<Instancia | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tipoPersona, setTipoPersona] = useState<TipoPersona | null>(null)
  const [step, setStep] = useState(0)
  const [datos, setDatos] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/contratos/token/${params.token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else { setInstancia(d.instancia); setDatos(d.instancia.datos || {}); if (d.instancia.tipo_persona) setTipoPersona(d.instancia.tipo_persona) }
        setLoading(false)
      })
      .catch(() => { setError('Error de red'); setLoading(false) })
  }, [params.token])

  async function saveTipoPersona(tp: TipoPersona) {
    setTipoPersona(tp)
    await fetch(`/api/contratos/token/${params.token}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo_persona: tp }),
    })
  }

  async function handleNext() {
    setSaving(true)
    await fetch(`/api/contratos/token/${params.token}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datos }),
    })
    setSaving(false)
    setStep(s => s + 1)
  }

  function setField(key: string, value: string) {
    setDatos(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    const saveRes = await fetch(`/api/contratos/token/${params.token}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datos, status: 'completado' }),
    })
    const saveData = await saveRes.json()
    if (!saveRes.ok) { setError(saveData.error || 'Error al enviar'); setSubmitting(false); return }
    const genRes = await fetch('/api/contratos/generar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instancia_id: saveData.instancia_id }),
    })
    const genData = await genRes.json()
    setSubmitting(false)
    if (genData.download_url) setDownloadUrl(genData.download_url)
    setDone(true)
  }

  if (loading) return <LoadingScreen />
  if (error) return <ErrorScreen message={error} />
  if (done) return <SuccessScreen nombre={instancia?.nombre_cliente || ''} downloadUrl={downloadUrl} />
  if (!instancia) return <ErrorScreen message="Contrato no encontrado" />

  const tipo = (instancia.template?.tipo_contrato || 'sol_deuda_sin_garantia') as TipoContrato
  const tipoCfg = TIPO_COLORS[tipo] || TIPO_COLORS.sol_deuda_sin_garantia
  const isInv = tipo === 'inv_deuda' || tipo === 'inv_capital'
  const needsPersonaSelect = isInv && !tipoPersona
  const steps = (tipoPersona || !isInv) ? getSteps(tipo, tipoPersona || 'pm') : []
  const totalSteps = steps.length
  const currentStep = steps[step]
  const filledInStep = currentStep ? currentStep.fields.filter(f => datos[f.key]?.trim()).length : 0
  const totalInStep = currentStep ? currentStep.fields.length : 0

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <div style={{ background: '#0F172A', padding: '0 2rem', height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#3EE8A0', fontWeight: '800', fontSize: '1.15rem', letterSpacing: '-0.02em' }}>crowd</span>
          <span style={{ color: 'white', fontWeight: '800', fontSize: '1.15rem', letterSpacing: '-0.02em' }}>link</span>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)', margin: '0 0.5rem' }} />
          <span style={{ background: tipoCfg.bg, color: tipoCfg.color, fontSize: '0.7rem', fontWeight: '700', padding: '0.2rem 0.55rem', borderRadius: '5px' }}>{tipoCfg.label}</span>
        </div>
        {saving && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>Guardando…</span>}
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#0F172A', fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.4rem', letterSpacing: '-0.02em' }}>Hola, {instancia.nombre_cliente} 👋</h1>
          <p style={{ color: '#64748B', fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>
            Completa tu <strong>{instancia.template.nombre}</strong>. Tarda menos de 5 minutos.
          </p>
        </div>

        {needsPersonaSelect && (
          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '2.5rem 2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <p style={{ color: '#94A3B8', fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.06em', margin: '0 0 1rem' }}>PRIMERO, CUÉNTANOS</p>
            <h2 style={{ color: '#0F172A', fontSize: '1.15rem', fontWeight: '700', margin: '0 0 0.4rem' }}>¿Cómo participas como inversionista?</h2>
            <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '0 0 2rem' }}>Selecciona el tipo de persona</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: '400px', margin: '0 auto' }}>
              {([
                { val: 'pf' as TipoPersona, icon: '👤', title: 'Persona Física', desc: 'Soy una persona individual' },
                { val: 'pm' as TipoPersona, icon: '🏢', title: 'Persona Moral', desc: 'Represento una empresa' },
              ]).map(opt => (
                <div key={opt.val} onClick={() => saveTipoPersona(opt.val)}
                  style={{ border: '2px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem 1rem', cursor: 'pointer', background: 'white', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = tipoCfg.color; e.currentTarget.style.background = tipoCfg.bg }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = 'white' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>{opt.icon}</div>
                  <p style={{ color: '#0F172A', fontWeight: '700', fontSize: '0.9rem', margin: '0 0 0.25rem' }}>{opt.title}</p>
                  <p style={{ color: '#94A3B8', fontSize: '0.75rem', margin: 0 }}>{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!needsPersonaSelect && currentStep && (<>
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem' }}>
              {steps.map((s, i) => (
                <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i <= step ? tipoCfg.color : '#E2E8F0', opacity: i < step ? 0.5 : 1, transition: 'all 0.3s' }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{currentStep.icon}</span>
                <span style={{ color: '#0F172A', fontSize: '0.88rem', fontWeight: '600' }}>{currentStep.title}</span>
                {tipoPersona && isInv && <span style={{ background: '#F1F5F9', color: '#64748B', fontSize: '0.62rem', fontWeight: '700', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{tipoPersona === 'pf' ? 'PF' : 'PM'}</span>}
              </div>
              <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>{filledInStep}/{totalInStep} · Paso {step + 1} de {totalSteps}</span>
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '2rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {currentStep.fields.map(field => {
                const filled = !!datos[field.key]?.trim()
                return (
                  <div key={field.key} style={{ gridColumn: field.wide ? '1 / -1' : 'auto' }}>
                    <label style={{ color: filled ? '#475569' : '#92400E', fontSize: '0.78rem', fontWeight: '500', display: 'block', marginBottom: '0.35rem' }}>
                      {field.label}{!filled && <span style={{ color: '#FCD34D', marginLeft: '0.25rem' }}>*</span>}
                    </label>
                    <input value={datos[field.key] || ''} onChange={e => setField(field.key, e.target.value)} placeholder={field.placeholder}
                      style={{ width: '100%', background: filled ? 'white' : '#FFFBEB', border: `1.5px solid ${filled ? '#E2E8F0' : '#FDE68A'}`, borderRadius: '9px', padding: '0.7rem 0.9rem', color: '#1E293B', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'all 0.15s' }}
                      onFocus={e => { e.currentTarget.style.borderColor = tipoCfg.color; e.currentTarget.style.background = 'white' }}
                      onBlur={e => { const v = e.currentTarget.value.trim(); e.currentTarget.style.borderColor = v ? '#E2E8F0' : '#FDE68A'; e.currentTarget.style.background = v ? 'white' : '#FFFBEB' }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>
            <p style={{ color: '#0369A1', fontSize: '0.75rem', margin: 0, lineHeight: 1.6 }}>🔒 Tu información es confidencial. Dudas: <strong>contacto@crowdlink.mx</strong></p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => step === 0 && isInv ? setTipoPersona(null) : setStep(s => s - 1)} disabled={step === 0 && !isInv}
              style={{ background: 'transparent', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '0.7rem 1.25rem', fontSize: '0.85rem', fontWeight: '500', cursor: (step === 0 && !isInv) ? 'default' : 'pointer', opacity: (step === 0 && !isInv) ? 0.3 : 1, fontFamily: 'inherit' }}>
              ← Anterior
            </button>
            {step < totalSteps - 1 ? (
              <button onClick={handleNext} style={{ background: tipoCfg.color, color: 'white', border: 'none', borderRadius: '9px', padding: '0.7rem 1.75rem', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                Siguiente →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                style={{ background: '#059669', color: 'white', border: 'none', borderRadius: '9px', padding: '0.7rem 1.75rem', fontSize: '0.85rem', fontWeight: '600', cursor: submitting ? 'default' : 'pointer', fontFamily: 'inherit', opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Enviando…' : '✓ Enviar información'}
              </button>
            )}
          </div>
        </>)}
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); *{box-sizing:border-box}`}</style>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F8FAFC', fontFamily:'sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:'40px', height:'40px', border:'3px solid #E2E8F0', borderTopColor:'#0891B2', borderRadius:'50%', margin:'0 auto 1rem', animation:'spin 0.8s linear infinite' }} />
        <p style={{ color:'#94A3B8', fontSize:'0.875rem' }}>Cargando contrato…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  const msgs: Record<string, { title: string; desc: string; emoji: string }> = {
    'Este link ha expirado':          { title:'Link expirado',  desc:'Este enlace ya no es válido. Contacta a Crowdlink.',          emoji:'⏰' },
    'Este contrato ya fue completado':{ title:'Ya completado',  desc:'Ya enviaste tu información. Crowdlink se pondrá en contacto.',emoji:'✅' },
    'Token inválido o no encontrado': { title:'Link inválido',  desc:'Verifica que hayas copiado el link correctamente.',           emoji:'🔗' },
  }
  const info = msgs[message] || { title:'Error', desc:message, emoji:'⚠️' }
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F8FAFC', fontFamily:'sans-serif' }}>
      <div style={{ textAlign:'center', maxWidth:'400px', padding:'2rem' }}>
        <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>{info.emoji}</div>
        <h1 style={{ color:'#0F172A', fontSize:'1.3rem', fontWeight:'700', margin:'0 0 0.75rem' }}>{info.title}</h1>
        <p style={{ color:'#64748B', fontSize:'0.875rem', lineHeight:1.7, margin:'0 0 1.5rem' }}>{info.desc}</p>
        <a href="mailto:contacto@crowdlink.mx" style={{ color:'#0891B2', fontSize:'0.875rem', fontWeight:'600', textDecoration:'none' }}>contacto@crowdlink.mx</a>
      </div>
    </div>
  )
}

function SuccessScreen({ nombre, downloadUrl }: { nombre: string; downloadUrl: string | null }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F8FAFC', fontFamily:'sans-serif' }}>
      <div style={{ textAlign:'center', maxWidth:'440px', padding:'2rem' }}>
        <div style={{ width:'80px', height:'80px', borderRadius:'20px', background:'linear-gradient(135deg,#3EE8A0,#0891B2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem', boxShadow:'0 8px 24px rgba(14,165,233,0.25)' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1 style={{ color:'#0F172A', fontSize:'1.5rem', fontWeight:'800', margin:'0 0 0.75rem', letterSpacing:'-0.02em' }}>¡Listo, {nombre}!</h1>
        <p style={{ color:'#64748B', fontSize:'0.9rem', lineHeight:1.7, margin:'0 0 1.5rem' }}>Tu información fue enviada. A continuación puedes descargar tu contrato.</p>
        {downloadUrl ? (
          <div style={{ marginBottom:'1.5rem', textAlign:'center' }}>
            <a href={downloadUrl} target="_blank" rel="noreferrer"
              style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', background:'#1E6FF1', color:'white', textDecoration:'none', padding:'0.85rem 1.75rem', borderRadius:'10px', fontSize:'0.9rem', fontWeight:'600' }}>
              ⬇ Descargar contrato Word
            </a>
            <p style={{ color:'#94A3B8', fontSize:'0.75rem', margin:'0.75rem 0 0' }}>El equipo de Crowdlink también recibe una copia.</p>
          </div>
        ) : (
          <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:'10px', padding:'0.85rem 1rem', marginBottom:'1.5rem' }}>
            <p style={{ color:'#92400E', fontSize:'0.78rem', margin:0 }}>⏳ Generando contrato… recibirás el documento por email.</p>
          </div>
        )}
        <div style={{ background:'linear-gradient(135deg,#ECFEFF,#F0F9FF)', border:'1px solid #BAE6FD', borderRadius:'12px', padding:'1rem 1.25rem' }}>
          <p style={{ color:'#0369A1', fontSize:'0.8rem', margin:0 }}>Dudas: <strong>contacto@crowdlink.mx</strong> · <strong>55 5160 9091</strong></p>
        </div>
      </div>
    </div>
  )
}
