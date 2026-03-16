'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import React from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Section = 'dashboard' | 'inversionistas' | 'solicitantes' | 'listas' | 'reportes' | 'matriz' | 'auditoria'
type RiesgoNivel = 'bajo' | 'medio' | 'alto'

interface Inversionista {
  id: string; nombre: string; rfc: string; tipo: string; email: string
  nivel_riesgo: RiesgoNivel; status: string; created_at: string
  fuente_recursos?: string; pais?: string; pep?: boolean
}

interface Solicitante {
  id: string; razon_social: string; rfc: string; tipo_persona: string
  giro: string; status: string; created_at: string; metadata?: Record<string, unknown>
}

interface ListaConsulta {
  nombre: string; rfc?: string; resultado: 'limpio' | 'alerta' | 'bloqueado'; listas: string[]; fecha: string
}

// ─── Report types ────────────────────────────────────────────────────────────
interface ReporteOp {
  folio: string
  fecha_operacion: string
  tipo_cliente: string
  nombre_cliente: string
  apellido_paterno: string
  apellido_materno: string
  rfc_cliente: string
  nacionalidad: string
  tipo_operacion: string
  monto: string
  moneda: string
  descripcion: string
  razon_inusualidad?: string
}

interface ReporteGuardado {
  id: string
  tipo: '1' | '2' | '3'
  periodo: string
  folio_inicial: string
  num_ops: number
  status: 'borrador' | 'listo' | 'enviado'
  created_at: string
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const navy = '#0B1120'
const navyLight = '#111827'
const navyBorder = '#1E2D45'
const accent = '#3B82F6'
const accentGreen = '#10B981'
const accentRed = '#EF4444'
const accentYellow = '#F59E0B'
const textPrimary = '#F1F5F9'
const textSecondary = '#94A3B8'
const textMuted = '#475569'
const font = "'IBM Plex Sans', system-ui, sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

// ─── Risk config ─────────────────────────────────────────────────────────────
const RIESGO: Record<RiesgoNivel, { label: string; color: string; bg: string; dot: string }> = {
  bajo:  { label: 'Bajo',  color: '#10B981', bg: 'rgba(16,185,129,0.1)',  dot: '#10B981' },
  medio: { label: 'Medio', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  dot: '#F59E0B' },
  alto:  { label: 'Alto',  color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   dot: '#EF4444' },
}

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard',      label: 'Dashboard',       icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'inversionistas', label: 'Inversionistas',  icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'solicitantes',   label: 'Solicitantes',    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'listas',         label: 'Consulta Listas', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'reportes',       label: 'Reportes CNBV',   icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'matriz',         label: 'Matriz de Riesgo',icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
  { id: 'auditoria',      label: 'Auditoría',       icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
]

// ─── Reportes config ──────────────────────────────────────────────────────────

const TIPO_OP = [
  { v: '01', l: 'Depósito en efectivo' },
  { v: '02', l: 'Retiro en efectivo' },
  { v: '03', l: 'Transferencia recibida' },
  { v: '04', l: 'Transferencia enviada' },
  { v: '05', l: 'Compra de divisas' },
  { v: '06', l: 'Venta de divisas' },
  { v: '07', l: 'Financiamiento colectivo — inversión' },
  { v: '08', l: 'Financiamiento colectivo — solicitud' },
  { v: '09', l: 'Pago de crédito' },
  { v: '10', l: 'Otro' },
]

const MONEDAS = [
  { v: 'MXP', l: 'Peso mexicano (MXP)' },
  { v: 'USD', l: 'Dólar americano (USD)' },
  { v: 'EUR', l: 'Euro (EUR)' },
  { v: 'USDT', l: 'USDT (activo virtual)' },
]

const CASFIM_ENTIDAD = '0065022' // 065-022 → sin guión, con 0 al inicio
const CASFIM_SUPERVISOR = '004000' // CNBV

const REPORTES = [
  { id: 'Art. 66', nombre: 'Art. 66 — Operaciones Relevantes', freq: 'Trimestral', desc: 'Operaciones ≥ umbral UIF. Envío vía SITI dentro de los primeros 10 días hábiles de ene, abr, jul y oct. Base: Art. 66 Disp. Art. 58 LRITF.', color: accent, status: 'pendiente', vence: '2026-04-14' },
  { id: 'Art. 69', nombre: 'Art. 69 — Operaciones Inusuales', freq: '3 días hábiles', desc: 'Operaciones que no concuerdan con el perfil transaccional del cliente o carezcan de justificación económica. Plazo: 3 días hábiles desde dictaminación.', color: accentYellow, status: 'al_corriente', vence: null },
  { id: 'Art. 75', nombre: 'Art. 75 — Ops. Internas Preocupantes', freq: '3 días hábiles', desc: 'Conductas de directivos, funcionarios o empleados que puedan actualizar supuestos de LD/FT. Plazo: 3 días hábiles desde conocimiento.', color: accentRed, status: 'al_corriente', vence: null },
  { id: 'Art. 48', nombre: 'Art. 48 — Oficial de Cumplimiento', freq: 'Al designar / anual', desc: 'Notificación de designación o sustitución del Oficial de Cumplimiento ante CNBV vía SITI PLD/FT. Certificación CNBV vigente obligatoria.', color: accentGreen, status: 'presentado', vence: null },
  { id: 'Art. 53', nombre: 'Art. 53 — Comité CCC', freq: 'Al constituir', desc: 'Notificación de integración del Comité de Comunicación y Control (CCC). Órgano colegiado obligatorio para ITF. Vía SITI CNBV.', color: '#A78BFA', status: 'presentado', vence: null },
]

const LISTAS_CONFIG = [
  { id: 'ofac', nombre: 'OFAC SDN', desc: 'Office of Foreign Assets Control — EUA' },
  { id: 'sat69b', nombre: 'SAT 69-B', desc: 'Contribuyentes con operaciones inexistentes' },
  { id: 'onu', nombre: 'ONU Sanciones', desc: 'Consejo de Seguridad — Resoluciones' },
  { id: 'uif', nombre: 'UIF México', desc: 'Unidad de Inteligencia Financiera SHCP' },
  { id: 'peps', nombre: 'PEPs México', desc: 'Personas Expuestas Políticamente' },
  { id: 'interpol', nombre: 'Interpol', desc: 'Avisos rojos internacionales' },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function PldPage() {
  const [section, setSection] = useState<Section>('dashboard')
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState<'pld_admin' | 'pld_oficial' | null>(null)
  const [loading, setLoading] = useState(true)

  // Inversionistas state
  const [inversionistas, setInversionistas] = useState<Inversionista[]>([])
  const [invSearch, setInvSearch] = useState('')
  const [showAddInv, setShowAddInv] = useState(false)
  const [newInv, setNewInv] = useState({ nombre: '', rfc: '', tipo: 'persona_fisica', email: '', fuente_recursos: '', pais: 'MX', pep: false })
  const [invSaving, setInvSaving] = useState(false)

  // Solicitantes state
  const [solicitantes, setSolicitantes] = useState<Solicitante[]>([])
  const [solSearch, setSolSearch] = useState('')

  // Lista consulta state
  const [listaQuery, setListaQuery] = useState('')
  const [listaRfc, setListaRfc] = useState('')
  const [listaSelected, setListaSelected] = useState<string[]>(['ofac', 'sat69b', 'onu', 'uif', 'peps'])
  const [listaResult, setListaResult] = useState<ListaConsulta | null>(null)
  const [listaSearching, setListaSearching] = useState(false)
  const [historialConsultas, setHistorialConsultas] = useState<ListaConsulta[]>([])

  // Token
  const [sessionToken, setSessionToken] = useState('')

  // Reporte wizard state
  const [showReporteWizard, setShowReporteWizard] = useState(false)
  const [reporteStep, setReporteStep] = useState(1)
  const [reporteTipo, setReporteTipo] = useState<'1'|'2'|'3'>('1')
  const [reporteOps, setReporteOps] = useState<ReporteOp[]>([])
  const [reporteCurrentOp, setReporteCurrentOp] = useState<Partial<ReporteOp>>({})
  const [reportesGuardados, setReportesGuardados] = useState<ReporteGuardado[]>([])

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/pld/login'; return }
      setUserEmail(user.email || '')

      const adminEmails = ['luis@crowdlink.mx', 'lalvarezzapfe@gmail.com']
      const oficialEmails = ['pld@crowdlink.mx']

      if (adminEmails.includes(user.email || '')) setUserRole('pld_admin')
      else if (oficialEmails.includes(user.email || '')) setUserRole('pld_oficial')
      else { window.location.href = '/gate'; return }

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) setSessionToken(session.access_token)

      setLoading(false)
    }
    init()
  }, [])

  const loadSolicitantes = useCallback(async () => {
    if (!sessionToken) return
    const res = await fetch('/api/v1/kyc/admin/empresas', { headers: { 'Authorization': 'Bearer ' + sessionToken } })
    if (res.ok) { const d = await res.json(); setSolicitantes(d.empresas || []) }
  }, [sessionToken])

  useEffect(() => {
    if (section === 'solicitantes' && sessionToken) loadSolicitantes()
  }, [section, sessionToken, loadSolicitantes])

  const handleListaSearch = async () => {
    if (!listaQuery.trim()) return
    setListaSearching(true)
    // Simulate list check — placeholder until real API integration
    await new Promise(r => setTimeout(r, 1200))
    const result: ListaConsulta = {
      nombre: listaQuery.trim(),
      rfc: listaRfc.trim() || undefined,
      resultado: 'limpio',
      listas: listaSelected,
      fecha: new Date().toISOString(),
    }
    setListaResult(result)
    setHistorialConsultas(prev => [result, ...prev.slice(0, 19)])
    setListaSearching(false)
  }

  const handleAddInversionista = async () => {
    if (!newInv.nombre || !newInv.rfc || !newInv.email) return
    setInvSaving(true)
    await new Promise(r => setTimeout(r, 600))
    const inv: Inversionista = {
      id: crypto.randomUUID(),
      ...newInv,
      nivel_riesgo: newInv.pep ? 'alto' : 'bajo',
      status: 'activo',
      created_at: new Date().toISOString(),
    }
    setInversionistas(prev => [inv, ...prev])
    setNewInv({ nombre: '', rfc: '', tipo: 'persona_fisica', email: '', fuente_recursos: '', pais: 'MX', pep: false })
    setShowAddInv(false)
    setInvSaving(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '32px', height: '32px', border: '2.5px solid rgba(59,130,246,0.2)', borderTopColor: accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: navy, display: 'flex', fontFamily: font, color: textPrimary }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${navyBorder}; border-radius: 2px; }
        .nav-item:hover { background: rgba(59,130,246,0.08) !important; }
        .row-hover:hover { background: rgba(255,255,255,0.03) !important; cursor: pointer; }
        .btn-ghost:hover { opacity: 0.8; }
        input, select, textarea { outline: none; }
        input:focus, select:focus, textarea:focus { border-color: ${accent} !important; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{ width: '224px', background: navyLight, borderRight: `1px solid ${navyBorder}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 10 }}>
        {/* Logo */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: `1px solid ${navyBorder}` }}>
          <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '20px', width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
          <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: accentRed, boxShadow: `0 0 6px ${accentRed}` }} />
            <span style={{ color: textMuted, fontSize: '0.68rem', fontWeight: '600', letterSpacing: '0.12em' }}>SISTEMA PLD</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem 0.5rem', overflowY: 'auto' }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => setSection(item.id as Section)} className="nav-item"
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: '8px', border: 'none', background: section === item.id ? 'rgba(59,130,246,0.12)' : 'transparent', color: section === item.id ? '#60A5FA' : textSecondary, fontSize: '0.82rem', fontWeight: section === item.id ? '600' : '400', cursor: 'pointer', fontFamily: font, marginBottom: '2px', transition: 'all 0.15s', textAlign: 'left' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '0.75rem 1rem', borderTop: `1px solid ${navyBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA', fontSize: '0.7rem', fontWeight: '700', flexShrink: 0 }}>
              {userEmail ? userEmail[0].toUpperCase() : 'U'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: textPrimary, fontSize: '0.75rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</div>
              <div style={{ color: textMuted, fontSize: '0.65rem' }}>{userRole === 'pld_admin' ? 'Super Admin' : 'Oficial de Cumplimiento'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <a href="/gate" style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: `1px solid ${navyBorder}`, borderRadius: '6px', padding: '0.4rem', fontSize: '0.7rem', color: textMuted, textDecoration: 'none', textAlign: 'center', display: 'block' }} className="btn-ghost">
              Módulos
            </a>
            <button onClick={async () => { await createClient().auth.signOut(); window.location.href = '/gate' }}
              style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: `1px solid ${navyBorder}`, borderRadius: '6px', padding: '0.4rem', fontSize: '0.7rem', color: textMuted, cursor: 'pointer', fontFamily: font }} className="btn-ghost">
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ marginLeft: '224px', flex: 1, minHeight: '100vh', overflowY: 'auto' }}>

        {/* ── DASHBOARD ── */}
        {section === 'dashboard' && (
          <div style={{ padding: '2rem', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accentRed, boxShadow: `0 0 8px ${accentRed}` }} />
                <span style={{ color: textMuted, fontSize: '0.72rem', fontWeight: '600', letterSpacing: '0.1em' }}>PLD / CFT — CNBV · Art. 58 LRITF</span>
              </div>
              <h1 style={{ color: textPrimary, fontSize: '1.6rem', fontWeight: '700', margin: '0', letterSpacing: '-0.02em' }}>Panel de Cumplimiento</h1>
              <p style={{ color: textMuted, fontSize: '0.85rem', margin: '0.4rem 0 0' }}>
                {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Inversionistas', value: inversionistas.length, sub: 'registrados', color: accent },
                { label: 'Solicitantes KYC', value: solicitantes.length, sub: 'expedientes', color: accentGreen },
                { label: 'Consultas listas', value: historialConsultas.length, sub: 'este mes', color: accentYellow },
                { label: 'Alertas activas', value: 0, sub: 'sin incidencias', color: accentRed },
              ].map(s => (
                <div key={s.label} style={{ background: navyLight, border: `1px solid ${navyBorder}`, borderRadius: '12px', padding: '1.25rem 1.5rem' }}>
                  <div style={{ color: s.color, fontSize: '2rem', fontWeight: '700', fontFamily: fontMono, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ color: textPrimary, fontSize: '0.82rem', fontWeight: '500', marginTop: '0.4rem' }}>{s.label}</div>
                  <div style={{ color: textMuted, fontSize: '0.72rem' }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Obligaciones próximas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ background: navyLight, border: `1px solid ${navyBorder}`, borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ color: textPrimary, fontSize: '0.9rem', fontWeight: '600', margin: 0 }}>Obligaciones CNBV</h3>
                  <span style={{ color: textMuted, fontSize: '0.72rem' }}>Calendario 2026</span>
                </div>
                {REPORTES.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: `1px solid ${navyBorder}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                      <div>
                        <div style={{ color: textPrimary, fontSize: '0.8rem', fontWeight: '500' }}>{r.id}</div>
                        <div style={{ color: textMuted, fontSize: '0.68rem' }}>{r.freq}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '600', padding: '0.15rem 0.55rem', borderRadius: '9999px',
                        background: r.status === 'presentado' ? 'rgba(16,185,129,0.1)' : r.status === 'pendiente' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                        color: r.status === 'presentado' ? accentGreen : r.status === 'pendiente' ? accentYellow : accent,
                      }}>{r.status === 'presentado' ? 'Presentado' : r.status === 'pendiente' ? 'Pendiente' : 'Al corriente'}</span>
                      {r.vence && <div style={{ color: textMuted, fontSize: '0.65rem', marginTop: '0.2rem' }}>Vence {new Date(r.vence).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</div>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Semáforo de riesgo */}
              <div style={{ background: navyLight, border: `1px solid ${navyBorder}`, borderRadius: '12px', padding: '1.25rem' }}>
                <h3 style={{ color: textPrimary, fontSize: '0.9rem', fontWeight: '600', margin: '0 0 1rem' }}>Semáforo de Cumplimiento</h3>
                {[
                  { label: 'Expedientes KYC completos', valor: 85, color: accentGreen },
                  { label: 'Consultas listas actualizadas', valor: 100, color: accentGreen },
                  { label: 'Reportes CNBV al corriente', valor: 75, color: accentYellow },
                  { label: 'Inversionistas con nivel de riesgo', valor: inversionistas.length > 0 ? 100 : 0, color: inversionistas.length > 0 ? accentGreen : accentRed },
                ].map(item => (
                  <div key={item.label} style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ color: textSecondary, fontSize: '0.78rem' }}>{item.label}</span>
                      <span style={{ color: item.color, fontSize: '0.78rem', fontWeight: '600', fontFamily: fontMono }}>{item.valor}%</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${item.valor}%`, background: item.color, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '8px' }}>
                  <div style={{ color: accentGreen, fontSize: '0.78rem', fontWeight: '600' }}>✓ Sistema operando dentro de parámetros</div>
                  <div style={{ color: textMuted, fontSize: '0.7rem', marginTop: '0.2rem' }}>Última actualización: {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── INVERSIONISTAS ── */}
        {section === 'inversionistas' && (
          <div style={{ padding: '2rem', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ color: textPrimary, fontSize: '1.4rem', fontWeight: '700', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>Inversionistas</h1>
                <p style={{ color: textMuted, fontSize: '0.82rem', margin: 0 }}>Registro y gestión de clientes inversionistas conforme a KYC/PLD</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <label style={{ background: 'rgba(59,130,246,0.08)', border: `1px solid rgba(59,130,246,0.25)`, borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.82rem', color: '#60A5FA', cursor: 'pointer', fontFamily: font, fontWeight: '500' }}>
                  <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={() => alert('Carga masiva — integración Excel próximamente')} />
                  ↑ Cargar Excel
                </label>
                <button onClick={() => setShowAddInv(true)}
                  style={{ background: accent, color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', fontFamily: font }}>
                  + Nuevo inversionista
                </button>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '1rem', maxWidth: '360px' }}>
              <input placeholder="Buscar nombre, RFC..." value={invSearch} onChange={e => setInvSearch(e.target.value)}
                style={{ width: '100%', background: navyLight, border: `1px solid ${navyBorder}`, borderRadius: '8px', padding: '0.55rem 0.75rem 0.55rem 2.25rem', color: textPrimary, fontSize: '0.83rem', fontFamily: font }} />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>

            {/* Table */}
            <div style={{ background: navyLight, border: `1px solid ${navyBorder}`, borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${navyBorder}` }}>
                    {['Nombre', 'RFC', 'Tipo', 'Email', 'Nivel Riesgo', 'PEP', 'Fecha', ''].map(h => (
                      <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', color: textMuted, fontSize: '0.68rem', fontWeight: '600', letterSpacing: '0.08em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inversionistas.filter(i => !invSearch || i.nombre.toLowerCase().includes(invSearch.toLowerCase()) || i.rfc.toLowerCase().includes(invSearch.toLowerCase())).length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: textMuted, fontSize: '0.85rem' }}>
                      {inversionistas.length === 0 ? 'Sin inversionistas registrados. Agrega el primero o carga un Excel.' : 'Sin resultados'}
                    </td></tr>
                  ) : inversionistas.filter(i => !invSearch || i.nombre.toLowerCase().includes(invSearch.toLowerCase()) || i.rfc.toLowerCase().includes(invSearch.toLowerCase())).map((inv, idx) => {
                    const r = RIESGO[inv.nivel_riesgo]
                    return (
                      <tr key={inv.id} className="row-hover" style={{ borderBottom: `1px solid ${navyBorder}` }}>
                        <td style={{ padding: '0.75rem 1rem', color: textPrimary, fontSize: '0.85rem', fontWeight: '500' }}>{inv.nombre}</td>
                        <td style={{ padding: '0.75rem 1rem' }}><span style={{ fontFamily: fontMono, fontSize: '0.78rem', color: textSecondary, background: 'rgba(255,255,255,0.04)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>{inv.rfc}</span></td>
                        <td style={{ padding: '0.75rem 1rem', color: textMuted, fontSize: '0.8rem' }}>{inv.tipo === 'persona_fisica' ? 'Física' : 'Moral'}</td>
                        <td style={{ padding: '0.75rem 1rem', color: textMuted, fontSize: '0.8rem' }}>{inv.email}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ background: r.bg, color: r.color, fontSize: '0.68rem', fontWeight: '600', padding: '0.2rem 0.6rem', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: r.dot }} />{r.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {inv.pep ? <span style={{ background: 'rgba(239,68,68,0.1)', color: accentRed, fontSize: '0.65rem', fontWeight: '700', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>PEP</span> : <span style={{ color: textMuted, fontSize: '0.75rem' }}>—</span>}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: textMuted, fontSize: '0.75rem' }}>{new Date(inv.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <button onClick={() => { setListaQuery(inv.nombre); setListaRfc(inv.rfc); setSection('listas') }}
                            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: '#60A5FA', cursor: 'pointer', fontFamily: font }}>
                            Consultar listas
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SOLICITANTES ── */}
        {section === 'solicitantes' && (
          <div style={{ padding: '2rem', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ color: textPrimary, fontSize: '1.4rem', fontWeight: '700', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>Solicitantes KYC</h1>
                <p style={{ color: textMuted, fontSize: '0.82rem', margin: 0 }}>Empresas solicitantes — solo consulta y generación de reportes</p>
              </div>
              <button onClick={() => { alert('Reporte ejecutivo PDF — próximamente') }}
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.82rem', color: accentGreen, cursor: 'pointer', fontFamily: font, fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 7v10a2 2 0 01-2 2z"/></svg>
                Reporte PDF ejecutivo
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '1rem', maxWidth: '360px' }}>
              <input placeholder="Buscar empresa, RFC..." value={solSearch} onChange={e => setSolSearch(e.target.value)}
                style={{ width: '100%', background: navyLight, border: `1px solid ${navyBorder}`, borderRadius: '8px', padding: '0.55rem 0.75rem 0.55rem 2.25rem', color: textPrimary, fontSize: '0.83rem', fontFamily: font }} />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>

            <div style={{ background: navyLight, border: `1px solid ${navyBorder}`, borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${navyBorder}` }}>
                    {['Razón Social', 'RFC', 'Tipo', 'Giro', 'Status KYC', 'Fecha', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', color: textMuted, fontSize: '0.68rem', fontWeight: '600', letterSpacing: '0.08em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {solicitantes.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: textMuted }}>
                      <button onClick={loadSolicitantes} style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '0.5rem 1.25rem', color: '#60A5FA', cursor: 'pointer', fontFamily: font, fontSize: '0.82rem' }}>
                        Cargar expedientes
                      </button>
                    </td></tr>
                  ) : solicitantes.filter(s => !solSearch || s.razon_social?.toLowerCase().includes(solSearch.toLowerCase()) || s.rfc?.toLowerCase().includes(solSearch.toLowerCase())).map(sol => {
                    const sc = { pending: { l: 'Pendiente', c: accentYellow }, in_review: { l: 'En revisión', c: accent }, approved: { l: 'Aprobado', c: accentGreen }, rejected: { l: 'Rechazado', c: accentRed } }[sol.status] || { l: sol.status, c: textMuted }
                    return (
                      <tr key={sol.id} className="row-hover" style={{ borderBottom: `1px solid ${navyBorder}` }}>
                        <td style={{ padding: '0.75rem 1rem', color: textPrimary, fontSize: '0.85rem', fontWeight: '500' }}>{sol.razon_social}</td>
                        <td style={{ padding: '0.75rem 1rem' }}><span style={{ fontFamily: fontMono, fontSize: '0.78rem', color: textSecondary, background: 'rgba(255,255,255,0.04)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>{sol.rfc}</span></td>
                        <td style={{ padding: '0.75rem 1rem', color: textMuted, fontSize: '0.8rem' }}>{sol.tipo_persona === 'moral' ? 'Moral' : 'Física'}</td>
                        <td style={{ padding: '0.75rem 1rem', color: textMuted, fontSize: '0.8rem' }}>{sol.giro || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ color: sc.c, fontSize: '0.72rem', fontWeight: '600', background: `${sc.c}15`, padding: '0.15rem 0.6rem', borderRadius: '9999px' }}>{sc.l}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: textMuted, fontSize: '0.75rem' }}>{new Date(sol.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <button onClick={() => { setListaQuery(sol.razon_social); setListaRfc(sol.rfc); setSection('listas') }}
                            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: '#60A5FA', cursor: 'pointer', fontFamily: font }}>
                            Consultar listas
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CONSULTA LISTAS ── */}
        {section === 'listas' && (
          <div style={{ padding: '2rem', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h1 style={{ color: textPrimary, fontSize: '1.4rem', fontWeight: '700', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>Consulta de Listas Negras</h1>
              <p style={{ color: textMuted, fontSize: '0.82rem', margin: 0 }}>OFAC SDN · SAT 69-B · ONU · UIF · PEPs · Interpol</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem' }}>
              {/* Form */}
              <div style={{ background: navyLight, border: `1px solid ${navyBorder}`, borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ color: textPrimary, fontSize: '0.9rem', fontWeight: '600', margin: '0 0 1.25rem' }}>Nueva Consulta</h3>
                <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ color: textMuted, fontSize: '0.72rem', fontWeight: '600', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>NOMBRE / RAZÓN SOCIAL *</label>
                    <input value={listaQuery} onChange={e => setListaQuery(e.target.value)} placeholder="Nombre a consultar..."
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${navyBorder}`, borderRadius: '8px', padding: '0.65rem 0.9rem', color: textPrimary, fontSize: '0.85rem', fontFamily: font }} />
                  </div>
                  <div>
                    <label style={{ color: textMuted, fontSize: '0.72rem', fontWeight: '600', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>RFC (opcional)</label>
                    <input value={listaRfc} onChange={e => setListaRfc(e.target.value)} placeholder="RFC..."
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${navyBorder}`, borderRadius: '8px', padding: '0.65rem 0.9rem', color: textPrimary, fontSize: '0.85rem', fontFamily: fontMono }} />
                  </div>
                  <div>
                    <label style={{ color: textMuted, fontSize: '0.72rem', fontWeight: '600', letterSpacing: '0.06em', display: 'block', marginBottom: '0.5rem' }}>LISTAS A CONSULTAR</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      {LISTAS_CONFIG.map(l => (
                        <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.45rem 0.6rem', borderRadius: '6px', background: listaSelected.includes(l.id) ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${listaSelected.includes(l.id) ? 'rgba(59,130,246,0.25)' : navyBorder}` }}>
                          <input type="checkbox" checked={listaSelected.includes(l.id)} onChange={e => setListaSelected(prev => e.target.checked ? [...prev, l.id] : prev.filter(x => x !== l.id))} style={{ accentColor: accent, width: '13px', height: '13px' }} />
                          <span style={{ color: listaSelected.includes(l.id) ? '#60A5FA' : textSecondary, fontSize: '0.72rem', fontWeight: '500' }}>{l.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={handleListaSearch} disabled={!listaQuery.trim() || listaSearching}
                  style={{ width: '100%', background: listaSearching ? 'rgba(59,130,246,0.3)' : accent, color: 'white', border: 'none', borderRadius: '9px', padding: '0.8rem', fontSize: '0.88rem', fontWeight: '600', cursor: listaQuery.trim() ? 'pointer' : 'not-allowed', fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {listaSearching ? <><div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Consultando...</> : 'Consultar listas'}
                </button>

                {/* Result */}
                {listaResult && (
                  <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '10px', background: listaResult.resultado === 'limpio' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${listaResult.resultado === 'limpio' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: listaResult.resultado === 'limpio' ? accentGreen : accentRed }} />
                      <span style={{ color: listaResult.resultado === 'limpio' ? accentGreen : accentRed, fontSize: '0.85rem', fontWeight: '700' }}>
                        {listaResult.resultado === 'limpio' ? 'SIN COINCIDENCIAS' : 'ALERTA — REQUIERE REVISIÓN'}
                      </span>
                    </div>
                    <div style={{ color: textMuted, fontSize: '0.72rem' }}>{listaResult.nombre} · {listaResult.listas.length} listas consultadas</div>
                  </div>
                )}
              </div>

              {/* Historial */}
              <div style={{ background: navyLight, border: `1px solid ${navyBorder}`, borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ color: textPrimary, fontSize: '0.9rem', fontWeight: '600', margin: '0 0 1rem' }}>Historial de Consultas</h3>
                {historialConsultas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: textMuted, fontSize: '0.82rem' }}>Sin consultas aún</div>
                ) : (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {historialConsultas.map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: `1px solid ${navyBorder}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.resultado === 'limpio' ? accentGreen : accentRed, flexShrink: 0 }} />
                          <div>
                            <div style={{ color: textPrimary, fontSize: '0.8rem', fontWeight: '500' }}>{c.nombre}</div>
                            {c.rfc && <div style={{ color: textMuted, fontSize: '0.68rem', fontFamily: fontMono }}>{c.rfc}</div>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: c.resultado === 'limpio' ? accentGreen : accentRed, fontSize: '0.68rem', fontWeight: '700' }}>{c.resultado === 'limpio' ? 'Limpio' : 'Alerta'}</div>
                          <div style={{ color: textMuted, fontSize: '0.65rem' }}>{new Date(c.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── REPORTES ── */}
        {section === 'reportes' && (
          <div style={{ padding: '2rem', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ color: textPrimary, fontSize: '1.4rem', fontWeight: '700', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>Reportes CNBV</h1>
                <p style={{ color: textMuted, fontSize: '0.82rem', margin: 0 }}>Art. 66, 69 y 75 · SITI PLD/FT · CASFIM {CASFIM_ENTIDAD}</p>
              </div>
              <button onClick={() => { setShowReporteWizard(true); setReporteStep(1); setReporteOps([]); setReporteCurrentOp({}) }}
                style={{ background: accent, color: 'white', border: 'none', borderRadius: '9px', padding: '0.55rem 1.1rem', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', fontFamily: font, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nuevo reporte
              </button>
            </div>

            {/* Obligaciones cards */}
            <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '2rem' }}>
              {REPORTES.map(r => (
                <div key={r.id} style={{ background: navyLight, border: `1px solid ${navyBorder}`, borderRadius: '12px', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: r.color, boxShadow: `0 0 8px ${r.color}60`, flexShrink: 0 }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                        <h3 style={{ color: textPrimary, fontSize: '0.88rem', fontWeight: '600', margin: 0 }}>{r.nombre}</h3>
                        <span style={{ background: 'rgba(255,255,255,0.05)', color: textMuted, fontSize: '0.62rem', fontWeight: '600', padding: '0.1rem 0.45rem', borderRadius: '4px', letterSpacing: '0.06em' }}>{r.freq.toUpperCase()}</span>
                      </div>
                      <p style={{ color: textMuted, fontSize: '0.78rem', margin: 0, lineHeight: 1.5 }}>{r.desc}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, marginLeft: '1rem' }}>
                    {r.vence && <span style={{ color: accentYellow, fontSize: '0.72rem' }}>Vence {new Date(r.vence).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>}
                    <span style={{ fontSize: '0.7rem', fontWeight: '600', padding: '0.2rem 0.65rem', borderRadius: '9999px',
                      background: r.status === 'presentado' ? 'rgba(16,185,129,0.1)' : r.status === 'pendiente' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                      color: r.status === 'presentado' ? accentGreen : r.status === 'pendiente' ? accentYellow : accent,
                    }}>{r.status === 'presentado' ? 'Presentado' : r.status === 'pendiente' ? 'Pendiente' : 'Al corriente'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Reportes guardados */}
            <div style={{ background: navyLight, border: `1px solid ${navyBorder}`, borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${navyBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: textPrimary, fontSize: '0.88rem', fontWeight: '600' }}>Reportes generados</span>
                <span style={{ color: textMuted, fontSize: '0.75rem' }}>{reportesGuardados.length} registros</span>
              </div>
              {reportesGuardados.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: textMuted, fontSize: '0.82rem' }}>
                  Sin reportes generados. Crea el primero con el botón + Nuevo reporte.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${navyBorder}` }}>
                      {['Tipo', 'Período', 'Folio inicial', 'Operaciones', 'Status', 'Fecha', 'Acciones'].map(h => (
                        <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', color: textMuted, fontSize: '0.68rem', fontWeight: '600', letterSpacing: '0.08em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportesGuardados.map(r => (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${navyBorder}` }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ color: r.tipo === '1' ? accent : r.tipo === '2' ? accentYellow : accentRed, fontSize: '0.78rem', fontWeight: '600', background: `${r.tipo === '1' ? accent : r.tipo === '2' ? accentYellow : accentRed}15`, padding: '0.15rem 0.55rem', borderRadius: '4px' }}>
                            {r.tipo === '1' ? 'Relevante' : r.tipo === '2' ? 'Inusual' : 'Preocupante'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: textSecondary, fontSize: '0.82rem', fontFamily: fontMono }}>{r.periodo}</td>
                        <td style={{ padding: '0.75rem 1rem', color: textMuted, fontSize: '0.78rem', fontFamily: fontMono }}>{r.folio_inicial}</td>
                        <td style={{ padding: '0.75rem 1rem', color: textPrimary, fontSize: '0.82rem', fontFamily: fontMono }}>{r.num_ops}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: '600', padding: '0.15rem 0.55rem', borderRadius: '9999px',
                            background: r.status === 'enviado' ? 'rgba(16,185,129,0.1)' : r.status === 'listo' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
                            color: r.status === 'enviado' ? accentGreen : r.status === 'listo' ? accent : accentYellow }}>
                            {r.status === 'enviado' ? 'Enviado SITI' : r.status === 'listo' ? 'Listo para enviar' : 'Borrador'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: textMuted, fontSize: '0.75rem' }}>{new Date(r.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <button style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: '#60A5FA', cursor: 'pointer', fontFamily: font }}>
                            Descargar layout
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── MATRIZ ── */}
        {section === 'matriz' && (
          <div style={{ padding: '2rem', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h1 style={{ color: textPrimary, fontSize: '1.4rem', fontWeight: '700', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>Matriz de Riesgo</h1>
              <p style={{ color: textMuted, fontSize: '0.82rem', margin: 0 }}>Clasificación de clientes por nivel de riesgo LD/FT</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {(['bajo', 'medio', 'alto'] as RiesgoNivel[]).map(nivel => {
                const r = RIESGO[nivel]
                const items = inversionistas.filter(i => i.nivel_riesgo === nivel)
                return (
                  <div key={nivel} style={{ background: navyLight, border: `1px solid ${navyBorder}`, borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${navyBorder}`, background: r.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: r.dot }} />
                        <span style={{ color: r.color, fontSize: '0.85rem', fontWeight: '700' }}>Riesgo {r.label}</span>
                      </div>
                      <span style={{ color: r.color, fontSize: '1.1rem', fontWeight: '700', fontFamily: fontMono }}>{items.length}</span>
                    </div>
                    <div style={{ padding: '0.75rem' }}>
                      {items.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem', color: textMuted, fontSize: '0.78rem' }}>Sin clientes</div>
                      ) : items.map(i => (
                        <div key={i.id} style={{ padding: '0.5rem 0.6rem', borderRadius: '6px', marginBottom: '0.35rem', background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ color: textPrimary, fontSize: '0.8rem', fontWeight: '500' }}>{i.nombre}</div>
                          <div style={{ color: textMuted, fontSize: '0.68rem', fontFamily: fontMono }}>{i.rfc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: '1.5rem', background: navyLight, border: `1px solid ${navyBorder}`, borderRadius: '12px', padding: '1.25rem' }}>
              <h3 style={{ color: textPrimary, fontSize: '0.88rem', fontWeight: '600', margin: '0 0 0.75rem' }}>Criterios de clasificación — Enfoque Basado en Riesgo (EBR)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {[
                  { nivel: 'Bajo', color: accentGreen, criterios: ['Persona física con actividad económica verificada', 'Sin operaciones en efectivo', 'No PEP, no en listas', 'País de bajo riesgo (México)'] },
                  { nivel: 'Medio', color: accentYellow, criterios: ['Persona moral sin historial previo', 'Operaciones en efectivo < umbral', 'País con supervisión AML media', 'Cambios frecuentes en perfil transaccional'] },
                  { nivel: 'Alto', color: accentRed, criterios: ['PEP o familiar de PEP', 'País de alto riesgo (GAFI)', 'En listas OFAC / ONU / UIF', 'Operaciones en efectivo > $7,500 USD'] },
                ].map(c => (
                  <div key={c.nivel} style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: `1px solid ${navyBorder}` }}>
                    <div style={{ color: c.color, fontSize: '0.78rem', fontWeight: '700', marginBottom: '0.6rem' }}>RIESGO {c.nivel.toUpperCase()}</div>
                    {c.criterios.map((cr, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: c.color, fontSize: '0.68rem', flexShrink: 0, marginTop: '0.1rem' }}>▸</span>
                        <span style={{ color: textMuted, fontSize: '0.73rem', lineHeight: 1.4 }}>{cr}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── AUDITORÍA ── */}
        {section === 'auditoria' && (
          <div style={{ padding: '2rem', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h1 style={{ color: textPrimary, fontSize: '1.4rem', fontWeight: '700', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>Log de Auditoría</h1>
              <p style={{ color: textMuted, fontSize: '0.82rem', margin: 0 }}>Registro de todas las acciones del Oficial de Cumplimiento — conservación 5 años</p>
            </div>
            <div style={{ background: navyLight, border: `1px solid ${navyBorder}`, borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ textAlign: 'center', padding: '3rem', color: textMuted }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }}>
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <div style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.4rem', color: textSecondary }}>Log de auditoría en construcción</div>
                <div style={{ fontSize: '0.78rem' }}>Todas las consultas, reportes y modificaciones serán registradas aquí con timestamp y usuario.</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── REPORTE WIZARD MODAL ── */}
      {showReporteWizard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => {}}>
          <div style={{ background: '#0F1729', border: `1px solid ${navyBorder}`, borderRadius: '18px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', fontFamily: font }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${navyBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#0F1729', zIndex: 1 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                  {[1,2,3].map(s => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: reporteStep >= s ? accent : 'rgba(255,255,255,0.06)', border: `1px solid ${reporteStep >= s ? accent : navyBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '700', color: reporteStep >= s ? 'white' : textMuted }}>{s}</div>
                      {s < 3 && <div style={{ width: '24px', height: '1px', background: reporteStep > s ? accent : navyBorder }} />}
                    </div>
                  ))}
                </div>
                <h2 style={{ color: textPrimary, fontSize: '0.95rem', fontWeight: '700', margin: 0 }}>
                  {reporteStep === 1 ? 'Tipo y período' : reporteStep === 2 ? 'Captura de operaciones' : 'Revisión y generación'}
                </h2>
              </div>
              <button onClick={() => setShowReporteWizard(false)} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${navyBorder}`, borderRadius: '6px', width: '30px', height: '30px', cursor: 'pointer', color: textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }}>✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {reporteStep === 1 && (
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  <div>
                    <label style={{ color: textMuted, fontSize: '0.68rem', fontWeight: '600', letterSpacing: '0.08em', display: 'block', marginBottom: '0.6rem' }}>TIPO DE REPORTE</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                      {([{v:'1' as const,l:'Operaciones Relevantes',sub:'Art. 66 · Trimestral',c:accent},{v:'2' as const,l:'Operaciones Inusuales',sub:'Art. 69 · 3 días hábiles',c:accentYellow},{v:'3' as const,l:'Ops. Internas Preocupantes',sub:'Art. 75 · 3 días hábiles',c:accentRed}]).map(t => (
                        <button key={t.v} onClick={() => setReporteTipo(t.v)} style={{ padding: '1rem 0.75rem', borderRadius: '10px', cursor: 'pointer', border: `1.5px solid ${reporteTipo === t.v ? t.c : navyBorder}`, background: reporteTipo === t.v ? `${t.c}12` : 'rgba(255,255,255,0.02)', textAlign: 'left', fontFamily: font }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.c, marginBottom: '0.6rem' }} />
                          <div style={{ color: textPrimary, fontSize: '0.82rem', fontWeight: '600', marginBottom: '0.2rem' }}>{t.l}</div>
                          <div style={{ color: textMuted, fontSize: '0.68rem' }}>{t.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ color: textMuted, fontSize: '0.68rem', fontWeight: '600', letterSpacing: '0.08em', display: 'block', marginBottom: '0.4rem' }}>PERÍODO (AAAAMM)</label>
                      <input type="month" id="reporte-periodo" defaultValue={new Date().toISOString().slice(0,7)} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${navyBorder}`, borderRadius: '8px', padding: '0.65rem 0.9rem', color: textPrimary, fontSize: '0.85rem', fontFamily: fontMono }} />
                    </div>
                    <div>
                      <label style={{ color: textMuted, fontSize: '0.68rem', fontWeight: '600', letterSpacing: '0.08em', display: 'block', marginBottom: '0.4rem' }}>FOLIO INICIAL</label>
                      <input placeholder="000001" maxLength={6} id="reporte-folio" defaultValue="000001" style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${navyBorder}`, borderRadius: '8px', padding: '0.65rem 0.9rem', color: textPrimary, fontSize: '0.85rem', fontFamily: fontMono }} />
                    </div>
                  </div>
                  <div style={{ padding: '0.85rem 1rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '8px' }}>
                    <div style={{ color: '#60A5FA', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.3rem' }}>Datos precargados (CASFIM 065-022)</div>
                    <div style={{ color: textMuted, fontSize: '0.72rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.2rem' }}>
                      <span>Órgano supervisor: <span style={{ fontFamily: fontMono, color: textSecondary }}>{CASFIM_SUPERVISOR} (CNBV)</span></span>
                      <span>Clave entidad: <span style={{ fontFamily: fontMono, color: textSecondary }}>{CASFIM_ENTIDAD}</span></span>
                      <span>Razón social: <span style={{ color: textSecondary }}>PorCuanto S.A. de C.V.</span></span>
                      <span>Sucursal: <span style={{ fontFamily: fontMono, color: textSecondary }}>0 (sin sucursal)</span></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => setReporteStep(2)} style={{ background: accent, color: 'white', border: 'none', borderRadius: '9px', padding: '0.75rem 1.5rem', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer', fontFamily: font }}>Continuar →</button>
                  </div>
                </div>
              )}
              {reporteStep === 2 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ color: textSecondary, fontSize: '0.82rem' }}>{reporteOps.length} operación{reporteOps.length !== 1 ? 'es' : ''} capturada{reporteOps.length !== 1 ? 's' : ''}</span>
                    <label style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '7px', padding: '0.35rem 0.8rem', fontSize: '0.75rem', color: '#60A5FA', cursor: 'pointer', fontFamily: font }}>
                      <input type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={() => alert('Carga Excel próximamente')} />↑ Excel
                    </label>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${navyBorder}`, borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      {([
                        {label:'FECHA OPERACIÓN',key:'fecha_operacion',type:'date',mono:true},
                        {label:'TIPO OPERACIÓN',key:'tipo_operacion',type:'select',opts:TIPO_OP},
                        {label:'NOMBRE / RAZÓN SOCIAL',key:'nombre_cliente',placeholder:'Nombre completo'},
                        {label:'RFC',key:'rfc_cliente',placeholder:'RFC',mono:true},
                        {label:'MONTO',key:'monto',placeholder:'0.00',mono:true},
                        {label:'MONEDA',key:'moneda',type:'select',opts:MONEDAS},
                        {label:'NACIONALIDAD (1=MX 2=EXT)',key:'nacionalidad',placeholder:'1',mono:true},
                        {label:'TIPO CLIENTE',key:'tipo_cliente',type:'select',opts:[{v:'1',l:'Inversionista'},{v:'2',l:'Solicitante'},{v:'3',l:'Relacionado'}]},
                      ] as {label:string,key:string,type?:string,placeholder?:string,mono?:boolean,opts?:{v:string,l:string}[]}[]).map(f => (
                        <div key={f.key}>
                          <label style={{ color: textMuted, fontSize: '0.62rem', fontWeight: '600', letterSpacing: '0.06em', display: 'block', marginBottom: '0.25rem' }}>{f.label}</label>
                          {f.type === 'select' ? (
                            <select value={(reporteCurrentOp as Record<string,string>)[f.key]||''} onChange={e => setReporteCurrentOp(p=>({...p,[f.key]:e.target.value}))} style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:`1px solid ${navyBorder}`, borderRadius:'7px', padding:'0.5rem 0.7rem', color:textPrimary, fontSize:'0.8rem', fontFamily:font }}>
                              <option value="">Seleccionar...</option>
                              {f.opts!.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                            </select>
                          ) : (
                            <input type={f.type||'text'} value={(reporteCurrentOp as Record<string,string>)[f.key]||''} onChange={e => setReporteCurrentOp(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:`1px solid ${navyBorder}`, borderRadius:'7px', padding:'0.5rem 0.7rem', color:textPrimary, fontSize:'0.8rem', fontFamily:f.mono?fontMono:font }} />
                          )}
                        </div>
                      ))}
                      <div style={{ gridColumn:'1/-1' }}>
                        <label style={{ color: textMuted, fontSize: '0.62rem', fontWeight: '600', letterSpacing: '0.06em', display: 'block', marginBottom: '0.25rem' }}>DESCRIPCIÓN (Campo 35)</label>
                        <textarea rows={2} value={reporteCurrentOp.descripcion||''} onChange={e => setReporteCurrentOp(p=>({...p,descripcion:e.target.value}))} placeholder="Descripción de la operación..." style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:`1px solid ${navyBorder}`, borderRadius:'7px', padding:'0.5rem 0.7rem', color:textPrimary, fontSize:'0.8rem', fontFamily:font, resize:'vertical' }} />
                      </div>
                      {(reporteTipo==='2'||reporteTipo==='3') && (
                        <div style={{ gridColumn:'1/-1' }}>
                          <label style={{ color: accentYellow, fontSize: '0.62rem', fontWeight: '600', letterSpacing: '0.06em', display: 'block', marginBottom: '0.25rem' }}>RAZÓN DE INUSUALIDAD (Campo 36) — OBLIGATORIO</label>
                          <textarea rows={2} value={reporteCurrentOp.razon_inusualidad||''} onChange={e => setReporteCurrentOp(p=>({...p,razon_inusualidad:e.target.value}))} placeholder="Criterios, señales de alerta y análisis..." style={{ width:'100%', background:'rgba(245,158,11,0.04)', border:`1px solid rgba(245,158,11,0.2)`, borderRadius:'7px', padding:'0.5rem 0.7rem', color:textPrimary, fontSize:'0.8rem', fontFamily:font, resize:'vertical' }} />
                        </div>
                      )}
                    </div>
                    <button onClick={() => {
                      if (!reporteCurrentOp.fecha_operacion||!reporteCurrentOp.monto) return
                      const folio = String(reporteOps.length+1).padStart(6,'0')
                      setReporteOps(p => [...p, {...reporteCurrentOp, folio} as ReporteOp])
                      setReporteCurrentOp({})
                    }} style={{ marginTop:'0.85rem', background:accentGreen, color:'white', border:'none', borderRadius:'8px', padding:'0.55rem 1.25rem', fontSize:'0.82rem', fontWeight:'600', cursor:'pointer', fontFamily:font }}>
                      + Agregar operación
                    </button>
                  </div>
                  {reporteOps.length > 0 && (
                    <div style={{ border:`1px solid ${navyBorder}`, borderRadius:'8px', overflow:'hidden', marginBottom:'1rem' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead><tr style={{ background:'rgba(255,255,255,0.02)', borderBottom:`1px solid ${navyBorder}` }}>
                          {['Folio','Fecha','Cliente','Monto',''].map(h => <th key={h} style={{ padding:'0.45rem 0.75rem', textAlign:'left', color:textMuted, fontSize:'0.62rem', fontWeight:'600' }}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {reporteOps.map((op,i) => (
                            <tr key={i} style={{ borderBottom:`1px solid ${navyBorder}` }}>
                              <td style={{ padding:'0.45rem 0.75rem', fontFamily:fontMono, fontSize:'0.7rem', color:textMuted }}>{op.folio}</td>
                              <td style={{ padding:'0.45rem 0.75rem', fontSize:'0.75rem', color:textSecondary }}>{op.fecha_operacion}</td>
                              <td style={{ padding:'0.45rem 0.75rem', fontSize:'0.75rem', color:textPrimary }}>{op.nombre_cliente||'—'} <span style={{ color:textMuted, fontFamily:fontMono, fontSize:'0.65rem' }}>{op.rfc_cliente}</span></td>
                              <td style={{ padding:'0.45rem 0.75rem', fontFamily:fontMono, fontSize:'0.75rem', color:textPrimary }}>{Number(op.monto||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'})}</td>
                              <td style={{ padding:'0.45rem 0.75rem' }}><button onClick={() => setReporteOps(p => p.filter((_,idx) => idx!==i))} style={{ background:'none', border:'none', color:accentRed, cursor:'pointer', fontSize:'0.75rem' }}>✕</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <button onClick={() => setReporteStep(1)} style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${navyBorder}`, borderRadius:'9px', padding:'0.65rem 1.25rem', fontSize:'0.83rem', color:textSecondary, cursor:'pointer', fontFamily:font }}>← Anterior</button>
                    <button onClick={() => reporteOps.length > 0 && setReporteStep(3)} disabled={reporteOps.length === 0} style={{ background:reporteOps.length > 0 ? accent : 'rgba(59,130,246,0.2)', color:'white', border:'none', borderRadius:'9px', padding:'0.65rem 1.5rem', fontSize:'0.83rem', fontWeight:'600', cursor:reporteOps.length>0?'pointer':'not-allowed', fontFamily:font }}>
                      Revisar → ({reporteOps.length} ops)
                    </button>
                  </div>
                </div>
              )}
              {reporteStep === 3 && (
                <div>
                  <div style={{ background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:'10px', padding:'1.25rem', marginBottom:'1.25rem' }}>
                    <div style={{ color:'#60A5FA', fontSize:'0.78rem', fontWeight:'700', marginBottom:'0.75rem' }}>RESUMEN DEL REPORTE</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.75rem' }}>
                      {[
                        {l:'Tipo',v:reporteTipo==='1'?'Relevante':reporteTipo==='2'?'Inusual':'Preocupante'},
                        {l:'CASFIM',v:CASFIM_ENTIDAD},
                        {l:'Supervisor',v:CASFIM_SUPERVISOR},
                        {l:'Operaciones',v:String(reporteOps.length)},
                        {l:'Monto total',v:reporteOps.reduce((s,o)=>s+Number(o.monto||0),0).toLocaleString('es-MX',{style:'currency',currency:'MXN'})},
                        {l:'Folio inicial',v:'000001'},
                      ].map(item => (
                        <div key={item.l} style={{ background:'rgba(255,255,255,0.03)', padding:'0.65rem 0.85rem', borderRadius:'7px' }}>
                          <div style={{ color:textMuted, fontSize:'0.65rem', marginBottom:'0.2rem' }}>{item.l}</div>
                          <div style={{ color:textPrimary, fontSize:'0.82rem', fontWeight:'600', fontFamily:fontMono }}>{item.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background:'rgba(16,185,129,0.04)', border:'1px solid rgba(16,185,129,0.15)', borderRadius:'8px', padding:'0.85rem 1rem', marginBottom:'1.25rem' }}>
                    <div style={{ color:accentGreen, fontSize:'0.78rem', fontWeight:'600' }}>✓ Layout listo para SITI PLD/FT (websitipld.cnbv.gob.mx)</div>
                    <div style={{ color:textMuted, fontSize:'0.72rem', marginTop:'0.2rem' }}>Nomenclatura del archivo: {reporteTipo}{(new Date().toISOString().slice(0,7).replace('-',''))}{CASFIM_ENTIDAD}.txt</div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:'0.75rem' }}>
                    <button onClick={() => setReporteStep(2)} style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${navyBorder}`, borderRadius:'9px', padding:'0.65rem 1.25rem', fontSize:'0.83rem', color:textSecondary, cursor:'pointer', fontFamily:font }}>← Editar</button>
                    <div style={{ display:'flex', gap:'0.5rem' }}>
                      <button onClick={() => {
                        const periodo = (document.getElementById('reporte-periodo') as HTMLInputElement)?.value?.replace('-','') || new Date().toISOString().slice(0,7).replace('-','')
                        setReportesGuardados(p => [{id:crypto.randomUUID(),tipo:reporteTipo,periodo,folio_inicial:'000001',num_ops:reporteOps.length,status:'borrador' as const,created_at:new Date().toISOString()},...p])
                        setShowReporteWizard(false)
                      }} style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${navyBorder}`, borderRadius:'9px', padding:'0.65rem 1.25rem', fontSize:'0.83rem', color:textSecondary, cursor:'pointer', fontFamily:font }}>
                        Guardar borrador
                      </button>
                      <button onClick={() => {
                        const periodo = (document.getElementById('reporte-periodo') as HTMLInputElement)?.value?.replace('-','') || new Date().toISOString().slice(0,7).replace('-','')
                        const lines = reporteOps.map((op,i) => [reporteTipo,periodo,String(i+1).padStart(6,'0'),CASFIM_SUPERVISOR,CASFIM_ENTIDAD,'0',op.fecha_operacion?.replace(/-/g,'')||'',op.tipo_operacion||'01',op.monto||'0',op.moneda||'MXP',op.nacionalidad||'1',op.nombre_cliente||'',op.rfc_cliente||'',op.descripcion||'',op.razon_inusualidad||''].join('|')).join('\n')
                        const blob = new Blob([lines],{type:'text/plain'})
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a'); a.href=url; a.download=`${reporteTipo}${periodo}${CASFIM_ENTIDAD}.txt`; a.click(); URL.revokeObjectURL(url)
                        setReportesGuardados(p => [{id:crypto.randomUUID(),tipo:reporteTipo,periodo,folio_inicial:'000001',num_ops:reporteOps.length,status:'listo' as const,created_at:new Date().toISOString()},...p])
                        setShowReporteWizard(false)
                      }} style={{ background:accentGreen, color:'white', border:'none', borderRadius:'9px', padding:'0.65rem 1.5rem', fontSize:'0.83rem', fontWeight:'600', cursor:'pointer', fontFamily:font }}>
                        ↓ Generar layout .txt
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL NUEVO INVERSIONISTA ── */}
      {showAddInv && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.15s ease' }} onClick={() => setShowAddInv(false)}>
          <div style={{ background: navyLight, border: `1px solid ${navyBorder}`, borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '500px', fontFamily: font }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: textPrimary, fontSize: '1rem', fontWeight: '700', margin: 0 }}>Nuevo Inversionista</h2>
              <button onClick={() => setShowAddInv(false)} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${navyBorder}`, borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', color: textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }}>✕</button>
            </div>
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              {[
                { label: 'NOMBRE COMPLETO *', key: 'nombre', placeholder: 'Juan García López' },
                { label: 'RFC *', key: 'rfc', placeholder: 'GALJ900101H01', mono: true },
                { label: 'EMAIL *', key: 'email', placeholder: 'juan@empresa.com' },
                { label: 'FUENTE DE RECURSOS', key: 'fuente_recursos', placeholder: 'Ej. Salarios, Negocio propio...' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ color: textMuted, fontSize: '0.68rem', fontWeight: '600', letterSpacing: '0.08em', display: 'block', marginBottom: '0.35rem' }}>{f.label}</label>
                  <input value={(newInv as Record<string, string>)[f.key] || ''} onChange={e => setNewInv(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${navyBorder}`, borderRadius: '8px', padding: '0.65rem 0.9rem', color: textPrimary, fontSize: '0.85rem', fontFamily: f.mono ? fontMono : font }} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.68rem', fontWeight: '600', letterSpacing: '0.08em', display: 'block', marginBottom: '0.35rem' }}>TIPO</label>
                  <select value={newInv.tipo} onChange={e => setNewInv(prev => ({ ...prev, tipo: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${navyBorder}`, borderRadius: '8px', padding: '0.65rem 0.9rem', color: textPrimary, fontSize: '0.85rem', fontFamily: font }}>
                    <option value="persona_fisica">Persona Física</option>
                    <option value="persona_moral">Persona Moral</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.68rem', fontWeight: '600', letterSpacing: '0.08em', display: 'block', marginBottom: '0.35rem' }}>PAÍS</label>
                  <select value={newInv.pais} onChange={e => setNewInv(prev => ({ ...prev, pais: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${navyBorder}`, borderRadius: '8px', padding: '0.65rem 0.9rem', color: textPrimary, fontSize: '0.85rem', fontFamily: font }}>
                    <option value="MX">México</option>
                    <option value="US">Estados Unidos</option>
                    <option value="CO">Colombia</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', padding: '0.65rem 0.9rem', borderRadius: '8px', background: newInv.pep ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${newInv.pep ? 'rgba(239,68,68,0.2)' : navyBorder}` }}>
                <input type="checkbox" checked={newInv.pep} onChange={e => setNewInv(prev => ({ ...prev, pep: e.target.checked }))} style={{ accentColor: accentRed, width: '15px', height: '15px' }} />
                <div>
                  <div style={{ color: newInv.pep ? accentRed : textSecondary, fontSize: '0.82rem', fontWeight: '500' }}>Persona Expuesta Políticamente (PEP)</div>
                  <div style={{ color: textMuted, fontSize: '0.7rem' }}>Cargos públicos, familiares o colaboradores cercanos</div>
                </div>
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button onClick={() => setShowAddInv(false)} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${navyBorder}`, borderRadius: '9px', padding: '0.75rem', fontSize: '0.85rem', color: textSecondary, cursor: 'pointer', fontFamily: font }}>Cancelar</button>
              <button onClick={handleAddInversionista} disabled={invSaving || !newInv.nombre || !newInv.rfc || !newInv.email}
                style={{ background: newInv.nombre && newInv.rfc && newInv.email ? accent : 'rgba(59,130,246,0.2)', color: 'white', border: 'none', borderRadius: '9px', padding: '0.75rem', fontSize: '0.85rem', fontWeight: '600', cursor: newInv.nombre && newInv.rfc && newInv.email ? 'pointer' : 'not-allowed', fontFamily: font }}>
                {invSaving ? 'Guardando...' : 'Registrar inversionista'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
