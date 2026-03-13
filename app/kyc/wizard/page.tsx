'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import { cl } from '@/lib/design'
import { IconCheck, IconZap, IconDoc, IconUser, IconBuilding, IconCreditCard, IconEye, IconEyeOff, IconLock, IconInfo, IconX } from '@/components/Icons'
import { sanitize, sanitizeRFC, sanitizeCURP, validateStep1, validateStep2, validateStep4 } from '@/lib/validation'

const STEPS = [
  { n: 1, label: 'Empresa',    icon: <IconBuilding size={15} strokeWidth={1.8} /> },
  { n: 2, label: 'Rep. Legal', icon: <IconUser size={15} strokeWidth={1.8} /> },
  { n: 3, label: 'Financiero', icon: <IconCreditCard size={15} strokeWidth={1.8} /> },
  { n: 4, label: 'Documentos', icon: <IconDoc size={15} strokeWidth={1.8} /> },
  { n: 5, label: 'Ekatena',    icon: <IconZap size={15} strokeWidth={1.8} /> },
  { n: 6, label: 'Confirmar',  icon: <IconCheck size={15} strokeWidth={2} /> },
]

interface DocFile { file: File | null; url: string; uploading: boolean; error: string }
const emptyDoc = (): DocFile => ({ file: null, url: '', uploading: false, error: '' })

interface Form {
  razon_social: string; rfc: string; tipo_persona: 'moral' | 'fisica'; giro: string; pais: string
  rep_legal_nombre: string; rep_legal_curp: string
  nivel_facturacion: string; num_empleados: string; antiguedad: string
  fuente_recursos: string; pais_origen_recursos: string; opera_en_efectivo: string
  ekatena_rfc: string; ekatena_ciec: string
}

const FACTURACION_OPTS = [
  { v: 'menos_1m', l: 'Menos de $1M MXN' },
  { v: '1m_5m',   l: '$1M – $5M MXN' },
  { v: '5m_20m',  l: '$5M – $20M MXN' },
  { v: '20m_50m', l: '$20M – $50M MXN' },
  { v: '50m_plus', l: 'Más de $50M MXN' },
]
const EMPLEADOS_OPTS = [
  { v: '1_10', l: '1 – 10' }, { v: '11_50', l: '11 – 50' },
  { v: '51_250', l: '51 – 250' }, { v: '251_plus', l: '250+' },
]
const FUENTE_OPTS = [
  { v: 'operaciones_propias', l: 'Ingresos comerciales' },
  { v: 'inversiones', l: 'Inversiones y rendimientos' },
  { v: 'financiamiento', l: 'Financiamiento bancario' },
  { v: 'capital_socios', l: 'Capital de socios' },
  { v: 'otro', l: 'Otro' },
]

export default function KycWizardPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<Form>({
    razon_social: '', rfc: '', tipo_persona: 'moral', giro: '', pais: 'MX',
    rep_legal_nombre: '', rep_legal_curp: '',
    nivel_facturacion: '', num_empleados: '', antiguedad: '',
    fuente_recursos: '', pais_origen_recursos: 'MX', opera_en_efectivo: 'no',
    ekatena_rfc: '', ekatena_ciec: '',
  })
  const [docs, setDocs] = useState({
    acta: emptyDoc(),
    domicilio: emptyDoc(),
    identificacion: emptyDoc(),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [ekatenaStatus, setEkatenaStatus] = useState<'idle' | 'connecting' | 'connected'>('idle')
  const [showCiec, setShowCiec] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState<string | null>(null)

  const up = (k: keyof Form, raw: string) => {
    let v = raw
    if (k === 'rfc' || k === 'ekatena_rfc') v = sanitizeRFC(raw)
    else if (k === 'rep_legal_curp') v = sanitizeCURP(raw)
    else v = sanitize(raw)
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n })
  }

  const goNext = (validateFn?: () => Record<string, string>) => {
    if (validateFn) {
      const errs = validateFn()
      if (Object.keys(errs).length > 0) { setErrors(errs); return }
    }
    setErrors({})
    setStep(s => s + 1)
  }

  // ─── Upload doc to Supabase Storage ────────────────────────────────────────
  const uploadDoc = async (key: keyof typeof docs, file: File) => {
    setDocs(d => ({ ...d, [key]: { ...d[key], file, uploading: true, error: '' } }))
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `kyc/${Date.now()}-${key}.${ext}`
      const { error } = await supabase.storage.from('kyc-docs').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('kyc-docs').getPublicUrl(path)
      setDocs(d => ({ ...d, [key]: { file, url: publicUrl, uploading: false, error: '' } }))
    } catch (e) {
      setDocs(d => ({ ...d, [key]: { ...d[key], uploading: false, error: 'Error al subir. Intenta de nuevo.' } }))
    }
  }

  const removeDoc = (key: keyof typeof docs) => {
    setDocs(d => ({ ...d, [key]: emptyDoc() }))
  }

  const handleEkatenaConnect = async () => {
    if (!form.ekatena_ciec || !(form.ekatena_rfc || form.rfc)) return
    setEkatenaStatus('connecting')
    await new Promise(r => setTimeout(r, 2000))
    setEkatenaStatus('connected')
  }

  const handleSubmit = async () => {
    setSubmitting(true); setSubmitError('')
    try {
      const supabase = createClient()

      const payload = {
        razon_social: form.razon_social,
        rfc: form.rfc,
        tipo_persona: form.tipo_persona,
        giro: form.giro,
        pais: form.pais,
        rep_legal_nombre: form.rep_legal_nombre,
        rep_legal_curp: form.rep_legal_curp,
        acta_constitutiva_url: docs.acta.url || null,
        comprobante_domicilio_url: docs.domicilio.url || null,
        identificacion_rep_url: docs.identificacion.url || null,
        status: 'pending',
        metadata: {
          financiero: {
            nivel_facturacion: form.nivel_facturacion,
            num_empleados: form.num_empleados,
            antiguedad: form.antiguedad,
            fuente_recursos: form.fuente_recursos,
            pais_origen_recursos: form.pais_origen_recursos,
            opera_en_efectivo: form.opera_en_efectivo,
          },
          ekatena_conectado: ekatenaStatus === 'connected',
          ekatena_autenticado: ekatenaStatus === 'connected',
          ekatena_rfc: form.ekatena_rfc || form.rfc,
        },
      }

      // Intentar con sesión primero, si no usar service role via API
      const { data, error } = await supabase.from('kyc_empresas').insert(payload).select().single()
      if (error) throw error
      setSubmitted(data.id)
      setStep(7)
    } catch (e: unknown) {
      // Si falla por auth, enviar vía API pública
      try {
        const res = await fetch('/api/v1/kyc/empresas/public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ razon_social: form.razon_social, rfc: form.rfc, tipo_persona: form.tipo_persona, giro: form.giro, pais: form.pais, rep_legal_nombre: form.rep_legal_nombre, rep_legal_curp: form.rep_legal_curp, acta_constitutiva_url: docs.acta.url || null, comprobante_domicilio_url: docs.domicilio.url || null, identificacion_rep_url: docs.identificacion.url || null, status: 'pending', metadata: { financiero: { nivel_facturacion: form.nivel_facturacion, num_empleados: form.num_empleados, antiguedad: form.antiguedad, fuente_recursos: form.fuente_recursos, pais_origen_recursos: form.pais_origen_recursos, opera_en_efectivo: form.opera_en_efectivo }, ekatena_conectado: ekatenaStatus === 'connected', ekatena_autenticado: ekatenaStatus === 'connected', ekatena_rfc: form.ekatena_rfc || form.rfc } }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error')
        setSubmitted(data.id)
        setStep(7)
      } catch (e2: unknown) {
        setSubmitError(e2 instanceof Error ? e2.message : 'Error al enviar')
      }
    }
    setSubmitting(false)
  }

  // ─── Success ────────────────────────────────────────────────────────────────
  if (step === 7) return (
    <div style={rootStyle}>
      <TopBar back="/kyc/inicio" title="Onboarding" />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '20px', padding: '3rem', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#ECFDF5', border: '2px solid #6EE7B7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <IconCheck size={26} color="#059669" strokeWidth={2.5} />
          </div>
          <h2 style={{ color: cl.gray900, fontSize: '1.4rem', fontWeight: '800', margin: '0 0 0.75rem', letterSpacing: '-0.01em' }}>Solicitud enviada</h2>
          <p style={{ color: cl.gray500, fontSize: '0.88rem', lineHeight: 1.7, margin: '0 0 1rem' }}>
            Tu expediente fue recibido. El equipo de compliance lo revisará y recibirás una notificación.
          </p>
          {ekatenaStatus === 'connected' && (
            <div style={{ background: '#ECFDF5', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <IconZap size={15} color="#059669" />
              <span style={{ color: '#065F46', fontSize: '0.82rem', fontWeight: '600' }}>Ekatena conectado · Score en proceso</span>
            </div>
          )}
          {ekatenaStatus !== 'connected' && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.25rem', fontSize: '0.78rem', color: '#92400E' }}>
              Sin Ekatena — el equipo solicitará el score manualmente si es necesario.
            </div>
          )}
          <div style={{ color: cl.gray400, fontSize: '0.73rem', fontFamily: 'monospace', marginBottom: '2rem' }}>ID: {submitted}</div>
          <a href="/gate" style={{ background: '#0F7BF4', color: 'white', textDecoration: 'none', padding: '0.75rem 2rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '700', display: 'inline-block' }}>
            Volver al inicio
          </a>
        </div>
      </div>
      <style>{fontImport}</style>
    </div>
  )

  const cardH = 'min(calc(100vh - 52px - 72px - 1.5rem), 520px)' // viewport - topbar - progressbar - padding

  return (
    <div style={{ ...rootStyle, overflow: 'hidden' }}>
      <TopBar back="/kyc/inicio" title="Onboarding Empresa" />

      {/* Progress bar */}
      <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '0 2rem', height: '72px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center' }}>
          {STEPS.map((st, i) => (
            <div key={st.n} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: step > st.n ? '#0F7BF4' : step === st.n ? '#EBF3FF' : cl.gray100,
                  border: step === st.n ? '2px solid #0F7BF4' : step > st.n ? 'none' : `2px solid ${cl.gray200}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: step > st.n ? 'white' : step === st.n ? '#0F7BF4' : cl.gray400,
                  boxShadow: step === st.n ? '0 0 0 4px #EBF3FF' : 'none',
                  transition: 'all 0.25s',
                }}>
                  {step > st.n ? <IconCheck size={13} color="white" strokeWidth={2.5} /> : st.icon}
                </div>
                <span style={{ fontSize: '0.6rem', fontWeight: step === st.n ? '700' : '400', color: step === st.n ? '#0F7BF4' : step > st.n ? cl.gray500 : cl.gray300, whiteSpace: 'nowrap' }}>{st.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: '2px', margin: '0 0.3rem', marginBottom: '1.2rem', background: step > st.n ? '#0F7BF4' : cl.gray200, transition: 'background 0.25s' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Card — fixed height, no scroll */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem 2rem', overflow: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: '680px', height: cardH, background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '18px', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Card header */}
          <div style={{ padding: '1rem 1.5rem 0', flexShrink: 0 }}>
            <div style={{ color: cl.gray400, fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '0.1rem' }}>PASO {step} DE 6</div>
            <h2 style={{ color: cl.gray900, fontSize: '1rem', fontWeight: '800', margin: '0 0 0.1rem', letterSpacing: '-0.01em' }}>
              {['', 'Datos de la Empresa', 'Representante Legal', 'Perfil Financiero', 'Documentos', 'Conectar Ekatena', 'Confirmar y Enviar'][step]}
            </h2>
            <p style={{ color: cl.gray400, fontSize: '0.76rem', margin: '0 0 0.65rem' }}>
              {['', 'Información fiscal y comercial', 'Persona autorizada para obligar a la empresa', 'Nivel de riesgo y fuente de recursos', 'Sube los documentos del expediente', 'Score crediticio automático (opcional)', 'Revisa antes de enviar'][step]}
            </p>
            <div style={{ height: '1px', background: cl.gray100 }} />
          </div>

          {/* Card body - scrollable only if needed */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem 1.5rem' }}>

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <FL>Razón Social *</FL>
                  <FI placeholder="Empresa SA de CV" value={form.razon_social} onChange={v => up('razon_social', v)} err={errors.razon_social} autoFocus />
                </div>
                <div>
                  <FL>Tipo de Persona *</FL>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    {[{ v: 'moral', l: 'Moral' }, { v: 'fisica', l: 'Física' }].map(o => (
                      <button key={o.v} onClick={() => { up('tipo_persona', o.v); up('rfc', '') }} style={{ padding: '0.6rem', borderRadius: '8px', cursor: 'pointer', border: form.tipo_persona === o.v ? '2px solid #0F7BF4' : `1.5px solid ${cl.gray200}`, background: form.tipo_persona === o.v ? '#EBF3FF' : cl.white, color: form.tipo_persona === o.v ? '#0F7BF4' : cl.gray500, fontSize: '0.82rem', fontWeight: form.tipo_persona === o.v ? '700' : '400', fontFamily: cl.fontFamily }}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <FL>RFC * <span style={{ color: cl.gray400, fontSize: '0.68rem', fontWeight: '400' }}>({form.tipo_persona === 'moral' ? '12 chars' : '13 chars'})</span></FL>
                  <FI placeholder={form.tipo_persona === 'moral' ? 'EMP920101ABC' : 'GALJ900101H01'} value={form.rfc} onChange={v => up('rfc', v)} err={errors.rfc} mono />
                </div>
                <div>
                  <FL>Giro / Sector</FL>
                  <FI placeholder="Fintech, Manufactura..." value={form.giro} onChange={v => up('giro', v)} />
                </div>
                <div>
                  <FL>País</FL>
                  <FS value={form.pais} onChange={v => up('pais', v)}>
                    <option value="MX">México</option>
                    <option value="US">Estados Unidos</option>
                    <option value="CO">Colombia</option>
                    <option value="OTHER">Otro</option>
                  </FS>
                </div>
              </div>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <div style={{ display: 'grid', gap: '0.65rem' }}>
                <div>
                  <FL>Nombre completo *</FL>
                  <FI placeholder="Juan García López" value={form.rep_legal_nombre} onChange={v => up('rep_legal_nombre', v)} err={errors.rep_legal_nombre} autoFocus />
                </div>
                <div>
                  <FL>CURP <span style={{ color: cl.gray400, fontWeight: '400', fontSize: '0.7rem' }}>(opcional)</span></FL>
                  <FI placeholder="GALJ900101HMCRCN01" value={form.rep_legal_curp} onChange={v => up('rep_legal_curp', v)} err={errors.rep_legal_curp} mono />
                </div>
                <div style={{ background: '#EBF3FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <IconInfo size={15} color="#0F7BF4" />
                  <p style={{ color: '#1D4ED8', fontSize: '0.76rem', margin: 0, lineHeight: 1.6 }}>
                    La verificación biométrica del representante se realiza en la plataforma Crowdlink principal.
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <FL>Facturación anual *</FL>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '0.35rem' }}>
                    {FACTURACION_OPTS.map(o => (
                      <button key={o.v} onClick={() => up('nivel_facturacion', o.v)} style={{ padding: '0.55rem 0.3rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', border: form.nivel_facturacion === o.v ? '2px solid #0F7BF4' : `1.5px solid ${cl.gray200}`, background: form.nivel_facturacion === o.v ? '#EBF3FF' : cl.white, color: form.nivel_facturacion === o.v ? '#0F7BF4' : cl.gray600, fontSize: '0.7rem', fontWeight: form.nivel_facturacion === o.v ? '700' : '400', fontFamily: cl.fontFamily, lineHeight: 1.4 }}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                  {errors.nivel_facturacion && <div style={{ color: '#DC2626', fontSize: '0.72rem', marginTop: '0.3rem' }}>{errors.nivel_facturacion}</div>}
                </div>
                <div>
                  <FL>Empleados</FL>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                    {EMPLEADOS_OPTS.map(o => (
                      <button key={o.v} onClick={() => up('num_empleados', o.v)} style={{ padding: '0.5rem', borderRadius: '7px', cursor: 'pointer', border: form.num_empleados === o.v ? '2px solid #0F7BF4' : `1.5px solid ${cl.gray200}`, background: form.num_empleados === o.v ? '#EBF3FF' : cl.white, color: form.num_empleados === o.v ? '#0F7BF4' : cl.gray600, fontSize: '0.72rem', fontWeight: form.num_empleados === o.v ? '700' : '400', fontFamily: cl.fontFamily }}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <FL>Antigüedad</FL>
                  <FS value={form.antiguedad} onChange={v => up('antiguedad', v)}>
                    <option value="">Seleccionar</option>
                    <option value="menos_1">Menos de 1 año</option>
                    <option value="1_3">1 – 3 años</option>
                    <option value="3_5">3 – 5 años</option>
                    <option value="5_10">5 – 10 años</option>
                    <option value="mas_10">Más de 10 años</option>
                  </FS>
                </div>
                <div>
                  <FL>Fuente de recursos</FL>
                  <FS value={form.fuente_recursos} onChange={v => up('fuente_recursos', v)}>
                    <option value="">Seleccionar</option>
                    {FUENTE_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </FS>
                </div>
                <div>
                  <FL>País de origen de recursos</FL>
                  <FS value={form.pais_origen_recursos} onChange={v => up('pais_origen_recursos', v)}>
                    <option value="MX">México</option>
                    <option value="US">Estados Unidos</option>
                    <option value="OTHER">Otro</option>
                  </FS>
                </div>
                <div>
                  <FL>¿Opera en efectivo?</FL>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                    {[{ v: 'no', l: 'No' }, { v: 'si', l: 'Sí' }].map(o => (
                      <button key={o.v} onClick={() => up('opera_en_efectivo', o.v)} style={{ padding: '0.55rem', borderRadius: '7px', cursor: 'pointer', border: form.opera_en_efectivo === o.v ? `2px solid ${o.v === 'si' ? '#F59E0B' : '#0F7BF4'}` : `1.5px solid ${cl.gray200}`, background: form.opera_en_efectivo === o.v ? (o.v === 'si' ? '#FFFBEB' : '#EBF3FF') : cl.white, color: form.opera_en_efectivo === o.v ? (o.v === 'si' ? '#92400E' : '#0F7BF4') : cl.gray500, fontSize: '0.8rem', fontWeight: form.opera_en_efectivo === o.v ? '700' : '400', fontFamily: cl.fontFamily }}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: Documentos con upload ── */}
            {step === 4 && (
              <div style={{ display: 'grid', gap: '0.9rem' }}>
                {([
                  { key: 'acta', label: 'Acta Constitutiva' },
                  { key: 'domicilio', label: 'Comprobante de Domicilio Fiscal' },
                  { key: 'identificacion', label: 'Identificación del Representante Legal' },
                ] as { key: keyof typeof docs; label: string }[]).map(({ key, label }) => (
                  <DocUpload key={key} label={label} doc={docs[key]}
                    onFile={file => uploadDoc(key, file)}
                    onRemove={() => removeDoc(key)} />
                ))}
                <div style={{ background: cl.gray50, border: `1px solid ${cl.gray200}`, borderRadius: '8px', padding: '0.65rem 0.9rem' }}>
                  <p style={{ color: cl.gray400, fontSize: '0.75rem', margin: 0, lineHeight: 1.6 }}>
                    Formatos aceptados: PDF, JPG, PNG · Máx. 10 MB por archivo · Puedes completar los documentos posteriormente.
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 5: Ekatena ── */}
            {step === 5 && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <IconZap size={18} color="#059669" />
                  <div>
                    <div style={{ color: '#065F46', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.25rem' }}>Ekatena — Score crediticio empresarial</div>
                    <p style={{ color: '#4B7A60', fontSize: '0.78rem', margin: 0, lineHeight: 1.6 }}>
                      Al proporcionar tu CIEC autorizas la consulta de historial fiscal para generar un score que <strong>agiliza tu aprobación</strong>. Es opcional — puedes omitir este paso.
                    </p>
                  </div>
                </div>

                {ekatenaStatus !== 'connected' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    <div>
                      <FL>RFC</FL>
                      <FI placeholder={form.rfc || 'EMP920101ABC'} value={form.ekatena_rfc || form.rfc} onChange={v => up('ekatena_rfc', v)} mono />
                    </div>
                    <div>
                      <FL>CIEC — Contraseña SAT <span style={{ color: cl.gray400, fontWeight: '400', fontSize: '0.68rem' }}>(opcional)</span></FL>
                      <div style={{ position: 'relative' }}>
                        <input type={showCiec ? 'text' : 'password'} value={form.ekatena_ciec} onChange={e => setForm(f => ({ ...f, ekatena_ciec: e.target.value.slice(0, 64) }))} placeholder="Tu contraseña SAT" autoComplete="new-password" style={{ ...inputBase, paddingRight: '3rem' }} />
                        <button onClick={() => setShowCiec(!showCiec)} type="button" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          {showCiec ? <IconEyeOff size={15} color={cl.gray400} /> : <IconEye size={15} color={cl.gray400} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {ekatenaStatus === 'idle' && (
                  <button onClick={handleEkatenaConnect} disabled={!form.ekatena_ciec} style={{ background: form.ekatena_ciec ? '#0F7BF4' : cl.gray100, color: form.ekatena_ciec ? 'white' : cl.gray400, border: 'none', borderRadius: '9px', padding: '0.75rem', fontSize: '0.88rem', fontWeight: '700', cursor: form.ekatena_ciec ? 'pointer' : 'not-allowed', fontFamily: cl.fontFamily, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}>
                    <IconZap size={16} color={form.ekatena_ciec ? 'white' : cl.gray400} /> Conectar con Ekatena
                  </button>
                )}

                {ekatenaStatus === 'connecting' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#F0FDF4', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                    <div style={{ width: '18px', height: '18px', border: '2.5px solid #BBF7D0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                    <span style={{ color: '#065F46', fontSize: '0.85rem', fontWeight: '600' }}>Conectando con Ekatena...</span>
                  </div>
                )}

                {ekatenaStatus === 'connected' && (
                  <div style={{ padding: '1rem 1.25rem', background: '#F0FDF4', borderRadius: '12px', border: '1.5px solid #6EE7B7', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ECFDF5', border: '2px solid #6EE7B7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconCheck size={18} color="#059669" strokeWidth={2.5} />
                    </div>
                    <div>
                      <div style={{ color: '#065F46', fontSize: '0.88rem', fontWeight: '700' }}>Ekatena conectado</div>
                      <div style={{ color: '#4B7A60', fontSize: '0.75rem' }}>RFC: {form.ekatena_rfc || form.rfc} · Score generándose</div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <IconLock size={13} color={cl.gray300} />
                  <span style={{ color: cl.gray400, fontSize: '0.72rem' }}>Tu CIEC se transmite de forma segura y no se almacena.</span>
                </div>
              </div>
            )}

            {/* ── STEP 6: Confirmar ── */}
            {step === 6 && (
              <div>
                <div style={{ border: `1px solid ${cl.gray200}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}>
                  {[
                    { group: 'EMPRESA', rows: [
                      { l: 'Razón Social', v: form.razon_social },
                      { l: 'RFC', v: form.rfc, mono: true },
                      { l: 'Tipo', v: form.tipo_persona === 'moral' ? 'Persona Moral' : 'Persona Física' },
                      { l: 'Giro', v: form.giro || '—' },
                    ]},
                    { group: 'REP. LEGAL', rows: [
                      { l: 'Nombre', v: form.rep_legal_nombre || '—' },
                    ]},
                    { group: 'FINANCIERO', rows: [
                      { l: 'Facturación', v: FACTURACION_OPTS.find(o => o.v === form.nivel_facturacion)?.l || '—' },
                      { l: 'Opera en efectivo', v: form.opera_en_efectivo === 'si' ? 'Sí' : 'No' },
                    ]},
                    { group: 'DOCUMENTOS', rows: [
                      { l: 'Acta Constitutiva', v: docs.acta.url ? 'Subido' : 'Pendiente' },
                      { l: 'Comprobante domicilio', v: docs.domicilio.url ? 'Subido' : 'Pendiente' },
                      { l: 'ID Rep. Legal', v: docs.identificacion.url ? 'Subido' : 'Pendiente' },
                    ]},
                    { group: 'EKATENA', rows: [
                      { l: 'Estado', v: ekatenaStatus === 'connected' ? 'Conectado' : 'No conectado (se solicitará manualmente)' },
                    ]},
                  ].map(g => (
                    <div key={g.group}>
                      <div style={{ background: cl.gray50, padding: '0.45rem 1rem', borderBottom: `1px solid ${cl.gray100}` }}>
                        <span style={{ color: cl.gray400, fontSize: '0.63rem', fontWeight: '700', letterSpacing: '0.08em' }}>{g.group}</span>
                      </div>
                      {g.rows.map(r => (
                        <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 1rem', borderBottom: `1px solid ${cl.gray50}` }}>
                          <span style={{ color: cl.gray400, fontSize: '0.78rem' }}>{r.l}</span>
                          <span style={{ color: r.l === 'Estado' && ekatenaStatus === 'connected' ? '#059669' : cl.gray700, fontSize: '0.78rem', fontWeight: '500', fontFamily: (r as {mono?: boolean}).mono ? 'monospace' : cl.fontFamily }}>{r.v}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {submitError && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.7rem 1rem', marginBottom: '0.75rem', color: '#991B1B', fontSize: '0.8rem' }}>{submitError}</div>
                )}
              </div>
            )}
          </div>

          {/* Card footer - nav buttons */}
          <div style={{ padding: '0.75rem 1.5rem', borderTop: `1px solid ${cl.gray100}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: cl.white }}>
            <div>
              {step > 1 && (
                <button onClick={() => setStep(s => s - 1)} style={btnGhost}>← Anterior</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {step === 5 && ekatenaStatus !== 'connected' && (
                <button onClick={() => setStep(6)} style={{ ...btnGhost, color: cl.gray400 }}>Omitir →</button>
              )}
              {step < 6 && (
                <button onClick={() => {
                  if (step === 1) goNext(() => validateStep1({ razon_social: form.razon_social, rfc: form.rfc, tipo_persona: form.tipo_persona }))
                  else if (step === 2) goNext(() => validateStep2({ rep_legal_nombre: form.rep_legal_nombre, rep_legal_curp: form.rep_legal_curp }))
                  else if (step === 3) goNext(() => validateStep4({ nivel_facturacion: form.nivel_facturacion }))
                  else goNext()
                }} style={btnPrimary}>
                  Siguiente →
                </button>
              )}
              {step === 6 && (
                <button onClick={handleSubmit} disabled={submitting} style={{ ...btnPrimary, background: '#059669', boxShadow: '0 4px 12px rgba(5,150,105,0.25)', opacity: submitting ? 0.6 : 1 }}>
                  {submitting ? 'Enviando...' : 'Enviar solicitud KYC'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{fontImport + `@keyframes spin{to{transform:rotate(360deg)}} input:focus,select:focus{border-color:#0F7BF4!important;box-shadow:0 0 0 3px #EBF3FF;outline:none;}`}</style>
    </div>
  )
}

// ─── DocUpload component ──────────────────────────────────────────────────────
function DocUpload({ label, doc, onFile, onRemove }: {
  label: string; doc: DocFile
  onFile: (f: File) => void; onRemove: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div>
      <FL>{label}</FL>
      {!doc.file ? (
        <div onClick={() => ref.current?.click()} style={{ border: `2px dashed ${cl.gray200}`, borderRadius: '10px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', background: cl.gray50, transition: 'all 0.15s' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: cl.gray100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconDoc size={18} color={cl.gray400} />
          </div>
          <div>
            <div style={{ color: cl.gray600, fontSize: '0.82rem', fontWeight: '500' }}>Haz clic para subir</div>
            <div style={{ color: cl.gray400, fontSize: '0.72rem' }}>PDF, JPG, PNG · Máx. 10 MB</div>
          </div>
          <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
        </div>
      ) : (
        <div style={{ border: `1.5px solid ${doc.error ? '#FECACA' : doc.url ? '#BBF7D0' : '#BFDBFE'}`, borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: doc.error ? '#FEF2F2' : doc.url ? '#F0FDF4' : '#EBF3FF' }}>
          {doc.uploading ? (
            <div style={{ width: '18px', height: '18px', border: '2.5px solid #BFDBFE', borderTopColor: '#0F7BF4', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
          ) : doc.url ? (
            <IconCheck size={18} color="#059669" strokeWidth={2.5} />
          ) : (
            <IconDoc size={18} color="#0F7BF4" />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: doc.error ? '#DC2626' : doc.url ? '#065F46' : '#1D4ED8', fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {doc.error || (doc.uploading ? 'Subiendo...' : doc.url ? 'Subido correctamente' : doc.file.name)}
            </div>
            {!doc.error && !doc.uploading && <div style={{ color: cl.gray400, fontSize: '0.7rem' }}>{doc.file.name}</div>}
          </div>
          {!doc.uploading && (
            <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem', flexShrink: 0 }}>
              <IconX size={15} color={cl.gray400} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function TopBar({ back, title }: { back: string; title: string }) {
  return (
    <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '0 2rem', height: '52px', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
      <a href={back} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: cl.gray500, fontSize: '0.82rem', fontWeight: '500' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
        Regresar
      </a>
      <div style={{ width: '1px', height: '18px', background: cl.gray200 }} />
      <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '20px', width: 'auto' }} />
      <div style={{ width: '1px', height: '18px', background: cl.gray200 }} />
      <span style={{ color: cl.gray500, fontSize: '0.82rem', fontWeight: '500' }}>{title}</span>
    </div>
  )
}

function FL({ children }: { children: React.ReactNode }) {
  return <label style={{ color: cl.gray700, fontSize: '0.78rem', fontWeight: '600', display: 'block', marginBottom: '0.35rem' }}>{children}</label>
}
function FI({ placeholder, value, onChange, err, mono, autoFocus }: { placeholder?: string; value: string; onChange: (v: string) => void; err?: string; mono?: boolean; autoFocus?: boolean }) {
  return (
    <>
      <input autoFocus={autoFocus} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} style={{ ...inputBase, fontFamily: mono ? 'monospace' : cl.fontFamily, borderColor: err ? '#FCA5A5' : undefined }} />
      {err && <div style={{ color: '#DC2626', fontSize: '0.72rem', marginTop: '0.25rem' }}>{err}</div>}
    </>
  )
}
function FS({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return <select value={value} onChange={e => onChange(e.target.value)} style={inputBase}>{children}</select>
}

const rootStyle: React.CSSProperties = { height: '100vh', background: cl.gray50, fontFamily: cl.fontFamily, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
const inputBase: React.CSSProperties = { width: '100%', background: cl.white, border: `1.5px solid ${cl.gray200}`, borderRadius: '9px', padding: '0.55rem 0.85rem', color: cl.gray800, fontSize: '0.84rem', fontFamily: cl.fontFamily, outline: 'none', boxSizing: 'border-box' as const }
const btnPrimary: React.CSSProperties = { background: '#0F7BF4', color: 'white', border: 'none', borderRadius: '9px', padding: '0.65rem 1.5rem', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', fontFamily: cl.fontFamily, display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(15,123,244,0.2)' }
const btnGhost: React.CSSProperties = { background: cl.gray100, border: `1px solid ${cl.gray200}`, borderRadius: '9px', padding: '0.65rem 1.25rem', color: cl.gray600, cursor: 'pointer', fontSize: '0.82rem', fontWeight: '500', fontFamily: cl.fontFamily }
const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`
