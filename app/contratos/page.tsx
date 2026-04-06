'use client'
import { useState, useEffect, useRef } from 'react'
import { cl, sharedStyles } from '@/lib/design'

interface Template {
  id: string; nombre: string; descripcion: string | null
  file_name: string; variables: string[]; created_at: string
}
interface Instancia {
  id: string; template_id: string; nombre_cliente: string; email_cliente: string
  razon_social: string | null; rfc: string | null
  modo: 'wizard_interno' | 'link_cliente'
  status: 'borrador' | 'enviado' | 'completado' | 'generado'
  created_at: string; contratos_templates?: { nombre: string; file_name: string }
}
type View = 'dashboard' | 'upload' | 'nueva_instancia' | 'wizard_interno'

const statusStyle: Record<string, { color: string; bg: string; label: string }> = {
  borrador:   { color: '#92400E', bg: '#FFFBEB', label: 'Borrador' },
  enviado:    { color: '#1D4ED8', bg: '#EFF6FF', label: 'Enviado' },
  completado: { color: '#065F46', bg: '#ECFDF5', label: 'Completado' },
  generado:   { color: '#6D28D9', bg: '#F5F3FF', label: 'Generado' },
}

const WIZARD_STEPS = [
  {
    title: 'Datos de la empresa', subtitle: 'Información legal del solicitante',
    fields: [
      { key: 'RAZON_SOCIAL', label: 'Razón Social', placeholder: 'Empresa ABC, S.A. de C.V.' },
      { key: 'RFC', label: 'RFC', placeholder: 'EAB200101ABC' },
      { key: 'ESCRITURA_NUMERO', label: 'No. Escritura Pública', placeholder: '12,345' },
      { key: 'ESCRITURA_FECHA', label: 'Fecha de Escritura', placeholder: '15 de enero de 2020' },
      { key: 'NOTARIO_NOMBRE', label: 'Nombre del Notario', placeholder: 'Juan Pérez García' },
      { key: 'NOTARIA_NUMERO', label: 'No. de Notaría', placeholder: '42' },
      { key: 'NOTARIA_LOCALIDAD', label: 'Localidad de la Notaría', placeholder: 'Ciudad de México' },
      { key: 'FOLIO_MERCANTIL', label: 'Folio Mercantil', placeholder: 'N-2024001234' },
      { key: 'REP_LEGAL_NOMBRE', label: 'Nombre del Representante Legal', placeholder: 'María González López' },
      { key: 'ESCRITURA_PODER_NUMERO', label: 'No. Escritura de Poder', placeholder: '67,890' },
      { key: 'ESCRITURA_PODER_FECHA', label: 'Fecha del Poder', placeholder: '1 de marzo de 2022' },
      { key: 'DOMICILIO', label: 'Domicilio', placeholder: 'Av. Reforma 123, Col. Juárez, CP 06600, CDMX', wide: true },
      { key: 'EMAIL_CLIENTE', label: 'Correo electrónico', placeholder: 'legal@empresa.com' },
    ]
  },
  {
    title: 'Condiciones del crédito', subtitle: 'Términos financieros del contrato',
    fields: [
      { key: 'MONTO_CREDITO', label: 'Monto del crédito', placeholder: '500,000.00' },
      { key: 'MONTO_TOTAL_PAGAR', label: 'Monto total a pagar', placeholder: '575,000.00' },
      { key: 'TASA_ORDINARIA', label: 'Tasa ordinaria anual (%)', placeholder: '24' },
      { key: 'TASA_MORATORIA', label: 'Tasa moratoria anual (%)', placeholder: '48' },
      { key: 'CAT', label: 'CAT (%)', placeholder: '31.5' },
      { key: 'PLAZO', label: 'Plazo del crédito', placeholder: '12 meses' },
      { key: 'FECHA_LIMITE_PAGO', label: 'Fecha límite de pago', placeholder: '15 de cada mes' },
      { key: 'FECHA_CORTE', label: 'Fecha de corte', placeholder: '10 de cada mes' },
      { key: 'TIPO_GARANTIA', label: 'Tipo de Garantía', placeholder: 'Sin garantía', type: 'select',
        options: ['Sin garantía', 'Garantía hipotecaria'] },
      { key: 'MONTO_GARANTIA', label: 'Monto de Garantía', placeholder: '0.00' },
      { key: 'DESTINO_CREDITO', label: 'Destino del crédito', placeholder: 'Capital de trabajo', wide: true },
    ]
  },
  {
    title: 'Datos bancarios y firma', subtitle: 'Cuenta de dispersión y fecha de firma',
    fields: [
      { key: 'BANCO', label: 'Institución bancaria', placeholder: 'BBVA México' },
      { key: 'NUMERO_CUENTA', label: 'Número de cuenta', placeholder: '0123456789' },
      { key: 'CLABE', label: 'CLABE interbancaria', placeholder: '012180001234567891' },
      { key: 'BANCO_PAGO', label: 'Banco para pagos (SPEI)', placeholder: 'BBVA México' },
      { key: 'CUENTA_PAGO', label: 'Cuenta para pagos', placeholder: '0987654321' },
      { key: 'CLABE_PAGO', label: 'CLABE para pagos', placeholder: '012180009876543210' },
      { key: 'CIUDAD_FIRMA', label: 'Ciudad de firma', placeholder: 'Ciudad de México' },
      { key: 'DIA_FIRMA', label: 'Día', placeholder: '6' },
      { key: 'MES_FIRMA', label: 'Mes', placeholder: 'abril' },
      { key: 'ANIO_FIRMA', label: 'Año', placeholder: '2026' },
    ]
  }
]

export default function ContratosPage() {
  const [view, setView] = useState<View>('dashboard')
  const [templates, setTemplates] = useState<Template[]>([])
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [loading, setLoading] = useState(true)
  const [activeInstancia, setActiveInstancia] = useState<Instancia | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [tRes, iRes] = await Promise.all([
      fetch('/api/contratos/templates'),
      fetch('/api/contratos/instancias'),
    ])
    if (tRes.ok) { const d = await tRes.json(); setTemplates(d.templates || []) }
    if (iRes.ok) { const d = await iRes.json(); setInstancias(d.instancias || []) }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: cl.gray50, fontFamily: cl.fontFamily }}>
      <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '0 2rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '22px', width: 'auto' }} />
          <div style={{ width: '1px', height: '18px', background: cl.gray200 }} />
          <a href="/gate" style={{ color: cl.gray400, fontSize: '0.82rem', fontWeight: '500', textDecoration: 'none' }}>Compliance Hub</a>
          <span style={{ color: cl.gray300 }}>/</span>
          <span style={{ color: '#0891B2', fontSize: '0.82rem', fontWeight: '600' }}>Contratos</span>
        </div>
        {view !== 'dashboard' && (
          <button onClick={() => { setView('dashboard'); setActiveInstancia(null) }}
            style={{ ...sharedStyles.btnGhost, fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
            ← Volver
          </button>
        )}
      </div>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>
        {view === 'dashboard' && (
          <Dashboard templates={templates} instancias={instancias} loading={loading}
            onUpload={() => setView('upload')}
            onNuevaInstancia={() => setView('nueva_instancia')}
            onOpenWizard={(inst) => { setActiveInstancia(inst); setView('wizard_interno') }}
            onRefresh={loadData} />
        )}
        {view === 'upload' && <UploadTemplate onDone={() => { loadData(); setView('dashboard') }} />}
        {view === 'nueva_instancia' && (
          <NuevaInstancia templates={templates} onDone={(inst) => {
            loadData()
            if (inst.modo === 'wizard_interno') { setActiveInstancia(inst); setView('wizard_interno') }
            else setView('dashboard')
          }} />
        )}
        {view === 'wizard_interno' && activeInstancia && (
          <WizardInterno instancia={activeInstancia} onDone={() => { loadData(); setView('dashboard') }} />
        )}
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
    </div>
  )
}

function Dashboard({ templates, instancias, loading, onUpload, onNuevaInstancia, onOpenWizard, onRefresh }: {
  templates: Template[]; instancias: Instancia[]; loading: boolean
  onUpload: () => void; onNuevaInstancia: () => void
  onOpenWizard: (i: Instancia) => void; onRefresh: () => void
}) {
  const [generando, setGenerando] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  async function handleGenerar(instancia: Instancia) {
    setGenerando(instancia.id)
    const res = await fetch('/api/contratos/generar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instancia_id: instancia.id }),
    })
    const data = await res.json()
    setGenerando(null)
    if (data.download_url) { window.open(data.download_url, '_blank'); onRefresh() }
    else alert('Error: ' + (data.error || 'desconocido'))
  }

  async function handleEnviarEmail(instancia: Instancia) {
    const res = await fetch('/api/contratos/enviar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instancia_id: instancia.id }),
    })
    const data = await res.json()
    if (data.ok) alert(`✓ Email enviado a ${instancia.email_cliente}`)
    else alert('Error: ' + data.error)
  }

  async function handleCopiarLink(instancia: Instancia) {
    const res = await fetch(`/api/contratos/instancias/${instancia.id}`)
    const data = await res.json()
    const token = data.instancia?.token
    if (!token) return
    navigator.clipboard.writeText(`${window.location.origin}/contratos/fill/${token}`)
    setCopiado(instancia.id)
    setTimeout(() => setCopiado(null), 2000)
  }

  const pendientes = instancias.filter(i => i.status !== 'generado').length
  const generados = instancias.filter(i => i.status === 'generado').length

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3EE8A0' }} />
          <span style={{ color: '#0891B2', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.06em' }}>MÓDULO CONTRATOS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ color: cl.gray900, fontSize: '1.75rem', fontWeight: '800', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>Contratos de Adhesión</h1>
            <p style={{ color: cl.gray500, fontSize: '0.9rem', margin: 0 }}>Gestiona y genera contratos personalizados</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onUpload} style={{ ...sharedStyles.btnGhost, fontSize: '0.85rem' }}>↑ Subir machote</button>
            <button onClick={onNuevaInstancia} style={{ ...sharedStyles.btnPrimary, background: '#0891B2', fontSize: '0.85rem' }}>+ Nuevo contrato</button>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Templates', val: templates.length, color: '#0891B2', bg: '#ECFEFF' },
          { label: 'Total contratos', val: instancias.length, color: cl.blue, bg: cl.blueLight },
          { label: 'Pendientes', val: pendientes, color: '#D97706', bg: '#FFFBEB' },
          { label: 'Generados', val: generados, color: '#059669', bg: '#ECFDF5' },
        ].map(s => (
          <div key={s.label} style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '12px', padding: '1.25rem 1.5rem' }}>
            <p style={{ color: cl.gray500, fontSize: '0.78rem', fontWeight: '500', margin: '0 0 0.35rem' }}>{s.label}</p>
            <p style={{ color: s.color, fontSize: '1.8rem', fontWeight: '800', margin: 0 }}>{loading ? '—' : s.val}</p>
          </div>
        ))}
      </div>
      <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '14px', marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${cl.gray100}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: cl.gray800, fontSize: '0.95rem', fontWeight: '700', margin: 0 }}>Templates disponibles</h2>
          <span style={{ color: cl.gray400, fontSize: '0.8rem' }}>{templates.length} archivo{templates.length !== 1 ? 's' : ''}</span>
        </div>
        {loading ? <div style={{ padding: '2rem', textAlign: 'center', color: cl.gray400 }}>Cargando…</div>
        : templates.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: cl.gray400, fontSize: '0.9rem', margin: '0 0 1rem' }}>No hay templates todavía</p>
            <button onClick={onUpload} style={{ ...sharedStyles.btnPrimary, background: '#0891B2', fontSize: '0.85rem' }}>Subir primer machote</button>
          </div>
        ) : (
          <div style={{ padding: '0.5rem 0' }}>
            {templates.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '0.9rem 1.5rem', borderBottom: `1px solid ${cl.gray50}` }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ECFEFF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '0.9rem', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0891B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: cl.gray800, fontWeight: '600', fontSize: '0.88rem', margin: '0 0 0.15rem' }}>{t.nombre}</p>
                  <p style={{ color: cl.gray400, fontSize: '0.75rem', margin: 0 }}>{t.file_name} · {t.variables.length} variables</p>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginLeft: '1rem' }}>
                  {t.variables.slice(0, 4).map(v => (
                    <span key={v} style={{ background: '#ECFEFF', color: '#0891B2', fontSize: '0.65rem', fontWeight: '600', padding: '0.15rem 0.45rem', borderRadius: '5px' }}>{v}</span>
                  ))}
                  {t.variables.length > 4 && <span style={{ background: cl.gray100, color: cl.gray500, fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: '5px' }}>+{t.variables.length - 4}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${cl.gray100}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: cl.gray800, fontSize: '0.95rem', fontWeight: '700', margin: 0 }}>Contratos</h2>
          <span style={{ color: cl.gray400, fontSize: '0.8rem' }}>{instancias.length} total</span>
        </div>
        {loading ? <div style={{ padding: '2rem', textAlign: 'center', color: cl.gray400 }}>Cargando…</div>
        : instancias.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: cl.gray400, fontSize: '0.9rem', margin: '0 0 1rem' }}>Aún no hay contratos generados</p>
            <button onClick={onNuevaInstancia} style={{ ...sharedStyles.btnPrimary, background: '#0891B2', fontSize: '0.85rem' }}>Crear primer contrato</button>
          </div>
        ) : (
          <div>
            {instancias.map(inst => {
              const st = statusStyle[inst.status]
              return (
                <div key={inst.id} style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: `1px solid ${cl.gray50}`, gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                      <p style={{ color: cl.gray800, fontWeight: '600', fontSize: '0.88rem', margin: 0 }}>{inst.nombre_cliente}</p>
                      <span style={{ background: st.bg, color: st.color, fontSize: '0.65rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '5px' }}>{st.label.toUpperCase()}</span>
                      <span style={{ background: cl.gray100, color: cl.gray500, fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '5px' }}>{inst.modo === 'wizard_interno' ? 'Wizard' : 'Link cliente'}</span>
                    </div>
                    <p style={{ color: cl.gray400, fontSize: '0.75rem', margin: 0 }}>
                      {inst.email_cliente} · {inst.contratos_templates?.nombre || '—'} · {new Date(inst.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    {inst.modo === 'wizard_interno' && inst.status !== 'generado' && (
                      <button onClick={() => onOpenWizard(inst)} style={{ background: '#ECFEFF', color: '#0891B2', border: '1px solid #A5F3FC', borderRadius: '7px', padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>✏️ Llenar</button>
                    )}
                    {inst.modo === 'link_cliente' && inst.status !== 'generado' && (
                      <>
                        <button onClick={() => handleCopiarLink(inst)} style={{ background: cl.gray100, color: cl.gray600, border: `1px solid ${cl.gray200}`, borderRadius: '7px', padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>
                          {copiado === inst.id ? '✓ Copiado' : '🔗 Copiar link'}
                        </button>
                        <button onClick={() => handleEnviarEmail(inst)} style={{ background: cl.blueLight, color: cl.blue, border: `1px solid #BFDBFE`, borderRadius: '7px', padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>✉️ Enviar email</button>
                      </>
                    )}
                    {(inst.status === 'borrador' || inst.status === 'completado') && (
                      <button onClick={() => handleGenerar(inst)} disabled={generando === inst.id} style={{ background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE', borderRadius: '7px', padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', opacity: generando === inst.id ? 0.6 : 1 }}>
                        {generando === inst.id ? '⏳ Generando…' : '⬇ Generar Word'}
                      </button>
                    )}
                    {inst.status === 'generado' && (
                      <button onClick={() => handleGenerar(inst)} style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', borderRadius: '7px', padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>⬇ Descargar</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function UploadTemplate({ onDone }: { onDone: () => void }) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ variables: string[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit() {
    if (!file || !nombre) return
    setLoading(true)
    const fd = new FormData()
    fd.append('file', file); fd.append('nombre', nombre); fd.append('descripcion', descripcion)
    const res = await fetch('/api/contratos/templates/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setLoading(false)
    if (res.ok) setResult({ variables: data.template?.variables || [] })
    else alert('Error: ' + data.error)
  }

  if (result) return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '16px', padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ color: cl.gray900, fontSize: '1.2rem', fontWeight: '700', margin: '0 0 0.5rem' }}>Template subido correctamente</h2>
        <p style={{ color: cl.gray500, fontSize: '0.875rem', margin: '0 0 1.5rem' }}>Se detectaron <strong>{result.variables.length}</strong> variables</p>
        {result.variables.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
            {result.variables.map(v => <span key={v} style={{ background: '#ECFEFF', color: '#0891B2', fontSize: '0.72rem', fontWeight: '600', padding: '0.25rem 0.6rem', borderRadius: '6px', fontFamily: 'monospace' }}>{`{{${v}}}`}</span>)}
          </div>
        )}
        <button onClick={onDone} style={{ ...sharedStyles.btnPrimary, background: '#0891B2' }}>Ir al dashboard →</button>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <h2 style={{ color: cl.gray900, fontSize: '1.3rem', fontWeight: '700', margin: '0 0 1.5rem' }}>Subir machote Word</h2>
      <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '16px', padding: '2rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={sharedStyles.label}>Nombre del template *</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Contrato de Crédito Simple" style={sharedStyles.input} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={sharedStyles.label}>Descripción</label>
          <input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Para solicitantes sin garantía" style={sharedStyles.input} />
        </div>
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={sharedStyles.label}>Archivo Word (.docx) *</label>
          <div onClick={() => inputRef.current?.click()} style={{ border: `2px dashed ${file ? '#0891B2' : cl.gray200}`, borderRadius: '12px', padding: '2rem', textAlign: 'center', cursor: 'pointer', background: file ? '#ECFEFF' : cl.gray50 }}>
            <input ref={inputRef} type="file" accept=".docx" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
            {file ? <div><p style={{ color: '#0891B2', fontWeight: '600', fontSize: '0.88rem', margin: '0 0 0.25rem' }}>📄 {file.name}</p><p style={{ color: cl.gray400, fontSize: '0.75rem', margin: 0 }}>{(file.size / 1024).toFixed(0)} KB</p></div>
            : <div><p style={{ color: cl.gray500, fontSize: '0.88rem', margin: '0 0 0.25rem' }}>Arrastra o haz clic para seleccionar</p><p style={{ color: cl.gray400, fontSize: '0.75rem', margin: 0 }}>Solo archivos .docx</p></div>}
          </div>
        </div>
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '0.9rem 1.1rem', marginBottom: '1.75rem' }}>
          <p style={{ color: '#92400E', fontSize: '0.78rem', margin: 0, lineHeight: 1.6 }}>
            <strong>💡 Variables:</strong> Usa <code style={{ background: '#FEF3C7', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{'{{NOMBRE_VARIABLE}}'}</code> en tu Word para marcar los campos a llenar.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onDone} style={sharedStyles.btnGhost}>Cancelar</button>
          <button onClick={handleSubmit} disabled={!file || !nombre || loading} style={{ ...sharedStyles.btnPrimary, background: '#0891B2', opacity: (!file || !nombre || loading) ? 0.5 : 1 }}>
            {loading ? 'Subiendo…' : 'Subir template'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NuevaInstancia({ templates, onDone }: { templates: Template[]; onDone: (inst: Instancia) => void }) {
  const [templateId, setTemplateId] = useState(templates[0]?.id || '')
  const [nombreCliente, setNombreCliente] = useState('')
  const [emailCliente, setEmailCliente] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [rfc, setRfc] = useState('')
  const [modo, setModo] = useState<'wizard_interno' | 'link_cliente'>('wizard_interno')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!templateId || !nombreCliente || !emailCliente) return
    setLoading(true)
    const res = await fetch('/api/contratos/instancias', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: templateId, nombre_cliente: nombreCliente, email_cliente: emailCliente, razon_social: razonSocial, rfc, modo }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) onDone(data.instancia)
    else alert('Error: ' + data.error)
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <h2 style={{ color: cl.gray900, fontSize: '1.3rem', fontWeight: '700', margin: '0 0 1.5rem' }}>Nuevo contrato</h2>
      <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '16px', padding: '2rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={sharedStyles.label}>Template *</label>
          <select value={templateId} onChange={e => setTemplateId(e.target.value)} style={{ ...sharedStyles.input, appearance: 'auto' }}>
            {templates.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
          <div><label style={sharedStyles.label}>Nombre contacto *</label><input value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} placeholder="Ana Torres" style={sharedStyles.input} /></div>
          <div><label style={sharedStyles.label}>Email *</label><input value={emailCliente} onChange={e => setEmailCliente(e.target.value)} placeholder="ana@empresa.com" type="email" style={sharedStyles.input} /></div>
          <div><label style={sharedStyles.label}>Razón Social</label><input value={razonSocial} onChange={e => setRazonSocial(e.target.value)} placeholder="Empresa ABC S.A." style={sharedStyles.input} /></div>
          <div><label style={sharedStyles.label}>RFC</label><input value={rfc} onChange={e => setRfc(e.target.value)} placeholder="EAB200101ABC" style={sharedStyles.input} /></div>
        </div>
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={sharedStyles.label}>Modo de llenado *</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {([{ val: 'wizard_interno', title: 'Wizard interno', desc: 'Tú llenas los datos ahora' }, { val: 'link_cliente', title: 'Link al cliente', desc: 'El cliente llena por email' }] as const).map(opt => (
              <div key={opt.val} onClick={() => setModo(opt.val)} style={{ border: `2px solid ${modo === opt.val ? '#0891B2' : cl.gray200}`, borderRadius: '10px', padding: '0.9rem', cursor: 'pointer', background: modo === opt.val ? '#ECFEFF' : cl.white }}>
                <p style={{ color: modo === opt.val ? '#0891B2' : cl.gray700, fontWeight: '600', fontSize: '0.85rem', margin: '0 0 0.25rem' }}>{opt.title}</p>
                <p style={{ color: cl.gray400, fontSize: '0.75rem', margin: 0 }}>{opt.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={() => onDone({ id: '', template_id: '', nombre_cliente: '', email_cliente: '', razon_social: null, rfc: null, modo: 'wizard_interno', status: 'borrador', created_at: '' })} style={sharedStyles.btnGhost}>Cancelar</button>
          <button onClick={handleSubmit} disabled={!templateId || !nombreCliente || !emailCliente || loading} style={{ ...sharedStyles.btnPrimary, background: '#0891B2', opacity: (!templateId || !nombreCliente || !emailCliente || loading) ? 0.5 : 1 }}>
            {loading ? 'Creando…' : modo === 'wizard_interno' ? 'Crear y llenar →' : 'Crear y enviar →'}
          </button>
        </div>
      </div>
    </div>
  )
}

function WizardInterno({ instancia, onDone }: { instancia: Instancia; onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [datos, setDatos] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const currentStep = WIZARD_STEPS[step]
  const totalSteps = WIZARD_STEPS.length

  async function handleNext() {
    if (step < totalSteps - 1) { setStep(s => s + 1) } else { await handleGenerar() }
  }

  async function handleGenerar() {
    setGenerating(true)
    await fetch(`/api/contratos/instancias/${instancia.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ datos, status: 'completado' }) })
    const res = await fetch('/api/contratos/generar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instancia_id: instancia.id }) })
    const data = await res.json()
    setGenerating(false)
    if (data.download_url) { window.open(data.download_url, '_blank'); onDone() }
    else alert('Error: ' + (data.error || 'desconocido'))
  }

  async function handleSaveDraft() {
    setSaving(true)
    await fetch(`/api/contratos/instancias/${instancia.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ datos }) })
    setSaving(false)
  }

  const filledCount = Object.values(datos).filter(v => v.trim()).length
  const totalFields = WIZARD_STEPS.reduce((acc, s) => acc + s.fields.length, 0)

  return (
    <div style={{ maxWidth: '740px', margin: '0 auto' }}>
      <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '16px', padding: '1.75rem 2rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ color: cl.gray900, fontSize: '1.15rem', fontWeight: '700', margin: '0 0 0.25rem' }}>{instancia.nombre_cliente}</h2>
            <p style={{ color: cl.gray400, fontSize: '0.8rem', margin: 0 }}>{filledCount} de {totalFields} campos completados</p>
          </div>
          <button onClick={handleSaveDraft} disabled={saving} style={{ ...sharedStyles.btnGhost, fontSize: '0.78rem', opacity: saving ? 0.6 : 1 }}>{saving ? 'Guardando…' : '💾 Guardar borrador'}</button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {WIZARD_STEPS.map((s, i) => (
            <div key={i} onClick={() => setStep(i)} style={{ flex: 1, cursor: 'pointer' }}>
              <div style={{ height: '4px', borderRadius: '2px', background: i <= step ? '#0891B2' : cl.gray200 }} />
              <p style={{ color: i === step ? '#0891B2' : cl.gray400, fontSize: '0.72rem', fontWeight: i === step ? '600' : '400', margin: '0.4rem 0 0', textAlign: 'center' }}>{i + 1}. {s.title}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '16px', padding: '2rem', marginBottom: '1.25rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ color: cl.gray900, fontSize: '1.05rem', fontWeight: '700', margin: '0 0 0.25rem' }}>{currentStep.title}</h3>
          <p style={{ color: cl.gray400, fontSize: '0.82rem', margin: 0 }}>{currentStep.subtitle}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {currentStep.fields.map(field => (
            <div key={field.key} style={{ gridColumn: (field as { wide?: boolean }).wide ? '1 / -1' : 'auto' }}>
              <label style={sharedStyles.label}>{field.label}</label>
              {field.type === 'select' ? (
                <select value={datos[field.key] || ''} onChange={e => setDatos(p => ({ ...p, [field.key]: e.target.value }))} style={{ ...sharedStyles.input, appearance: 'auto' }}>
                  <option value="">Seleccionar…</option>
                  {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input value={datos[field.key] || ''} onChange={e => setDatos(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} style={sharedStyles.input} />
              )}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} style={{ ...sharedStyles.btnGhost, opacity: step === 0 ? 0.3 : 1 }}>← Anterior</button>
        <span style={{ color: cl.gray400, fontSize: '0.78rem' }}>Paso {step + 1} de {totalSteps}</span>
        <button onClick={handleNext} disabled={generating} style={{ ...sharedStyles.btnPrimary, background: step === totalSteps - 1 ? '#059669' : '#0891B2', opacity: generating ? 0.6 : 1 }}>
          {generating ? '⏳ Generando…' : step === totalSteps - 1 ? '⬇ Generar Word' : 'Siguiente →'}
        </button>
      </div>
    </div>
  )
}
