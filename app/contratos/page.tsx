'use client'
import { useState, useEffect, useRef } from 'react'
import { cl, sharedStyles } from '@/lib/design'

type TipoContrato = 'inv_deuda' | 'inv_capital' | 'sol_deuda_sin_garantia' | 'sol_deuda_con_garantia' | 'sol_capital'
type TipoPersona = 'pf' | 'pm'
type View = 'dashboard' | 'upload' | 'nueva_instancia' | 'wizard'

interface Template {
  id: string; nombre: string; descripcion: string | null
  file_name: string; variables: string[]; tipo_contrato: TipoContrato | null; created_at: string
}
interface Instancia {
  id: string; template_id: string; nombre_cliente: string; email_cliente: string
  razon_social: string | null; rfc: string | null
  modo: 'wizard_interno' | 'link_cliente'
  tipo_persona: TipoPersona | null
  status: 'borrador' | 'enviado' | 'completado' | 'generado'
  created_at: string; contratos_templates?: { nombre: string; tipo_contrato: TipoContrato | null }
}

const TIPO_CONFIG: Record<TipoContrato, { label: string; color: string; bg: string; producto: string; parte: string }> = {
  inv_deuda:              { label: 'Inversionista Deuda',           color: '#0891B2', bg: '#ECFEFF', producto: 'Crowdlending', parte: 'Inversionista' },
  inv_capital:            { label: 'Inversionista Capital',          color: '#7C3AED', bg: '#F5F3FF', producto: 'Crowd Equity', parte: 'Inversionista' },
  sol_deuda_sin_garantia: { label: 'Solicitante Deuda Sin Garantía', color: '#059669', bg: '#ECFDF5', producto: 'Crowdlending', parte: 'Sol. Sin Garantía' },
  sol_deuda_con_garantia: { label: 'Solicitante Deuda Con Garantía', color: '#D97706', bg: '#FFFBEB', producto: 'Crowdlending', parte: 'Sol. Con Garantía' },
  sol_capital:            { label: 'Solicitante Capital',            color: '#DC2626', bg: '#FEF2F2', producto: 'Crowd Equity', parte: 'Solicitante' },
}

const statusStyle: Record<string, { color: string; bg: string; label: string }> = {
  borrador:   { color: '#92400E', bg: '#FFFBEB', label: 'Borrador' },
  enviado:    { color: '#1D4ED8', bg: '#EFF6FF', label: 'Enviado' },
  completado: { color: '#065F46', bg: '#ECFDF5', label: 'Completado' },
  generado:   { color: '#6D28D9', bg: '#F5F3FF', label: 'Generado' },
}

const CAMPOS_PM = [
  { key: 'RAZON_SOCIAL',            label: 'Razón Social',                     placeholder: 'Empresa ABC, S.A. de C.V.',   wide: true },
  { key: 'RFC',                     label: 'RFC',                              placeholder: 'EAB200101ABC' },
  { key: 'ESCRITURA_NUMERO',        label: 'No. Escritura constitutiva',       placeholder: '12,345' },
  { key: 'ESCRITURA_FECHA',         label: 'Fecha escritura',                  placeholder: '15 de enero de 2020' },
  { key: 'NOTARIO_NOMBRE',          label: 'Nombre del Notario',               placeholder: 'Juan Pérez García',           wide: true },
  { key: 'NOTARIA_NUMERO',          label: 'No. de Notaría',                   placeholder: '42' },
  { key: 'NOTARIA_LOCALIDAD',       label: 'Localidad de la Notaría',          placeholder: 'Ciudad de México' },
  { key: 'FOLIO_MERCANTIL',         label: 'Folio mercantil',                  placeholder: 'N-2024001234' },
  { key: 'FOLIO_FECHA',             label: 'Fecha del folio',                  placeholder: '16 de abril de 2020' },
  { key: 'REP_LEGAL_NOMBRE',        label: 'Nombre del Representante Legal',   placeholder: 'María González López',        wide: true },
  { key: 'PODER_ESCRITURA_NUMERO',  label: 'No. Escritura de poder',           placeholder: '67,890' },
  { key: 'PODER_ESCRITURA_FECHA',   label: 'Fecha escritura de poder',         placeholder: '1 de marzo de 2022' },
  { key: 'PODER_NOTARIO_NOMBRE',    label: 'Notario del poder',                placeholder: 'Pedro López Ruiz',            wide: true },
  { key: 'PODER_NOTARIA_NUMERO',    label: 'No. Notaría del poder',            placeholder: '137' },
  { key: 'PODER_NOTARIA_LOCALIDAD', label: 'Localidad notaría del poder',      placeholder: 'Cuautitlán Izcalli' },
]
const CAMPOS_PF = [
  { key: 'NOMBRE_COMPLETO', label: 'Nombre completo', placeholder: 'Juan Pérez García', wide: true },
  { key: 'CURP',            label: 'CURP',            placeholder: 'PEGJ800101HDFRRL09' },
  { key: 'RFC',             label: 'RFC',             placeholder: 'PEGJ800101ABC' },
]
const CAMPOS_CONTACTO = [
  { key: 'DOMICILIO', label: 'Domicilio completo', placeholder: 'Av. Reforma 123, Col. Juárez, CP 06600, CDMX', wide: true },
  { key: 'EMAIL',     label: 'Correo electrónico', placeholder: 'contacto@empresa.com' },
]
const CAMPOS_CREDITO = [
  { key: 'MONTO_CREDITO',        label: 'Monto del crédito ($)',    placeholder: '500,000.00' },
  { key: 'TASA_ORDINARIA',       label: 'Tasa ordinaria anual (%)', placeholder: '24' },
  { key: 'TASA_ORDINARIA_TEXTO', label: 'Tasa en texto',           placeholder: 'veinticuatro', wide: true },
  { key: 'PLAZO',                label: 'Plazo',                    placeholder: '12 meses' },
  { key: 'MONTO_TOTAL_PAGAR',   label: 'Monto total a pagar ($)',  placeholder: '575,000.00' },
  { key: 'CAT',                  label: 'CAT (%)',                  placeholder: '31.5' },
  { key: 'FECHA_LIMITE_PAGO',   label: 'Fecha límite de pago',     placeholder: '15 de cada mes' },
  { key: 'FECHA_CORTE',         label: 'Fecha de corte',           placeholder: '10 de cada mes' },
]
const CAMPOS_GARANTIA = [
  { key: 'GARANTIA_DESCRIPCION', label: 'Descripción del bien',   placeholder: 'Casa habitación en Lomas de Chapultepec', wide: true },
  { key: 'GARANTIA_DOMICILIO',   label: 'Domicilio del bien',     placeholder: 'Calle X No. Y, Col. Z, CP 11000, CDMX',  wide: true },
  { key: 'GARANTIA_VALOR',       label: 'Valor del bien ($)',     placeholder: '3,000,000.00' },
]
const CAMPOS_BANCO_DISPERSION = [
  { key: 'BANCO_DISPERSION',  label: 'Banco (dispersión)',     placeholder: 'BBVA México', wide: true },
  { key: 'CUENTA_DISPERSION', label: 'Número de cuenta',      placeholder: '0123456789' },
  { key: 'CLABE_DISPERSION',  label: 'CLABE (18 dígitos)',    placeholder: '012180001234567891' },
]
const CAMPOS_BANCO_PAGO = [
  { key: 'BANCO_PAGO',  label: 'Banco SPEI Crowdlink', placeholder: 'BBVA México', wide: true },
  { key: 'CUENTA_PAGO', label: 'Cuenta para pagos',   placeholder: '0987654321' },
  { key: 'CLABE_PAGO',  label: 'CLABE para pagos',    placeholder: '012180009876543210' },
]
const CAMPOS_FIRMA = [
  { key: 'CIUDAD_FIRMA', label: 'Ciudad de firma', placeholder: 'Ciudad de México' },
  { key: 'DIA_FIRMA',   label: 'Día',              placeholder: '6' },
  { key: 'MES_FIRMA',   label: 'Mes',              placeholder: 'abril' },
  { key: 'ANIO_FIRMA',  label: 'Año',              placeholder: '2026' },
]

function getWizardSteps(tipo: TipoContrato, persona: TipoPersona | null) {
  const steps: { title: string; subtitle: string; fields: { key: string; label: string; placeholder: string; wide?: boolean }[] }[] = []
  const isInv = tipo === 'inv_deuda' || tipo === 'inv_capital'
  if (isInv && persona === 'pf') steps.push({ title: 'Datos personales', subtitle: 'Información del inversionista persona física', fields: CAMPOS_PF })
  else steps.push({ title: 'Datos de la empresa', subtitle: 'Información legal de la persona moral', fields: CAMPOS_PM })
  steps.push({ title: 'Contacto', subtitle: 'Domicilio y correo electrónico', fields: CAMPOS_CONTACTO })
  if (tipo === 'sol_deuda_sin_garantia' || tipo === 'sol_deuda_con_garantia') steps.push({ title: 'Condiciones del crédito', subtitle: 'Tasas, plazos y montos', fields: CAMPOS_CREDITO })
  if (tipo === 'sol_deuda_con_garantia') steps.push({ title: 'Garantía hipotecaria', subtitle: 'Datos del bien en garantía', fields: CAMPOS_GARANTIA })
  if (tipo === 'inv_deuda' || tipo === 'sol_deuda_sin_garantia' || tipo === 'sol_deuda_con_garantia') {
    steps.push({ title: 'Datos bancarios', subtitle: tipo === 'inv_deuda' ? 'Cuenta para recibir rendimientos' : 'Cuenta para recibir el crédito', fields: CAMPOS_BANCO_DISPERSION })
  }
  if (tipo === 'sol_deuda_sin_garantia' || tipo === 'sol_deuda_con_garantia') {
    steps.push({ title: 'Banco para pagos', subtitle: 'Cuenta SPEI de Crowdlink', fields: CAMPOS_BANCO_PAGO })
  }
  steps.push({ title: 'Fecha y lugar', subtitle: 'Ciudad y fecha de firma del contrato', fields: CAMPOS_FIRMA })
  return steps
}

export default function ContratosPage() {
  const [view, setView] = useState<View>('dashboard')
  const [templates, setTemplates] = useState<Template[]>([])
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [loading, setLoading] = useState(true)
  const [activeInstancia, setActiveInstancia] = useState<Instancia | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [tRes, iRes] = await Promise.all([fetch('/api/contratos/templates'), fetch('/api/contratos/instancias')])
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
          <button onClick={() => { setView('dashboard'); setActiveInstancia(null) }} style={{ ...sharedStyles.btnGhost, fontSize: '0.8rem', padding: '0.5rem 1rem' }}>← Volver</button>
        )}
      </div>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>
        {view === 'dashboard' && <Dashboard templates={templates} instancias={instancias} loading={loading} onUpload={() => setView('upload')} onNuevaInstancia={() => setView('nueva_instancia')} onOpenWizard={(inst) => { setActiveInstancia(inst); setView('wizard') }} onRefresh={loadData} />}
        {view === 'upload' && <UploadTemplate onDone={() => { loadData(); setView('dashboard') }} />}
        {view === 'nueva_instancia' && <NuevaInstancia templates={templates} onDone={(inst) => { loadData(); if (inst?.modo === 'wizard_interno') { setActiveInstancia(inst); setView('wizard') } else setView('dashboard') }} />}
        {view === 'wizard' && activeInstancia && <WizardContratos instancia={activeInstancia} onDone={() => { loadData(); setView('dashboard') }} />}
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
    </div>
  )
}

function Dashboard({ templates, instancias, loading, onUpload, onNuevaInstancia, onOpenWizard, onRefresh }: {
  templates: Template[]; instancias: Instancia[]; loading: boolean
  onUpload: () => void; onNuevaInstancia: () => void; onOpenWizard: (i: Instancia) => void; onRefresh: () => void
}) {
  const [generando, setGenerando] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  async function handleGenerar(instancia: Instancia) {
    setGenerando(instancia.id)
    const res = await fetch('/api/contratos/generar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instancia_id: instancia.id }) })
    const data = await res.json()
    setGenerando(null)
    if (data.download_url) { window.open(data.download_url, '_blank'); onRefresh() }
    else alert('Error: ' + (data.error || 'desconocido'))
  }

  async function handleEnviarEmail(instancia: Instancia) {
    const res = await fetch('/api/contratos/enviar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instancia_id: instancia.id }) })
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
    setCopiado(instancia.id); setTimeout(() => setCopiado(null), 2000)
  }

  async function handleBorrarTemplate(t: Template) {
    if (!confirm(`¿Borrar template "${t.nombre}"?`)) return
    await fetch(`/api/contratos/templates/${t.id}`, { method: 'DELETE' })
    onRefresh()
  }

  async function handleBorrarInstancia(inst: Instancia) {
    if (!confirm(`¿Eliminar contrato de "${inst.nombre_cliente}"?`)) return
    await fetch(`/api/contratos/instancias/${inst.id}`, { method: 'DELETE' })
    onRefresh()
  }

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
            <p style={{ color: cl.gray500, fontSize: '0.9rem', margin: 0 }}>Crowdlending y Crowd Equity</p>
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
          { label: 'Pendientes', val: instancias.filter(i => i.status !== 'generado').length, color: '#D97706', bg: '#FFFBEB' },
          { label: 'Generados', val: instancias.filter(i => i.status === 'generado').length, color: '#059669', bg: '#ECFDF5' },
        ].map(s => (
          <div key={s.label} style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '12px', padding: '1.25rem 1.5rem' }}>
            <p style={{ color: cl.gray500, fontSize: '0.78rem', fontWeight: '500', margin: '0 0 0.35rem' }}>{s.label}</p>
            <p style={{ color: s.color, fontSize: '1.8rem', fontWeight: '800', margin: 0 }}>{loading ? '—' : s.val}</p>
          </div>
        ))}
      </div>

      <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '14px', marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${cl.gray100}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: cl.gray800, fontSize: '0.95rem', fontWeight: '700', margin: 0 }}>Templates ({templates.length}/5)</h2>
          <button onClick={onUpload} style={{ background: '#ECFEFF', color: '#0891B2', border: '1px solid #A5F3FC', borderRadius: '7px', padding: '0.35rem 0.85rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>+ Subir</button>
        </div>
        {['Crowdlending', 'Crowd Equity'].map(producto => (
          <div key={producto}>
            <div style={{ padding: '0.5rem 1.5rem', background: cl.gray50, borderBottom: `1px solid ${cl.gray100}` }}>
              <span style={{ color: cl.gray500, fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.05em' }}>{producto.toUpperCase()}</span>
            </div>
            {Object.entries(TIPO_CONFIG).filter(([, c]) => c.producto === producto).map(([tipo, cfg]) => {
              const t = templates.find(tmpl => tmpl.tipo_contrato === tipo)
              return (
                <div key={tipo} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.5rem', borderBottom: `1px solid ${cl.gray50}` }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: t ? cfg.color : cl.gray300, marginRight: '0.85rem', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ color: t ? cl.gray800 : cl.gray400, fontWeight: t ? '600' : '400', fontSize: '0.85rem', margin: 0 }}>{cfg.label}</p>
                    {t && <p style={{ color: cl.gray400, fontSize: '0.7rem', margin: '0.1rem 0 0' }}>{t.variables.length} variables · {t.file_name}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: t ? cfg.bg : cl.gray100, color: t ? cfg.color : cl.gray400, fontSize: '0.65rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '5px' }}>
                      {t ? 'LISTO' : 'FALTA'}
                    </span>
                    {t && <button onClick={() => handleBorrarTemplate(t)} style={{ background: cl.dangerLight, color: cl.danger, border: '1px solid #FECACA', borderRadius: '6px', padding: '0.2rem 0.55rem', fontSize: '0.65rem', fontWeight: '600', cursor: 'pointer' }}>🗑 Borrar</button>}
                    {!t && <button onClick={onUpload} style={{ background: cl.gray100, color: cl.gray500, border: `1px solid ${cl.gray200}`, borderRadius: '6px', padding: '0.2rem 0.55rem', fontSize: '0.65rem', fontWeight: '600', cursor: 'pointer' }}>↑ Subir</button>}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${cl.gray100}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: cl.gray800, fontSize: '0.95rem', fontWeight: '700', margin: 0 }}>Contratos</h2>
          <button onClick={onNuevaInstancia} style={{ background: '#ECFEFF', color: '#0891B2', border: '1px solid #A5F3FC', borderRadius: '7px', padding: '0.35rem 0.85rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>+ Nuevo</button>
        </div>
        {loading ? <div style={{ padding: '2rem', textAlign: 'center', color: cl.gray400 }}>Cargando…</div>
        : instancias.length === 0 ? <div style={{ padding: '3rem', textAlign: 'center' }}><p style={{ color: cl.gray400, fontSize: '0.9rem', margin: 0 }}>Aún no hay contratos</p></div>
        : instancias.map(inst => {
          const st = statusStyle[inst.status]
          const tipo = inst.contratos_templates?.tipo_contrato
          const tipoCfg = tipo ? TIPO_CONFIG[tipo] : null
          return (
            <div key={inst.id} style={{ display: 'flex', alignItems: 'center', padding: '0.9rem 1.5rem', borderBottom: `1px solid ${cl.gray50}`, gap: '1rem' }}>
              {tipoCfg && <div style={{ width: '4px', height: '40px', borderRadius: '2px', background: tipoCfg.color, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                  <p style={{ color: cl.gray800, fontWeight: '600', fontSize: '0.88rem', margin: 0 }}>{inst.nombre_cliente}</p>
                  {inst.tipo_persona && <span style={{ background: cl.gray100, color: cl.gray500, fontSize: '0.6rem', fontWeight: '700', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{inst.tipo_persona.toUpperCase()}</span>}
                  <span style={{ background: st.bg, color: st.color, fontSize: '0.6rem', fontWeight: '700', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{st.label.toUpperCase()}</span>
                  {tipoCfg && <span style={{ background: tipoCfg.bg, color: tipoCfg.color, fontSize: '0.6rem', fontWeight: '600', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{tipoCfg.label}</span>}
                </div>
                <p style={{ color: cl.gray400, fontSize: '0.72rem', margin: 0 }}>{inst.email_cliente} · {new Date(inst.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                {inst.modo === 'wizard_interno' && inst.status !== 'generado' && (
                  <button onClick={() => onOpenWizard(inst)} style={{ background: '#ECFEFF', color: '#0891B2', border: '1px solid #A5F3FC', borderRadius: '7px', padding: '0.35rem 0.75rem', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }}>✏️ Llenar</button>
                )}
                {inst.modo === 'link_cliente' && inst.status !== 'generado' && (<>
                  <button onClick={() => handleCopiarLink(inst)} style={{ background: cl.gray100, color: cl.gray600, border: `1px solid ${cl.gray200}`, borderRadius: '7px', padding: '0.35rem 0.75rem', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }}>{copiado === inst.id ? '✓' : '🔗'}</button>
                  <button onClick={() => handleEnviarEmail(inst)} style={{ background: cl.blueLight, color: cl.blue, border: `1px solid #BFDBFE`, borderRadius: '7px', padding: '0.35rem 0.75rem', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }}>✉️</button>
                </>)}
                {(inst.status === 'borrador' || inst.status === 'completado') && (
                  <button onClick={() => handleGenerar(inst)} disabled={generando === inst.id} style={{ background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE', borderRadius: '7px', padding: '0.35rem 0.75rem', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer', opacity: generando === inst.id ? 0.6 : 1 }}>
                    {generando === inst.id ? '⏳' : '⬇ Word'}
                  </button>
                )}
                {inst.status === 'generado' && (
                  <button onClick={() => handleGenerar(inst)} style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', borderRadius: '7px', padding: '0.35rem 0.75rem', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }}>⬇ Descargar</button>
                )}
                <button onClick={() => handleBorrarInstancia(inst)} style={{ background: cl.dangerLight, color: cl.danger, border: '1px solid #FECACA', borderRadius: '7px', padding: '0.35rem 0.75rem', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }}>🗑</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function UploadTemplate({ onDone }: { onDone: () => void }) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoContrato | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ variables: string[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit() {
    if (!file || !nombre || !tipo) return
    setLoading(true)
    const fd = new FormData()
    fd.append('file', file); fd.append('nombre', nombre); fd.append('tipo_contrato', tipo)
    const res = await fetch('/api/contratos/templates/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setLoading(false)
    if (res.ok) setResult({ variables: data.template?.variables || [] })
    else alert('Error: ' + data.error)
  }

  if (result) return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>
      <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '16px', padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ color: cl.gray900, fontSize: '1.15rem', fontWeight: '700', margin: '0 0 0.5rem' }}>Template subido</h2>
        <p style={{ color: cl.gray500, fontSize: '0.875rem', margin: '0 0 1.25rem' }}>{result.variables.length} variables detectadas</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
          {result.variables.map(v => <span key={v} style={{ background: '#ECFEFF', color: '#0891B2', fontSize: '0.7rem', fontWeight: '600', padding: '0.2rem 0.5rem', borderRadius: '5px', fontFamily: 'monospace' }}>{`{{${v}}}`}</span>)}
        </div>
        <button onClick={onDone} style={{ ...sharedStyles.btnPrimary, background: '#0891B2' }}>Ir al dashboard →</button>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>
      <h2 style={{ color: cl.gray900, fontSize: '1.3rem', fontWeight: '700', margin: '0 0 1.5rem' }}>Subir machote Word</h2>
      <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '16px', padding: '2rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={sharedStyles.label}>Tipo de contrato *</label>
          <select value={tipo} onChange={e => { setTipo(e.target.value as TipoContrato); setNombre(TIPO_CONFIG[e.target.value as TipoContrato]?.label || '') }} style={{ ...sharedStyles.input, appearance: 'auto' }}>
            <option value="">Seleccionar…</option>
            <optgroup label="Crowdlending">
              <option value="inv_deuda">Inversionista Deuda (Comisión Mercantil)</option>
              <option value="sol_deuda_sin_garantia">Solicitante Deuda Sin Garantía</option>
              <option value="sol_deuda_con_garantia">Solicitante Deuda Con Garantía</option>
            </optgroup>
            <optgroup label="Crowd Equity">
              <option value="inv_capital">Inversionista Capital (Mandato)</option>
              <option value="sol_capital">Solicitante Capital (Adhesión)</option>
            </optgroup>
          </select>
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={sharedStyles.label}>Nombre del template *</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre descriptivo" style={sharedStyles.input} />
        </div>
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={sharedStyles.label}>Archivo Word (.docx) *</label>
          <div onClick={() => inputRef.current?.click()} style={{ border: `2px dashed ${file ? '#0891B2' : cl.gray200}`, borderRadius: '12px', padding: '2rem', textAlign: 'center', cursor: 'pointer', background: file ? '#ECFEFF' : cl.gray50 }}>
            <input ref={inputRef} type="file" accept=".docx" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
            {file ? <div><p style={{ color: '#0891B2', fontWeight: '600', fontSize: '0.88rem', margin: '0 0 0.25rem' }}>📄 {file.name}</p><p style={{ color: cl.gray400, fontSize: '0.75rem', margin: 0 }}>{(file.size / 1024).toFixed(0)} KB</p></div>
            : <p style={{ color: cl.gray400, fontSize: '0.85rem', margin: 0 }}>Arrastra o haz clic</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onDone} style={sharedStyles.btnGhost}>Cancelar</button>
          <button onClick={handleSubmit} disabled={!file || !nombre || !tipo || loading} style={{ ...sharedStyles.btnPrimary, background: '#0891B2', opacity: (!file || !nombre || !tipo || loading) ? 0.5 : 1 }}>
            {loading ? 'Subiendo…' : 'Subir template'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NuevaInstancia({ templates, onDone }: { templates: Template[]; onDone: (inst: Instancia) => void }) {
  const [templateId, setTemplateId] = useState('')
  const [nombreCliente, setNombreCliente] = useState('')
  const [emailCliente, setEmailCliente] = useState('')
  const [modo, setModo] = useState<'wizard_interno' | 'link_cliente'>('wizard_interno')
  const [loading, setLoading] = useState(false)
  const selected = templates.find(t => t.id === templateId)
  const isInv = selected?.tipo_contrato === 'inv_deuda' || selected?.tipo_contrato === 'inv_capital'

  async function handleSubmit() {
    if (!templateId || !nombreCliente || !emailCliente) return
    setLoading(true)
    const res = await fetch('/api/contratos/instancias', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: templateId, nombre_cliente: nombreCliente, email_cliente: emailCliente, modo }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) onDone(data.instancia)
    else alert('Error: ' + data.error)
  }

  return (
    <div style={{ maxWidth: '580px', margin: '0 auto' }}>
      <h2 style={{ color: cl.gray900, fontSize: '1.3rem', fontWeight: '700', margin: '0 0 1.5rem' }}>Nuevo contrato</h2>
      <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '16px', padding: '2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={sharedStyles.label}>Tipo de contrato *</label>
          {['Crowdlending', 'Crowd Equity'].map(prod => (
            <div key={prod} style={{ marginBottom: '0.85rem' }}>
              <p style={{ color: cl.gray400, fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.05em', margin: '0 0 0.4rem' }}>{prod.toUpperCase()}</p>
              <div style={{ display: 'grid', gridTemplateColumns: prod === 'Crowdlending' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {Object.entries(TIPO_CONFIG).filter(([, c]) => c.producto === prod).map(([tipo, cfg]) => {
                  const tmpl = templates.find(t => t.tipo_contrato === tipo)
                  const sel = tmpl?.id === templateId
                  return (
                    <div key={tipo} onClick={() => tmpl && setTemplateId(tmpl.id)}
                      style={{ border: `2px solid ${sel ? cfg.color : tmpl ? cl.gray200 : cl.gray100}`, borderRadius: '8px', padding: '0.65rem 0.75rem', cursor: tmpl ? 'pointer' : 'not-allowed', background: sel ? cfg.bg : cl.white, opacity: tmpl ? 1 : 0.45, transition: 'all 0.15s' }}>
                      <p style={{ color: sel ? cfg.color : cl.gray700, fontWeight: '600', fontSize: '0.78rem', margin: 0, lineHeight: 1.3 }}>{cfg.parte}</p>
                      {!tmpl && <p style={{ color: cl.gray400, fontSize: '0.62rem', margin: '0.2rem 0 0' }}>Sin template</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        {isInv && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
            <p style={{ color: '#92400E', fontSize: '0.78rem', margin: 0 }}>💡 El wizard preguntará si es <strong>Persona Física o Moral</strong> al iniciar.</p>
          </div>
        )}
        <div style={{ display: 'grid', gap: '0.85rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={sharedStyles.label}>Nombre del cliente *</label>
            <input value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} placeholder="Ana Torres" style={sharedStyles.input} />
          </div>
          <div>
            <label style={sharedStyles.label}>Email *</label>
            <input value={emailCliente} onChange={e => setEmailCliente(e.target.value)} placeholder="ana@empresa.com" type="email" style={sharedStyles.input} />
          </div>
        </div>
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={sharedStyles.label}>Modo de llenado *</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {([{ val: 'wizard_interno', title: 'Wizard interno', desc: 'Tú llenas los datos' }, { val: 'link_cliente', title: 'Link al cliente', desc: 'El cliente llena por email' }] as const).map(opt => (
              <div key={opt.val} onClick={() => setModo(opt.val)} style={{ border: `2px solid ${modo === opt.val ? '#0891B2' : cl.gray200}`, borderRadius: '10px', padding: '0.85rem', cursor: 'pointer', background: modo === opt.val ? '#ECFEFF' : cl.white }}>
                <p style={{ color: modo === opt.val ? '#0891B2' : cl.gray700, fontWeight: '600', fontSize: '0.85rem', margin: '0 0 0.2rem' }}>{opt.title}</p>
                <p style={{ color: cl.gray400, fontSize: '0.75rem', margin: 0 }}>{opt.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={() => onDone({} as Instancia)} style={sharedStyles.btnGhost}>Cancelar</button>
          <button onClick={handleSubmit} disabled={!templateId || !nombreCliente || !emailCliente || loading}
            style={{ ...sharedStyles.btnPrimary, background: '#0891B2', opacity: (!templateId || !nombreCliente || !emailCliente || loading) ? 0.5 : 1 }}>
            {loading ? 'Creando…' : modo === 'wizard_interno' ? 'Crear y llenar →' : 'Crear y enviar →'}
          </button>
        </div>
      </div>
    </div>
  )
}

function WizardContratos({ instancia, onDone }: { instancia: Instancia; onDone: () => void }) {
  const [tipoPersona, setTipoPersona] = useState<TipoPersona | null>(instancia.tipo_persona)
  const [step, setStep] = useState(0)
  const [datos, setDatos] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)

  const tipo = (instancia.contratos_templates?.tipo_contrato || 'sol_deuda_sin_garantia') as TipoContrato
  const tipoCfg = TIPO_CONFIG[tipo]
  const isInv = tipo === 'inv_deuda' || tipo === 'inv_capital'
  const needsPersonaSelect = isInv && !tipoPersona
  const steps = (!isInv || tipoPersona) ? getWizardSteps(tipo, tipoPersona) : []
  const totalSteps = steps.length
  const currentStep = steps[step]
  const filledCount = Object.values(datos).filter(v => v.trim()).length
  const totalFields = steps.reduce((acc, s) => acc + s.fields.length, 0)

  async function saveTipoPersona(tp: TipoPersona) {
    setTipoPersona(tp)
    await fetch(`/api/contratos/instancias/${instancia.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo_persona: tp }),
    })
  }

  async function handleGenerar() {
    setGenerating(true)
    await fetch(`/api/contratos/instancias/${instancia.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datos: { ...datos, TIPO_PERSONA: tipoPersona || 'pm' }, status: 'completado' }),
    })
    const res = await fetch('/api/contratos/generar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instancia_id: instancia.id }),
    })
    const data = await res.json()
    setGenerating(false)
    if (data.download_url) { window.open(data.download_url, '_blank'); onDone() }
    else alert('Error: ' + (data.error || 'desconocido'))
  }

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/contratos/instancias/${instancia.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datos }),
    })
    setSaving(false)
  }

  if (needsPersonaSelect) return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>
      <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '16px', padding: '2.5rem', textAlign: 'center' }}>
        <span style={{ background: tipoCfg.bg, color: tipoCfg.color, fontSize: '0.72rem', fontWeight: '700', padding: '0.3rem 0.7rem', borderRadius: '6px', display: 'inline-block', marginBottom: '1rem' }}>{tipoCfg.label}</span>
        <h2 style={{ color: cl.gray900, fontSize: '1.2rem', fontWeight: '700', margin: '0 0 0.4rem' }}>{instancia.nombre_cliente}</h2>
        <p style={{ color: cl.gray500, fontSize: '0.875rem', margin: '0 0 2rem' }}>¿El inversionista es…?</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {([
            { val: 'pf' as TipoPersona, icon: '👤', title: 'Persona Física', desc: 'Individual, actúa por propio derecho' },
            { val: 'pm' as TipoPersona, icon: '🏢', title: 'Persona Moral', desc: 'Empresa con escrituras y rep. legal' },
          ]).map(opt => (
            <div key={opt.val} onClick={() => saveTipoPersona(opt.val)}
              style={{ border: `2px solid ${cl.gray200}`, borderRadius: '12px', padding: '1.5rem 1rem', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = tipoCfg.color; e.currentTarget.style.background = tipoCfg.bg }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = cl.gray200; e.currentTarget.style.background = cl.white }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{opt.icon}</div>
              <p style={{ color: cl.gray800, fontWeight: '700', fontSize: '0.95rem', margin: '0 0 0.3rem' }}>{opt.title}</p>
              <p style={{ color: cl.gray400, fontSize: '0.78rem', margin: 0, lineHeight: 1.5 }}>{opt.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (!currentStep) return null

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '16px', padding: '1.5rem 2rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ background: tipoCfg.bg, color: tipoCfg.color, fontSize: '0.68rem', fontWeight: '700', padding: '0.2rem 0.55rem', borderRadius: '5px' }}>{tipoCfg.label}</span>
              {tipoPersona && <span style={{ background: cl.gray100, color: cl.gray500, fontSize: '0.68rem', fontWeight: '700', padding: '0.2rem 0.55rem', borderRadius: '5px' }}>{tipoPersona === 'pf' ? 'PERSONA FÍSICA' : 'PERSONA MORAL'}</span>}
            </div>
            <h2 style={{ color: cl.gray900, fontSize: '1.05rem', fontWeight: '700', margin: '0 0 0.2rem' }}>{instancia.nombre_cliente}</h2>
            <p style={{ color: cl.gray400, fontSize: '0.78rem', margin: 0 }}>{filledCount} de {totalFields} campos completados</p>
          </div>
          <button onClick={handleSave} disabled={saving} style={{ ...sharedStyles.btnGhost, fontSize: '0.78rem', opacity: saving ? 0.6 : 1 }}>{saving ? 'Guardando…' : '💾 Guardar'}</button>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {steps.map((s, i) => (
            <div key={i} onClick={() => setStep(i)} style={{ flex: 1, cursor: 'pointer' }}>
              <div style={{ height: '3px', borderRadius: '2px', background: i <= step ? tipoCfg.color : cl.gray200, transition: 'background 0.2s' }} />
              <p style={{ color: i === step ? tipoCfg.color : cl.gray400, fontSize: '0.62rem', fontWeight: i === step ? '700' : '400', margin: '0.3rem 0 0', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {i + 1}. {s.title}
              </p>
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
            <div key={field.key} style={{ gridColumn: field.wide ? '1 / -1' : 'auto' }}>
              <label style={{ ...sharedStyles.label, color: datos[field.key]?.trim() ? cl.gray600 : '#92400E' }}>{field.label}{!datos[field.key]?.trim() && ' *'}</label>
              <input value={datos[field.key] || ''} onChange={e => setDatos(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} style={sharedStyles.input} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => step > 0 ? setStep(s => s - 1) : (isInv && setTipoPersona(null))} style={{ ...sharedStyles.btnGhost }}>
          ← {step === 0 && isInv ? 'Cambiar tipo persona' : 'Anterior'}
        </button>
        <span style={{ color: cl.gray400, fontSize: '0.78rem' }}>Paso {step + 1} de {totalSteps}</span>
        <button onClick={() => step < totalSteps - 1 ? setStep(s => s + 1) : handleGenerar()} disabled={generating}
          style={{ ...sharedStyles.btnPrimary, background: step === totalSteps - 1 ? '#059669' : tipoCfg.color, opacity: generating ? 0.6 : 1 }}>
          {generating ? '⏳ Generando…' : step === totalSteps - 1 ? '⬇ Generar Word' : 'Siguiente →'}
        </button>
      </div>
    </div>
  )
}
