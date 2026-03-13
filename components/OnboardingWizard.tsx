'use client'
import { useState } from 'react'

const STEPS = [
  { id: 1, label: 'Datos Generales' },
  { id: 2, label: 'Representante Legal' },
  { id: 3, label: 'Documentos' },
  { id: 4, label: 'Score Crediticio' },
]

interface FormData {
  razon_social: string
  rfc: string
  tipo_persona: 'moral' | 'fisica'
  giro: string
  pais: string
  rep_legal_nombre: string
  rep_legal_curp: string
  acta_constitutiva_url: string
  comprobante_domicilio_url: string
  identificacion_rep_url: string
}

export default function OnboardingWizard({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState<{ id: string; status: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>({
    razon_social: '', rfc: '', tipo_persona: 'moral', giro: '', pais: 'MX',
    rep_legal_nombre: '', rep_legal_curp: '',
    acta_constitutiva_url: '', comprobante_domicilio_url: '', identificacion_rep_url: '',
  })

  const update = (k: keyof FormData, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/kyc/empresas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cl_api_key') || ''}`,
        },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al registrar')
      setSubmitted({ id: data.empresa.id, status: data.empresa.status })
      setStep(5)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    }
    setLoading(false)
  }

  const s = styles

  return (
    <div style={s.container}>
      <div style={s.grid} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '700px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
          <button onClick={onBack} style={s.backBtn}>← HUB</button>
          <div>
            <h2 style={s.title}>Onboarding Empresas</h2>
            <p style={s.subtitle}>KYC · SCORE CREDITICIO · EKATENA</p>
          </div>
        </div>

        {/* Progress */}
        {step <= 4 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem' }}>
            {STEPS.map(s => (
              <div key={s.id} style={{ flex: 1 }}>
                <div style={{
                  height: '3px', borderRadius: '2px',
                  background: step >= s.id ? '#00FF88' : 'rgba(255,255,255,0.08)',
                  transition: 'background 0.3s',
                }} />
                <div style={{
                  color: step >= s.id ? '#00FF88' : '#2D3748',
                  fontSize: '0.65rem', letterSpacing: '0.08em', marginTop: '0.4rem',
                }}>
                  {s.id}. {s.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>Datos Generales de la Empresa</h3>
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              <div>
                <label style={s.label}>Razón Social *</label>
                <input style={s.input} placeholder="Empresa SA de CV" value={form.razon_social} onChange={e => update('razon_social', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={s.label}>RFC *</label>
                  <input style={s.input} placeholder="EMP920101ABC" value={form.rfc} onChange={e => update('rfc', e.target.value.toUpperCase())} />
                </div>
                <div>
                  <label style={s.label}>Tipo Persona *</label>
                  <select style={s.input} value={form.tipo_persona} onChange={e => update('tipo_persona', e.target.value as 'moral' | 'fisica')}>
                    <option value="moral">Persona Moral</option>
                    <option value="fisica">Persona Física</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={s.label}>Giro / Sector</label>
                  <input style={s.input} placeholder="Fintech, Inmobiliaria..." value={form.giro} onChange={e => update('giro', e.target.value)} />
                </div>
                <div>
                  <label style={s.label}>País</label>
                  <select style={s.input} value={form.pais} onChange={e => update('pais', e.target.value)}>
                    <option value="MX">México</option>
                    <option value="US">Estados Unidos</option>
                    <option value="CO">Colombia</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setStep(2)}
                disabled={!form.razon_social || !form.rfc}
                style={{ ...s.primaryBtn, opacity: !form.razon_social || !form.rfc ? 0.4 : 1 }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>Representante Legal</h3>
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              <div>
                <label style={s.label}>Nombre completo del representante</label>
                <input style={s.input} placeholder="Juan García López" value={form.rep_legal_nombre} onChange={e => update('rep_legal_nombre', e.target.value)} />
              </div>
              <div>
                <label style={s.label}>CURP del representante</label>
                <input style={s.input} placeholder="GALJ900101HMCRCN01" value={form.rep_legal_curp} onChange={e => update('rep_legal_curp', e.target.value.toUpperCase())} />
              </div>
              <div style={{
                background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.1)',
                borderRadius: '8px', padding: '0.75rem 1rem',
              }}>
                <p style={{ color: '#4A5568', fontSize: '0.75rem', margin: 0, lineHeight: 1.6 }}>
                  El KYC de persona física del representante se valida desde la plataforma Crowdlink principal. Aquí solo registramos sus datos para vinculación.
                </p>
              </div>
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(1)} style={s.secondaryBtn}>← Anterior</button>
              <button onClick={() => setStep(3)} style={s.primaryBtn}>Siguiente →</button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>Documentos</h3>
            <p style={{ color: '#4A5568', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
              URLs de documentos subidos a storage (Supabase Storage o S3). Opcional por ahora.
            </p>
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {[
                { key: 'acta_constitutiva_url', label: 'Acta Constitutiva', placeholder: 'https://storage.../acta.pdf' },
                { key: 'comprobante_domicilio_url', label: 'Comprobante de Domicilio', placeholder: 'https://storage.../domicilio.pdf' },
                { key: 'identificacion_rep_url', label: 'Identificación del Representante', placeholder: 'https://storage.../id.pdf' },
              ].map(field => (
                <div key={field.key}>
                  <label style={s.label}>{field.label}</label>
                  <input
                    style={s.input}
                    placeholder={field.placeholder}
                    value={form[field.key as keyof FormData]}
                    onChange={e => update(field.key as keyof FormData, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(2)} style={s.secondaryBtn}>← Anterior</button>
              <button onClick={() => setStep(4)} style={s.primaryBtn}>Siguiente →</button>
            </div>
          </div>
        )}

        {/* STEP 4 - Score preview */}
        {step === 4 && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>Score Crediticio</h3>
            <div style={{
              border: '1px dashed rgba(0,255,136,0.2)', borderRadius: '12px',
              padding: '2rem', textAlign: 'center', marginBottom: '1.5rem',
            }}>
              <div style={{ color: '#4A5568', fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                INTEGRACIÓN EKATENA
              </div>
              <div style={{ fontSize: '3rem', color: '#2D3748', margin: '1rem 0' }}>—</div>
              <div style={{ color: '#2D3748', fontSize: '0.8rem' }}>
                El score se calculará automáticamente al conectar Ekatena.<br />
                El RFC y datos de la empresa se enviarán al API de scoring.
              </div>
            </div>

            {/* Resumen */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ color: '#4A5568', fontSize: '0.7rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>RESUMEN</div>
              {[
                { label: 'Razón Social', value: form.razon_social },
                { label: 'RFC', value: form.rfc },
                { label: 'Tipo', value: form.tipo_persona },
                { label: 'Giro', value: form.giro || '—' },
                { label: 'Rep. Legal', value: form.rep_legal_nombre || '—' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: '#4A5568', fontSize: '0.8rem' }}>{row.label}</span>
                  <span style={{ color: '#F0F0F0', fontSize: '0.8rem' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {error && (
              <div style={{ color: '#FF6060', fontSize: '0.8rem', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255,50,50,0.08)', borderRadius: '8px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(3)} style={s.secondaryBtn}>← Anterior</button>
              <button onClick={handleSubmit} disabled={loading} style={{ ...s.primaryBtn, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Registrando...' : '→ Enviar KYC'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5 - Success */}
        {step === 5 && submitted && (
          <div style={{ ...s.card, textAlign: 'center', padding: '3rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.2rem' }}>✓</div>
            <div style={{ color: '#00FF88', fontSize: '1rem', marginBottom: '0.5rem' }}>Empresa registrada</div>
            <div style={{ color: '#4A5568', fontSize: '0.8rem', marginBottom: '0.25rem' }}>ID: {submitted.id}</div>
            <div style={{ color: '#4A5568', fontSize: '0.8rem', marginBottom: '2rem' }}>Status: {submitted.status}</div>
            <button onClick={onBack} style={s.primaryBtn}>← Volver al Hub</button>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh', background: '#0A0C10',
    fontFamily: "'DM Mono', 'Fira Code', monospace",
    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem',
  },
  grid: {
    position: 'fixed', inset: 0, zIndex: 0,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  },
  backBtn: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
    color: '#4A5568', padding: '0.4rem 0.8rem', borderRadius: '6px',
    cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.1em', fontFamily: 'inherit',
  },
  title: { color: '#F0F0F0', fontSize: '1.4rem', fontWeight: '400', margin: 0 },
  subtitle: { color: '#4A5568', fontSize: '0.7rem', letterSpacing: '0.15em', margin: '0.25rem 0 0' },
  card: {
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', padding: '2rem',
  },
  cardTitle: { color: '#F0F0F0', fontSize: '1rem', fontWeight: '400', margin: '0 0 1.5rem', letterSpacing: '0.05em' },
  label: { color: '#4A5568', fontSize: '0.7rem', letterSpacing: '0.1em', display: 'block', marginBottom: '0.4rem' },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px', padding: '0.75rem 1rem', color: '#F0F0F0', fontSize: '0.85rem',
    fontFamily: "'DM Mono', monospace", outline: 'none',
  },
  primaryBtn: {
    background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)',
    color: '#00FF88', padding: '0.75rem 1.5rem', borderRadius: '8px',
    cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '0.1em', fontFamily: "'DM Mono', monospace",
  },
  secondaryBtn: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
    color: '#4A5568', padding: '0.75rem 1.5rem', borderRadius: '8px',
    cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '0.1em', fontFamily: "'DM Mono', monospace",
  },
}
