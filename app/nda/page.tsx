'use client'
import { useState, useEffect } from 'react'
import { cl, sharedStyles } from '@/lib/design'
import { createClient } from '@/lib/supabase-client'

type Step = 'form' | 'sending' | 'done'

export default function NDAPage() {
  const [token, setToken] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [error, setError] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [representante, setRepresentante] = useState('')
  const [fecha, setFecha] = useState(() => {
    const d = new Date()
    return `${d.getDate()} de ${['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][d.getMonth()]} de ${d.getFullYear()}`
  })
  const [vigencia, setVigencia] = useState('12')
  const [domicilio, setDomicilio] = useState('')
  const [emailDestino, setEmailDestino] = useState('')
  const [modo, setModo] = useState<'enviar' | 'descargar'>('enviar')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token)
    })
  }, [])

  async function handleSubmit() {
    if (!empresa || !representante || !fecha || !emailDestino) {
      setError('Por favor completa todos los campos requeridos.'); return
    }
    setError(''); setStep('sending')

    if (modo === 'descargar') {
      const res = await fetch('/api/nda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ empresa, representante, fecha, vigencia, domicilio, email_destino: emailDestino, solo_descarga: true }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `NDA_${empresa.replace(/\s+/g, '_')}.docx`; a.click()
        URL.revokeObjectURL(url)
        setStep('done')
      } else {
        setError('Error al generar el documento.'); setStep('form')
      }
      return
    }

    const res = await fetch('/api/nda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ empresa, representante, fecha, vigencia, domicilio, email_destino: emailDestino }),
    })
    const data = await res.json()
    if (res.ok) setStep('done')
    else { setError(data.error || 'Error al enviar.'); setStep('form') }
  }

  function reset() {
    setStep('form'); setEmpresa(''); setRepresentante('')
    setDomicilio(''); setEmailDestino(''); setError('')
  }

  const inputStyle = { ...sharedStyles.input, width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { ...sharedStyles.label }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: cl.fontFamily }}>
      {/* Header */}
      <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '0 2rem', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '20px' }} />
          <span style={{ color: cl.gray300 }}>/</span>
          <a href="/gate" style={{ color: cl.gray400, fontSize: '0.8rem', fontWeight: '500', textDecoration: 'none' }}>Compliance Hub</a>
          <span style={{ color: cl.gray300 }}>/</span>
          <span style={{ color: cl.gray800, fontSize: '0.8rem', fontWeight: '600' }}>NDAs</span>
        </div>
        <a href="/gate" style={{ color: cl.gray400, fontSize: '0.78rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Volver al Hub
        </a>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* Title */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0D9488' }} />
            <span style={{ color: cl.gray400, fontSize: '0.67rem', fontWeight: '700', letterSpacing: '0.09em' }}>CONVENIOS DE CONFIDENCIALIDAD</span>
          </div>
          <h1 style={{ color: cl.gray900, fontSize: '1.55rem', fontWeight: '800', margin: '0 0 0.2rem', letterSpacing: '-0.02em' }}>Generar NDA</h1>
          <p style={{ color: cl.gray400, fontSize: '0.83rem', margin: 0 }}>Completa los datos de la contraparte para generar y enviar el Convenio de Confidencialidad.</p>
        </div>

        {step === 'done' ? (
          <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '16px', padding: '3rem', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 style={{ color: cl.gray900, fontSize: '1.2rem', fontWeight: '700', margin: '0 0 0.5rem' }}>
              {modo === 'enviar' ? '¡NDA enviado!' : '¡NDA descargado!'}
            </h2>
            <p style={{ color: cl.gray500, fontSize: '0.88rem', margin: '0 0 1.75rem' }}>
              {modo === 'enviar'
                ? `El Convenio de Confidencialidad fue enviado a ${emailDestino}. Una copia llegó a luis@crowdlink.mx.`
                : `El archivo Word fue descargado exitosamente.`}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={reset} style={{ ...sharedStyles.btnPrimary, fontSize: '0.85rem' }}>Generar otro NDA</button>
              <a href="/gate" style={{ ...sharedStyles.btnGhost, fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Volver al Hub</a>
            </div>
          </div>
        ) : (
          <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '16px', overflow: 'hidden' }}>
            {/* Modo toggle */}
            <div style={{ padding: '1.25rem 1.75rem', borderBottom: `1px solid ${cl.gray100}`, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ color: cl.gray500, fontSize: '0.8rem', fontWeight: '600', marginRight: '0.5rem' }}>Acción:</span>
              {(['enviar', 'descargar'] as const).map(m => (
                <button key={m} onClick={() => setModo(m)}
                  style={{ background: modo === m ? '#0D9488' : cl.gray100, color: modo === m ? '#fff' : cl.gray600, border: 'none', borderRadius: '7px', padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: modo === m ? '600' : '400', cursor: 'pointer', fontFamily: cl.fontFamily, transition: 'all 0.15s' }}>
                  {m === 'enviar' ? '✉ Enviar por email' : '⬇ Solo descargar Word'}
                </button>
              ))}
            </div>

            <div style={{ padding: '1.75rem' }}>
              {/* Parte reveladora (fixed) */}
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                <p style={{ color: '#1E40AF', fontSize: '0.7rem', fontWeight: '700', margin: '0 0 0.3rem', letterSpacing: '0.06em' }}>PARTE REVELADORA (FIJA)</p>
                <p style={{ color: '#1E293B', fontSize: '0.88rem', fontWeight: '600', margin: '0 0 0.1rem' }}>PorCuanto S.A. de C.V., Institución de Financiamiento Colectivo</p>
                <p style={{ color: '#64748B', fontSize: '0.78rem', margin: 0 }}>Rep.: Luis Armando Álvarez Zapfe · luis@crowdlink.mx</p>
              </div>

              {/* Form */}
              <div style={{ display: 'grid', gap: '1.1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Empresa receptora *</label>
                    <input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Nombre o Razón Social" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Representante legal *</label>
                    <input value={representante} onChange={e => setRepresentante(e.target.value)} placeholder="Nombre completo" style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Fecha del convenio *</label>
                    <input value={fecha} onChange={e => setFecha(e.target.value)} placeholder="15 de abril de 2026" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Vigencia (meses)</label>
                    <select value={vigencia} onChange={e => setVigencia(e.target.value)} style={{ ...inputStyle, appearance: 'auto' }}>
                      <option value="6">6 meses</option>
                      <option value="12">12 meses</option>
                      <option value="24">24 meses</option>
                      <option value="36">36 meses</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Domicilio de la parte receptora</label>
                  <input value={domicilio} onChange={e => setDomicilio(e.target.value)} placeholder="Calle, Colonia, CP, Ciudad" style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Email de envío *</label>
                  <input value={emailDestino} onChange={e => setEmailDestino(e.target.value)} placeholder="contacto@empresa.com" type="email" style={inputStyle} />
                  {modo === 'enviar' && <p style={{ color: cl.gray400, fontSize: '0.72rem', margin: '0.3rem 0 0' }}>Se enviará el Word adjunto a este email. Copia a luis@crowdlink.mx.</p>}
                </div>

                {error && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.7rem 1rem' }}>
                    <p style={{ color: '#DC2626', fontSize: '0.82rem', margin: 0 }}>{error}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
                  <button onClick={handleSubmit} disabled={step === 'sending'}
                    style={{ ...sharedStyles.btnPrimary, background: '#0D9488', fontSize: '0.85rem', opacity: step === 'sending' ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {step === 'sending' ? 'Generando…' : modo === 'enviar' ? 'Generar y enviar NDA' : 'Generar y descargar NDA'}
                  </button>
                  <a href="/gate" style={{ ...sharedStyles.btnGhost, fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Cancelar</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
