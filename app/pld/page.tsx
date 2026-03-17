'use client'
import * as XLSX from 'xlsx'
import { useEffect, useState, useCallback, useRef } from 'react'
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
  // Campos de referencia (1-6)
  folio: string
  // Campo 7: localidad
  localidad: string
  // Campo 8: tipo instrumento
  tipo_instrumento: string
  // Campo 9: tipo operación
  tipo_operacion: string
  // Campo 10: número cuenta/contrato
  num_cuenta: string
  // Campo 11-12: monto y moneda
  monto: string
  moneda: string
  // Campo 13: fecha operación
  fecha_operacion: string
  // Campo 14: tipo persona
  tipo_persona: string
  // Campo 15: nacionalidad
  nacionalidad: string
  // Campo 16: tipo relación
  tipo_relacion: string
  // Campos 17-19: nombre y apellidos
  nombre_cliente: string
  apellido_paterno: string
  apellido_materno: string
  // Campo 20-21: RFC y CURP
  rfc_cliente: string
  curp_cliente: string
  // Campo 22: fecha nacimiento
  fecha_nacimiento: string
  // Campo 23: país
  pais_cliente: string
  // Campo 24: actividad económica
  actividad_economica: string
  // Campos 35-36: descripción y razón
  descripcion: string
  razon_inusualidad?: string
  // Relación cliente / tipo
  tipo_cliente: string
}

interface ReporteGuardado {
  id: string
  tipo: '1' | '2' | '3'
  periodo: string
  folio_inicial: string
  num_ops: number
  monto_total?: number
  status: 'borrador' | 'listo' | 'enviado'
  ops?: ReporteOp[]
  created_by?: string
  created_at: string
  updated_at?: string
}

interface Hallazgo {
  id: string
  auditoria_id: string
  area: string
  descripcion: string
  riesgo: 'bajo' | 'medio' | 'alto' | 'critico'
  recomendacion: string
  responsable: string
  fecha_compromiso: string
  status: 'abierto' | 'en_proceso' | 'cerrado'
  created_at: string
}

interface Auditoria {
  id: string
  ejercicio: number
  status: 'en_proceso' | 'completada' | 'enviada_cnbv'
  auditor_nombre: string
  auditor_certificacion: string
  fecha_inicio: string
  fecha_conclusion: string
  fecha_presentacion_consejo: string
  observaciones: string
  calificacion: string
  pld_auditoria_hallazgos?: Hallazgo[]
  created_by?: string
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

// ─── Catálogos CNBV/UIF layout ITF (DOF 24/03/2020 + Res. UIF 22/04/2021) ──────
const CAT_TIPO_OP = [
  { v: '01', l: '01 — Depósito en efectivo MN' },
  { v: '02', l: '02 — Retiro en efectivo MN' },
  { v: '03', l: '03 — Depósito en efectivo ME' },
  { v: '04', l: '04 — Retiro en efectivo ME' },
  { v: '05', l: '05 — Transferencia / traspaso recibido' },
  { v: '06', l: '06 — Transferencia / traspaso enviado' },
  { v: '07', l: '07 — Transferencia internacional recibida' },
  { v: '08', l: '08 — Transferencia internacional enviada' },
  { v: '09', l: '09 — Compra de divisas' },
  { v: '10', l: '10 — Venta de divisas' },
  { v: '11', l: '11 — Compra de activos virtuales' },
  { v: '12', l: '12 — Venta de activos virtuales' },
  { v: '13', l: '13 — Financiamiento colectivo — inversión recibida' },
  { v: '14', l: '14 — Financiamiento colectivo — financiamiento otorgado' },
  { v: '15', l: '15 — Pago de financiamiento colectivo' },
  { v: '16', l: '16 — Rendimientos / intereses pagados' },
  { v: '17', l: '17 — Comisiones cobradas' },
  { v: '99', l: '99 — Otro' },
]

const CAT_TIPO_INSTRUMENTO = [
  { v: '01', l: '01 — Cuenta de depósito a la vista' },
  { v: '02', l: '02 — Cuenta de ahorro' },
  { v: '03', l: '03 — Tarjeta de débito' },
  { v: '04', l: '04 — Tarjeta de crédito' },
  { v: '05', l: '05 — Crédito personal' },
  { v: '06', l: '06 — Crédito hipotecario' },
  { v: '07', l: '07 — Crédito automotriz' },
  { v: '08', l: '08 — Crédito empresarial' },
  { v: '20', l: '20 — Cuenta / contrato IFC (financiamiento colectivo)' },
  { v: '21', l: '21 — Instrumento de deuda colectivo' },
  { v: '22', l: '22 — Instrumento de capital colectivo' },
  { v: '23', l: '23 — Cartera de activos virtuales' },
  { v: '24', l: '24 — Fondo de pago electrónico' },
  { v: '99', l: '99 — Otro instrumento financiero' },
]

const CAT_TIPO_RELACION = [
  { v: '01', l: '01 — Cliente / inversionista' },
  { v: '02', l: '02 — Usuario' },
  { v: '03', l: '03 — Solicitante de financiamiento' },
  { v: '04', l: '04 — Empleado / funcionario' },
  { v: '05', l: '05 — Consejero / directivo' },
  { v: '06', l: '06 — Accionista / socio' },
  { v: '07', l: '07 — Apoderado legal' },
  { v: '08', l: '08 — Beneficiario' },
  { v: '09', l: '09 — Prospecto' },
  { v: '10', l: '10 — Persona relacionada' },
]

const CAT_MONEDA = [
  { v: 'MXP', l: 'MXP — Peso mexicano' },
  { v: 'USD', l: 'USD — Dólar americano' },
  { v: 'EUR', l: 'EUR — Euro' },
  { v: 'GBP', l: 'GBP — Libra esterlina' },
  { v: 'CAD', l: 'CAD — Dólar canadiense' },
  { v: 'JPY', l: 'JPY — Yen japonés' },
  { v: 'CHF', l: 'CHF — Franco suizo' },
  { v: 'BTC', l: 'BTC — Bitcoin (activo virtual)' },
  { v: 'ETH', l: 'ETH — Ethereum (activo virtual)' },
  { v: 'USDT', l: 'USDT — Tether (activo virtual)' },
]

const CAT_PAIS = [
  { v: 'MEX', l: 'MEX — México' },
  { v: 'USA', l: 'USA — Estados Unidos' },
  { v: 'COL', l: 'COL — Colombia' },
  { v: 'ARG', l: 'ARG — Argentina' },
  { v: 'BRA', l: 'BRA — Brasil' },
  { v: 'CHL', l: 'CHL — Chile' },
  { v: 'PER', l: 'PER — Perú' },
  { v: 'ESP', l: 'ESP — España' },
  { v: 'CAN', l: 'CAN — Canadá' },
  { v: 'GBR', l: 'GBR — Reino Unido' },
  { v: 'CHN', l: 'CHN — China' },
  { v: 'OTR', l: 'OTR — Otro' },
]

const CAT_LOCALIDAD = [
  { v: '09000001', l: '09000001 — Ciudad de México' },
  { v: '15000001', l: '15000001 — Estado de México' },
  { v: '19000001', l: '19000001 — Nuevo León' },
  { v: '14000001', l: '14000001 — Jalisco' },
  { v: '21000001', l: '21000001 — Puebla' },
  { v: '30000001', l: '30000001 — Veracruz' },
  { v: '25000001', l: '25000001 — Sinaloa' },
  { v: '06000001', l: '06000001 — Colima' },
  { v: '11000001', l: '11000001 — Guanajuato' },
  { v: '24000001', l: '24000001 — San Luis Potosí' },
  { v: '99000000', l: '99000000 — Otra / No aplica' },
]

// Backward compat alias
const TIPO_OP = CAT_TIPO_OP
const MONEDAS = CAT_MONEDA

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
  const [sessionWarning, setSessionWarning] = useState(false)
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const INACTIVITY_LIMIT = 30 * 60 * 1000 // 30 min
  const WARNING_BEFORE = 5 * 60 * 1000    // warning 5 min before

  // Reporte wizard state
  const [showReporteWizard, setShowReporteWizard] = useState(false)
  const [reporteStep, setReporteStep] = useState(1)
  const [reporteTipo, setReporteTipo] = useState<'1'|'2'|'3'>('1')
  const [reporteOps, setReporteOps] = useState<ReporteOp[]>([])
  const [reporteCurrentOp, setReporteCurrentOp] = useState<Partial<ReporteOp>>({})
  const [reportesGuardados, setReportesGuardados] = useState<ReporteGuardado[]>([])
  const [reportesLoading, setReportesLoading] = useState(false)

  // Auditoria state
  const [auditorias, setAuditorias] = useState<Auditoria[]>([])
  const [auditoriaLoading, setAuditoriaLoading] = useState(false)
  const [showAuditoriaForm, setShowAuditoriaForm] = useState(false)
  const [selectedAuditoria, setSelectedAuditoria] = useState<Auditoria | null>(null)
  const [newAuditoria, setNewAuditoria] = useState({ ejercicio: new Date().getFullYear(), auditor_nombre: '', auditor_certificacion: '', fecha_inicio: '', fecha_conclusion: '', observaciones: '', calificacion: '' })
  const [newHallazgo, setNewHallazgo] = useState({ area: '', descripcion: '', riesgo: 'medio', recomendacion: '', responsable: '', fecha_compromiso: '' })
  const [showHallazgoForm, setShowHallazgoForm] = useState(false)
  const [hallazgoSaving, setHallazgoSaving] = useState(false)

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

  const loadInversionistas = async () => {
    if (!sessionToken) return
    setLoading(true)
    const res = await fetch('/api/v1/pld/inversionistas', { headers: { 'Authorization': 'Bearer ' + sessionToken } })
    if (res.ok) {
      const d = await res.json()
      setInversionistas(d.inversionistas.map((inv: Record<string,unknown>) => ({
        id: String(inv.id||''), nombre: String(inv.razon_social||(String(inv.nombre||'')+' '+String(inv.apellido_paterno||'')+' '+String(inv.apellido_materno||'')).trim()),
        rfc: String(inv.rfc||''), tipo: String(inv.tipo_persona||'Fisica'), email: String(inv.email||''),
        fuente_recursos: String(inv.actividad_economica||''), pais: String(inv.clave_pais||'MEX'),
        pep: Boolean(inv.pep), nivel_riesgo: (inv.nivel_riesgo as 'bajo'|'medio'|'alto')||'medio',
      })))
    }
    setLoading(false)
  }

  const loadSolicitantes = useCallback(async () => {
    if (!sessionToken) return
    const res = await fetch('/api/v1/kyc/admin/empresas', { headers: { 'Authorization': 'Bearer ' + sessionToken } })
    if (res.ok) { const d = await res.json(); setSolicitantes(d.empresas || []) }
  }, [sessionToken])

  useEffect(() => {
    if (section === 'inversionistas' && sessionToken) loadInversionistas()
    if (section === 'solicitantes' && sessionToken) loadSolicitantes()
    if (section === 'reportes' && sessionToken) loadReportes()
    if (section === 'auditoria' && sessionToken) loadAuditorias()
  }, [section, sessionToken, loadSolicitantes])

  const loadReportes = async (token?: string) => {
    setReportesLoading(true)
    const t = token || sessionToken
    if (!t) { setReportesLoading(false); return }
    const res = await fetch('/api/v1/pld/reportes', { headers: { 'Authorization': 'Bearer ' + t } })
    if (res.ok) { const d = await res.json(); setReportesGuardados(d.reportes || []) }
    setReportesLoading(false)
  }

  const loadAuditorias = async (token?: string) => {
    setAuditoriaLoading(true)
    const t = token || sessionToken
    if (!t) { setAuditoriaLoading(false); return }
    const res = await fetch('/api/v1/pld/auditoria', { headers: { 'Authorization': 'Bearer ' + t } })
    if (res.ok) { const d = await res.json(); setAuditorias(d.auditorias || []) }
    setAuditoriaLoading(false)
  }

  const saveReporte = async (reporte: Omit<ReporteGuardado, 'id' | 'created_at'>) => {
    const res = await fetch('/api/v1/pld/reportes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessionToken },
      body: JSON.stringify(reporte)
    })
    if (res.ok) { const d = await res.json(); setReportesGuardados(p => [d.reporte, ...p]) }
  }

  const updateReporteStatus = async (id: string, status: string) => {
    await fetch('/api/v1/pld/reportes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessionToken },
      body: JSON.stringify({ id, status })
    })
    setReportesGuardados(p => p.map(r => r.id === id ? { ...r, status: status as ReporteGuardado['status'] } : r))
  }

  const saveAuditoria = async () => {
    const res = await fetch('/api/v1/pld/auditoria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessionToken },
      body: JSON.stringify({ ...newAuditoria, status: 'en_proceso' })
    })
    if (res.ok) {
      const d = await res.json()
      setAuditorias(p => [d.auditoria, ...p])
      setShowAuditoriaForm(false)
      setSelectedAuditoria(d.auditoria)
    }
  }

  const saveHallazgo = async () => {
    if (!selectedAuditoria || !newHallazgo.area || !newHallazgo.descripcion) return
    setHallazgoSaving(true)
    const res = await fetch('/api/v1/pld/auditoria/hallazgos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessionToken },
      body: JSON.stringify({ ...newHallazgo, auditoria_id: selectedAuditoria.id })
    })
    if (res.ok) {
      const d = await res.json()
      setAuditorias(p => p.map(a => a.id === selectedAuditoria.id ? { ...a, pld_auditoria_hallazgos: [...(a.pld_auditoria_hallazgos || []), d.hallazgo] } : a))
      setSelectedAuditoria(prev => prev ? { ...prev, pld_auditoria_hallazgos: [...(prev.pld_auditoria_hallazgos || []), d.hallazgo] } : prev)
      setNewHallazgo({ area: '', descripcion: '', riesgo: 'medio', recomendacion: '', responsable: '', fecha_compromiso: '' })
      setShowHallazgoForm(false)
    }
    setHallazgoSaving(false)
  }

  const updateHallazgoStatus = async (id: string, status: string) => {
    await fetch('/api/v1/pld/auditoria/hallazgos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessionToken },
      body: JSON.stringify({ id, status })
    })
    setAuditorias(p => p.map(a => ({ ...a, pld_auditoria_hallazgos: a.pld_auditoria_hallazgos?.map(h => h.id === id ? { ...h, status: status as Hallazgo['status'] } : h) })) as Auditoria[])
    setSelectedAuditoria(prev => prev ? { ...prev, pld_auditoria_hallazgos: prev.pld_auditoria_hallazgos?.map(h => h.id === id ? { ...h, status: status as Hallazgo['status'] } : h) } : prev)
  }

  const resetInactivityTimer = useCallback(() => {
    setSessionWarning(false)
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    if (warningTimer.current) clearTimeout(warningTimer.current)
    warningTimer.current = setTimeout(() => setSessionWarning(true), INACTIVITY_LIMIT - WARNING_BEFORE)
    inactivityTimer.current = setTimeout(async () => {
      const supabase = (await import('@/lib/supabase-client')).createClient()
      await supabase.auth.signOut()
      window.location.href = '/pld/login'
    }, INACTIVITY_LIMIT)
  }, [INACTIVITY_LIMIT, WARNING_BEFORE])

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, resetInactivityTimer, { passive: true }))
    resetInactivityTimer()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer))
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      if (warningTimer.current) clearTimeout(warningTimer.current)
    }
  }, [resetInactivityTimer])

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
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { margin: 0; padding: 0; overflow-x: hidden; }
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
                  <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setLoading(true)
                    try {
                      const buf = await file.arrayBuffer()
                      const wb = XLSX.read(buf, { type: 'array' })
                      const ws = wb.Sheets[wb.SheetNames[0]]
                      const raw = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]
                      let hdrIdx = 0
                      for (let i = 0; i < Math.min(5, raw.length); i++) {
                        const r = raw[i] as string[]
                        if (r.some(c => String(c||'').toUpperCase().includes('IDENTIFICADOR') || String(c||'').toUpperCase().includes('TIPO DE CLIENTE'))) { hdrIdx = i; break }
                      }
                      const headers = (raw[hdrIdx] as string[]).map(h => String(h||'').trim().toUpperCase())
                      const H = (name: string) => headers.findIndex(h => h.includes(name))
                      const fmtDate = (v: unknown) => { if (!v) return ''; const s = String(Math.round(Number(v))); return s.length===8?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`:String(v) }
                      const rows = []
                      for (let i = hdrIdx + 1; i < raw.length; i++) {
                        const r = raw[i] as unknown[]
                        if (!r || !r[1]) continue
                        rows.push({
                          id_cliente: String(r[H('IDENTIFICADOR DEL CLIENTE')+1>=1?H('IDENTIFICADOR DEL CLIENTE'):1]||''),
                          id_financiamiento: String(r[H('IDENTIFICADOR DEL FINANC')+1>=1?H('IDENTIFICADOR DEL FINANC'):2]||''),
                          num_cuenta: String(r[10]||''),
                          tipo_persona: r[14]==1?'Física':'Moral',
                          razon_social: String(r[16]||`${r[17]||''} ${r[18]||''} ${r[19]||''}`.trim()),
                          nombre: String(r[17]||''), apellido_paterno: String(r[18]||''), apellido_materno: String(r[19]||''),
                          genero: r[20]==1?'M':'F',
                          rfc: String(r[21]||'').toUpperCase(), curp: String(r[22]||'').toUpperCase(),
                          fecha_nacimiento: fmtDate(r[23]), entidad_nacimiento: String(r[24]||''),
                          clave_pais: String(r[15]||'260'), entidad_domicilio: String(r[26]||''),
                          calle: String(r[27]||''), colonia: String(r[28]||''), cp: String(r[31]||''), ciudad: String(r[30]||''),
                          telefono: String(r[32]||''), email: String(r[33]||'').toLowerCase(),
                          actividad_economica: String(r[34]||''), id_actividad: String(r[35]||''),
                          tipo_operacion: String(r[36]||'2'),
                          monto: Number(r[38]||0), tipo_inversionista: String(r[40]||''),
                          moneda: String(r[42]||'MXN'), tasa: Number(r[43]||0.055),
                          fecha_operacion: fmtDate(r[47]), forma_pago: String(r[51]||'SPEI'),
                          grado_riesgo: String(r[53]||''), nivel_riesgo: 'medio', pep: false,
                        })
                      }
                      if (rows.length === 0) { alert('Sin registros encontrados'); setLoading(false); return }
                      const res = await fetch('/api/v1/pld/inversionistas', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessionToken },
                        body: JSON.stringify({ rows })
                      })
                      const d = await res.json()
                      if (res.ok) { alert(`✓ ${d.inserted} inversionistas importados`); loadInversionistas() }
                      else alert('Error: ' + d.error)
                    } catch(err) { alert('Error al procesar: ' + String(err)) }
                    setLoading(false); e.target.value = ''
                  }} />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ color: textPrimary, fontSize: '1.4rem', fontWeight: '700', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>Auditoría Anual PLD/FT</h1>
                <p style={{ color: textMuted, fontSize: '0.82rem', margin: 0 }}>Revisión anual · Auditor externo certificado CNBV · Conservación 5 años</p>
              </div>
              <button onClick={() => { setShowAuditoriaForm(true); setSelectedAuditoria(null) }}
                style={{ background: accent, color: 'white', border: 'none', borderRadius: '9px', padding: '0.55rem 1.1rem', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', fontFamily: font, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nueva auditoría
              </button>
            </div>

            {/* Legal reminder */}
            <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentYellow} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: '0.1rem' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div style={{ color: textMuted, fontSize: '0.78rem', lineHeight: 1.5 }}>
                <span style={{ color: accentYellow, fontWeight: '600' }}>Obligación legal:</span> Las ITF deben contratar un auditor externo independiente certificado por CNBV para revisar el cumplimiento del programa PLD/FT. El informe se presenta al Consejo de Administración y se envía a CNBV vía SITI. Fundamento: Disposiciones Art. 58 LRITF.
              </div>
            </div>

            {/* Form nueva auditoría */}
            {showAuditoriaForm && (
              <div style={{ background: navyLight, border: `1px solid ${navyBorder}`, borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ color: textPrimary, fontSize: '0.95rem', fontWeight: '600', margin: 0 }}>Nueva revisión anual</h3>
                  <button onClick={() => setShowAuditoriaForm(false)} style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontFamily: font, fontSize: '0.82rem' }}>Cancelar</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
                  {[
                    { label: 'EJERCICIO', key: 'ejercicio', type: 'number', placeholder: '2025' },
                    { label: 'AUDITOR — NOMBRE', key: 'auditor_nombre', placeholder: 'Lic. Juan García' },
                    { label: 'NO. CERTIFICACIÓN CNBV', key: 'auditor_certificacion', placeholder: 'CNBV-PLD-XXXX', mono: true },
                    { label: 'FECHA INICIO', key: 'fecha_inicio', type: 'date' },
                    { label: 'FECHA CONCLUSIÓN', key: 'fecha_conclusion', type: 'date' },
                    { label: 'FECHA PRES. CONSEJO', key: 'fecha_presentacion_consejo', type: 'date' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ color: textMuted, fontSize: '0.65rem', fontWeight: '600', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>{f.label}</label>
                      <input type={f.type || 'text'} value={String((newAuditoria as Record<string,unknown>)[f.key] || '')} onChange={e => setNewAuditoria(p => ({...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value}))} placeholder={f.placeholder}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${navyBorder}`, borderRadius: '8px', padding: '0.6rem 0.8rem', color: textPrimary, fontSize: '0.82rem', fontFamily: (f as {mono?: boolean}).mono ? fontMono : font }} />
                    </div>
                  ))}
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ color: textMuted, fontSize: '0.65rem', fontWeight: '600', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>CALIFICACIÓN GENERAL</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                      {[
                        { v: 'satisfactoria', l: 'Satisfactoria', c: accentGreen },
                        { v: 'con_observaciones', l: 'Con observaciones', c: accentYellow },
                        { v: 'no_satisfactoria', l: 'No satisfactoria', c: accentRed },
                      ].map(o => (
                        <button key={o.v} onClick={() => setNewAuditoria(p => ({...p, calificacion: o.v}))}
                          style={{ padding: '0.55rem', borderRadius: '8px', cursor: 'pointer', border: `1.5px solid ${newAuditoria.calificacion === o.v ? o.c : navyBorder}`, background: newAuditoria.calificacion === o.v ? `${o.c}15` : 'rgba(255,255,255,0.02)', color: newAuditoria.calificacion === o.v ? o.c : textMuted, fontSize: '0.75rem', fontWeight: '500', fontFamily: font }}>
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ color: textMuted, fontSize: '0.65rem', fontWeight: '600', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>OBSERVACIONES GENERALES</label>
                    <textarea rows={2} value={newAuditoria.observaciones} onChange={e => setNewAuditoria(p => ({...p, observaciones: e.target.value}))} placeholder="Observaciones del auditor..."
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${navyBorder}`, borderRadius: '8px', padding: '0.6rem 0.8rem', color: textPrimary, fontSize: '0.82rem', fontFamily: font, resize: 'vertical' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={saveAuditoria} style={{ background: accent, color: 'white', border: 'none', borderRadius: '9px', padding: '0.65rem 1.5rem', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', fontFamily: font }}>
                    Crear revisión anual
                  </button>
                </div>
              </div>
            )}

            {/* List + Detail */}
            {auditoriaLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: textMuted }}>
                <div style={{ width: '24px', height: '24px', border: '2.5px solid rgba(59,130,246,0.2)', borderTopColor: accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 0.75rem' }} />
                Cargando auditorías...
              </div>
            ) : auditorias.length === 0 && !showAuditoriaForm ? (
              <div style={{ background: navyLight, border: `1px solid ${navyBorder}`, borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                <div style={{ color: textMuted, fontSize: '0.88rem', marginBottom: '1rem' }}>Sin revisiones anuales registradas</div>
                <button onClick={() => setShowAuditoriaForm(true)} style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '9px', padding: '0.6rem 1.25rem', color: '#60A5FA', cursor: 'pointer', fontFamily: font, fontSize: '0.82rem' }}>
                  Crear primera auditoría
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: selectedAuditoria ? '300px 1fr' : '1fr', gap: '1.25rem' }}>
                {/* List */}
                <div style={{ display: 'grid', gap: '0.75rem', alignContent: 'start' }}>
                  {auditorias.map(a => {
                    const sc = a.status === 'enviada_cnbv' ? { c: accentGreen, l: 'Enviada CNBV' } : a.status === 'completada' ? { c: accent, l: 'Completada' } : { c: accentYellow, l: 'En proceso' }
                    const cal = a.calificacion === 'satisfactoria' ? { c: accentGreen, l: 'Satisfactoria' } : a.calificacion === 'con_observaciones' ? { c: accentYellow, l: 'Con obs.' } : a.calificacion === 'no_satisfactoria' ? { c: accentRed, l: 'No satisf.' } : null
                    const isSelected = selectedAuditoria?.id === a.id
                    return (
                      <button key={a.id} onClick={() => setSelectedAuditoria(isSelected ? null : a)}
                        style={{ background: isSelected ? 'rgba(59,130,246,0.1)' : navyLight, border: `1.5px solid ${isSelected ? accent : navyBorder}`, borderRadius: '10px', padding: '1rem', cursor: 'pointer', textAlign: 'left', fontFamily: font }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                          <span style={{ color: textPrimary, fontSize: '1rem', fontWeight: '700', fontFamily: fontMono }}>Ejercicio {a.ejercicio}</span>
                          <span style={{ background: `${sc.c}15`, color: sc.c, fontSize: '0.65rem', fontWeight: '600', padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>{sc.l}</span>
                        </div>
                        <div style={{ color: textMuted, fontSize: '0.75rem', marginBottom: '0.35rem' }}>{a.auditor_nombre || 'Auditor no asignado'}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: textMuted, fontSize: '0.7rem' }}>{a.pld_auditoria_hallazgos?.length || 0} hallazgos</span>
                          {cal && <span style={{ background: `${cal.c}15`, color: cal.c, fontSize: '0.65rem', fontWeight: '600', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>{cal.l}</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Detail */}
                {selectedAuditoria && (
                  <div style={{ background: navyLight, border: `1px solid ${navyBorder}`, borderRadius: '12px', overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${navyBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ color: textPrimary, fontSize: '1rem', fontWeight: '700', margin: '0 0 0.2rem' }}>Ejercicio {selectedAuditoria.ejercicio}</h3>
                        <div style={{ color: textMuted, fontSize: '0.75rem' }}>{selectedAuditoria.auditor_nombre} {selectedAuditoria.auditor_certificacion && <span style={{ fontFamily: fontMono }}>· {selectedAuditoria.auditor_certificacion}</span>}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {selectedAuditoria.status !== 'enviada_cnbv' && (
                          <button onClick={async () => {
                            const newStatus = selectedAuditoria.status === 'en_proceso' ? 'completada' : 'enviada_cnbv'
                            await fetch('/api/v1/pld/auditoria', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessionToken }, body: JSON.stringify({ id: selectedAuditoria.id, status: newStatus }) })
                            const updated = { ...selectedAuditoria, status: newStatus as Auditoria['status'] }
                            setSelectedAuditoria(updated)
                            setAuditorias(p => p.map(a => a.id === selectedAuditoria.id ? updated : a))
                          }} style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '7px', padding: '0.4rem 0.85rem', fontSize: '0.75rem', color: '#60A5FA', cursor: 'pointer', fontFamily: font }}>
                            {selectedAuditoria.status === 'en_proceso' ? '✓ Marcar completada' : '↑ Marcar enviada CNBV'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Info grid */}
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${navyBorder}`, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                      {[
                        { l: 'Inicio', v: selectedAuditoria.fecha_inicio || '—' },
                        { l: 'Conclusión', v: selectedAuditoria.fecha_conclusion || '—' },
                        { l: 'Pres. Consejo', v: selectedAuditoria.fecha_presentacion_consejo || '—' },
                      ].map(item => (
                        <div key={item.l} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.8rem', borderRadius: '7px' }}>
                          <div style={{ color: textMuted, fontSize: '0.65rem', marginBottom: '0.2rem' }}>{item.l}</div>
                          <div style={{ color: textSecondary, fontSize: '0.78rem', fontFamily: fontMono }}>{item.v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Hallazgos */}
                    <div style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ color: textPrimary, fontSize: '0.88rem', fontWeight: '600', margin: 0 }}>
                          Hallazgos ({selectedAuditoria.pld_auditoria_hallazgos?.length || 0})
                        </h4>
                        <button onClick={() => setShowHallazgoForm(!showHallazgoForm)}
                          style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '7px', padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: '#60A5FA', cursor: 'pointer', fontFamily: font }}>
                          + Agregar hallazgo
                        </button>
                      </div>

                      {/* Hallazgo form */}
                      {showHallazgoForm && (
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${navyBorder}`, borderRadius: '9px', padding: '1rem', marginBottom: '1rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                            <div>
                              <label style={{ color: textMuted, fontSize: '0.62rem', fontWeight: '600', letterSpacing: '0.06em', display: 'block', marginBottom: '0.25rem' }}>ÁREA</label>
                              <input value={newHallazgo.area} onChange={e => setNewHallazgo(p => ({...p, area: e.target.value}))} placeholder="Ej. KYC, PEPs, Reportes..." style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${navyBorder}`, borderRadius: '7px', padding: '0.5rem 0.7rem', color: textPrimary, fontSize: '0.8rem', fontFamily: font }} />
                            </div>
                            <div>
                              <label style={{ color: textMuted, fontSize: '0.62rem', fontWeight: '600', letterSpacing: '0.06em', display: 'block', marginBottom: '0.25rem' }}>NIVEL DE RIESGO</label>
                              <select value={newHallazgo.riesgo} onChange={e => setNewHallazgo(p => ({...p, riesgo: e.target.value}))} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${navyBorder}`, borderRadius: '7px', padding: '0.5rem 0.7rem', color: textPrimary, fontSize: '0.8rem', fontFamily: font }}>
                                <option value="bajo">Bajo</option>
                                <option value="medio">Medio</option>
                                <option value="alto">Alto</option>
                                <option value="critico">Crítico</option>
                              </select>
                            </div>
                            <div style={{ gridColumn: '1/-1' }}>
                              <label style={{ color: textMuted, fontSize: '0.62rem', fontWeight: '600', letterSpacing: '0.06em', display: 'block', marginBottom: '0.25rem' }}>DESCRIPCIÓN DEL HALLAZGO</label>
                              <textarea rows={2} value={newHallazgo.descripcion} onChange={e => setNewHallazgo(p => ({...p, descripcion: e.target.value}))} placeholder="Descripción del hallazgo identificado..." style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${navyBorder}`, borderRadius: '7px', padding: '0.5rem 0.7rem', color: textPrimary, fontSize: '0.8rem', fontFamily: font, resize: 'vertical' }} />
                            </div>
                            <div style={{ gridColumn: '1/-1' }}>
                              <label style={{ color: textMuted, fontSize: '0.62rem', fontWeight: '600', letterSpacing: '0.06em', display: 'block', marginBottom: '0.25rem' }}>RECOMENDACIÓN</label>
                              <textarea rows={2} value={newHallazgo.recomendacion} onChange={e => setNewHallazgo(p => ({...p, recomendacion: e.target.value}))} placeholder="Acción correctiva recomendada..." style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${navyBorder}`, borderRadius: '7px', padding: '0.5rem 0.7rem', color: textPrimary, fontSize: '0.8rem', fontFamily: font, resize: 'vertical' }} />
                            </div>
                            <div>
                              <label style={{ color: textMuted, fontSize: '0.62rem', fontWeight: '600', letterSpacing: '0.06em', display: 'block', marginBottom: '0.25rem' }}>RESPONSABLE</label>
                              <input value={newHallazgo.responsable} onChange={e => setNewHallazgo(p => ({...p, responsable: e.target.value}))} placeholder="Nombre del responsable" style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${navyBorder}`, borderRadius: '7px', padding: '0.5rem 0.7rem', color: textPrimary, fontSize: '0.8rem', fontFamily: font }} />
                            </div>
                            <div>
                              <label style={{ color: textMuted, fontSize: '0.62rem', fontWeight: '600', letterSpacing: '0.06em', display: 'block', marginBottom: '0.25rem' }}>FECHA COMPROMISO</label>
                              <input type="date" value={newHallazgo.fecha_compromiso} onChange={e => setNewHallazgo(p => ({...p, fecha_compromiso: e.target.value}))} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${navyBorder}`, borderRadius: '7px', padding: '0.5rem 0.7rem', color: textPrimary, fontSize: '0.8rem', fontFamily: fontMono }} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button onClick={() => setShowHallazgoForm(false)} style={{ background: 'none', border: `1px solid ${navyBorder}`, borderRadius: '7px', padding: '0.5rem 1rem', fontSize: '0.8rem', color: textMuted, cursor: 'pointer', fontFamily: font }}>Cancelar</button>
                            <button onClick={saveHallazgo} disabled={hallazgoSaving || !newHallazgo.area || !newHallazgo.descripcion}
                              style={{ background: accentGreen, color: 'white', border: 'none', borderRadius: '7px', padding: '0.5rem 1.25rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', fontFamily: font, opacity: hallazgoSaving || !newHallazgo.area || !newHallazgo.descripcion ? 0.5 : 1 }}>
                              {hallazgoSaving ? 'Guardando...' : 'Guardar hallazgo'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Hallazgos list */}
                      {(selectedAuditoria.pld_auditoria_hallazgos || []).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem', color: textMuted, fontSize: '0.8rem', background: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
                          Sin hallazgos registrados
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: '0.65rem' }}>
                          {(selectedAuditoria.pld_auditoria_hallazgos || []).map(h => {
                            const rColor = h.riesgo === 'critico' ? accentRed : h.riesgo === 'alto' ? '#F97316' : h.riesgo === 'medio' ? accentYellow : accentGreen
                            const sColor = h.status === 'cerrado' ? accentGreen : h.status === 'en_proceso' ? accent : accentYellow
                            return (
                              <div key={h.id} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${navyBorder}`, borderRadius: '8px', padding: '0.85rem 1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ background: `${rColor}15`, color: rColor, fontSize: '0.65rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase' }}>{h.riesgo}</span>
                                    <span style={{ color: textSecondary, fontSize: '0.8rem', fontWeight: '600' }}>{h.area}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ background: `${sColor}15`, color: sColor, fontSize: '0.65rem', fontWeight: '600', padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
                                      {h.status === 'cerrado' ? 'Cerrado' : h.status === 'en_proceso' ? 'En proceso' : 'Abierto'}
                                    </span>
                                    {h.status !== 'cerrado' && (
                                      <button onClick={() => updateHallazgoStatus(h.id, h.status === 'abierto' ? 'en_proceso' : 'cerrado')}
                                        style={{ background: 'none', border: `1px solid ${navyBorder}`, borderRadius: '5px', padding: '0.15rem 0.5rem', fontSize: '0.65rem', color: textMuted, cursor: 'pointer', fontFamily: font }}>
                                        {h.status === 'abierto' ? '→ En proceso' : '✓ Cerrar'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p style={{ color: textMuted, fontSize: '0.78rem', margin: '0 0 0.4rem', lineHeight: 1.5 }}>{h.descripcion}</p>
                                {h.recomendacion && <p style={{ color: textSecondary, fontSize: '0.75rem', margin: '0 0 0.35rem', lineHeight: 1.5 }}>↳ <em>{h.recomendacion}</em></p>}
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
                                  {h.responsable && <span style={{ color: textMuted, fontSize: '0.68rem' }}>Resp: <span style={{ color: textSecondary }}>{h.responsable}</span></span>}
                                  {h.fecha_compromiso && <span style={{ color: textMuted, fontSize: '0.68rem' }}>Compromiso: <span style={{ color: textSecondary, fontFamily: fontMono }}>{h.fecha_compromiso}</span></span>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Resumen por riesgo */}
                      {(selectedAuditoria.pld_auditoria_hallazgos || []).length > 0 && (
                        <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: `1px solid ${navyBorder}` }}>
                          <div style={{ color: textMuted, fontSize: '0.68rem', fontWeight: '600', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>RESUMEN POR NIVEL</div>
                          <div style={{ display: 'flex', gap: '1rem' }}>
                            {(['critico','alto','medio','bajo'] as const).map(nivel => {
                              const count = (selectedAuditoria.pld_auditoria_hallazgos || []).filter(h => h.riesgo === nivel).length
                              const c = nivel === 'critico' ? accentRed : nivel === 'alto' ? '#F97316' : nivel === 'medio' ? accentYellow : accentGreen
                              return count > 0 ? (
                                <div key={nivel} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <span style={{ color: c, fontSize: '1rem', fontWeight: '700', fontFamily: fontMono }}>{count}</span>
                                  <span style={{ color: textMuted, fontSize: '0.72rem', textTransform: 'capitalize' }}>{nivel}</span>
                                </div>
                              ) : null
                            })}
                            <div style={{ marginLeft: 'auto', color: accentGreen, fontSize: '0.72rem' }}>
                              {(selectedAuditoria.pld_auditoria_hallazgos || []).filter(h => h.status === 'cerrado').length}/{(selectedAuditoria.pld_auditoria_hallazgos || []).length} cerrados
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SESSION WARNING BANNER ── */}
      {sessionWarning && (
        <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: '#7C2D12', border: '1px solid #DC2626', borderRadius: '12px', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 500, boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FCA5A5" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style={{ color: '#FCA5A5', fontSize: '0.82rem', fontFamily: font }}>Sesión expira en 5 minutos por inactividad</span>
          <button onClick={resetInactivityTimer} style={{ background: '#DC2626', color: 'white', border: 'none', borderRadius: '6px', padding: '0.3rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', fontFamily: font, fontWeight: '600' }}>Continuar sesión</button>
        </div>
      )}

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
                    {/* Section labels */}
                    <div style={{ gridColumn:'1/-1', color: textMuted, fontSize: '0.62rem', fontWeight: '600', letterSpacing: '0.08em', borderBottom: `1px solid ${navyBorder}`, paddingBottom: '0.4rem', marginBottom: '0.1rem' }}>OPERACIÓN</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      {([
                        {label:'C13 — FECHA OPERACIÓN',key:'fecha_operacion',type:'date',mono:true},
                        {label:'C9 — TIPO DE OPERACIÓN',key:'tipo_operacion',type:'select',opts:CAT_TIPO_OP},
                        {label:'C8 — TIPO INSTRUMENTO',key:'tipo_instrumento',type:'select',opts:CAT_TIPO_INSTRUMENTO},
                        {label:'C10 — NO. CUENTA / CONTRATO',key:'num_cuenta',placeholder:'ID cuenta en Crowdlink',mono:true},
                        {label:'C11 — MONTO',key:'monto',placeholder:'0.00',mono:true},
                        {label:'C12 — MONEDA',key:'moneda',type:'select',opts:CAT_MONEDA},
                        {label:'C7 — LOCALIDAD',key:'localidad',type:'select',opts:CAT_LOCALIDAD},
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
                    </div>

                    {/* Persona fields */}
                    <div style={{ gridColumn:'1/-1', color: textMuted, fontSize: '0.62rem', fontWeight: '600', letterSpacing: '0.08em', borderBottom: `1px solid ${navyBorder}`, paddingBottom: '0.4rem', marginTop: '0.75rem', marginBottom: '0.1rem' }}>SUJETO REPORTADO</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      {([
                        {label:'C14 — TIPO PERSONA',key:'tipo_persona',type:'select',opts:[{v:'1',l:'1 — Persona física'},{v:'2',l:'2 — Persona moral'}]},
                        {label:'C16 — TIPO RELACIÓN',key:'tipo_relacion',type:'select',opts:CAT_TIPO_RELACION},
                        {label:'C15 — NACIONALIDAD',key:'nacionalidad',type:'select',opts:[{v:'1',l:'1 — Mexicana'},{v:'2',l:'2 — Extranjera'}]},
                        {label:'C23 — PAÍS (ISO 3166)',key:'pais_cliente',type:'select',opts:CAT_PAIS},
                        {label:'C17 — NOMBRE / RAZÓN SOCIAL',key:'nombre_cliente',placeholder:'Nombre(s) o razón social'},
                        {label:'C18 — APELLIDO PATERNO',key:'apellido_paterno',placeholder:'Requerido persona física'},
                        {label:'C19 — APELLIDO MATERNO',key:'apellido_materno',placeholder:'XXXX si no tiene'},
                        {label:'C20 — RFC',key:'rfc_cliente',placeholder:'12 moral / 13 física',mono:true},
                        {label:'C21 — CURP',key:'curp_cliente',placeholder:'18 chars — persona física',mono:true},
                        {label:'C22 — FECHA NACIMIENTO',key:'fecha_nacimiento',type:'date',mono:true},
                        {label:'C24 — ACTIVIDAD ECONÓMICA',key:'actividad_economica',placeholder:'Clave SCIAN (opc.)'},
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
                      <button onClick={async () => {
                        const periodo = (document.getElementById('reporte-periodo') as HTMLInputElement)?.value?.replace('-','') || new Date().toISOString().slice(0,7).replace('-','')
                        await saveReporte({ tipo: reporteTipo, periodo, folio_inicial: '000001', num_ops: reporteOps.length, monto_total: reporteOps.reduce((s,o) => s+Number(o.monto||0),0), status: 'borrador', ops: reporteOps })
                        setShowReporteWizard(false)
                      }} style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${navyBorder}`, borderRadius:'9px', padding:'0.65rem 1.25rem', fontSize:'0.83rem', color:textSecondary, cursor:'pointer', fontFamily:font }}>
                        Guardar borrador
                      </button>
                      <button onClick={async () => {
                        const periodo = (document.getElementById('reporte-periodo') as HTMLInputElement)?.value?.replace('-','') || new Date().toISOString().slice(0,7).replace('-','')
                        // Layout oficial CNBV/UIF: separador ";", mayúsculas
                        // Período: AAAAMM para Relevantes, AAAAMMDD para Inusuales/Preocupantes
                        // Layout CNBV/UIF ITF — separador ; — MAYÚSCULAS — DOF 24/03/2020 + Res. UIF 22/04/2021
                        const lines = reporteOps.map((op,i) => {
                          const fechaOp = (op.fecha_operacion||'').replace(/-/g,'') // AAAAMMDD
                          const periodoField = reporteTipo === '1' ? periodo : fechaOp
                          const clean = (s: string) => (s||'').toUpperCase().replace(/;/g,',').substring(0, 40)
                          const cleanLong = (s: string) => (s||'').toUpperCase().replace(/;/g,',').substring(0, 1000)
                          return [
                            reporteTipo,                                    // C1: Tipo reporte
                            periodoField,                                   // C2: Período
                            String(i+1).padStart(6,'0'),                    // C3: Folio consecutivo
                            CASFIM_SUPERVISOR,                              // C4: Órgano supervisor CNBV
                            CASFIM_ENTIDAD,                                 // C5: Clave entidad CASFIM
                            (op.localidad||'99000000').substring(0,8),      // C6/7: Sucursal/Localidad
                            op.tipo_instrumento||'20',                      // C8: Tipo instrumento
                            op.tipo_operacion||'13',                        // C9: Tipo operación
                            (op.num_cuenta||'').substring(0,16).toUpperCase(), // C10: Número cuenta
                            op.monto||'0',                                  // C11: Monto
                            op.moneda||'MXP',                               // C12: Moneda
                            fechaOp,                                        // C13: Fecha operación AAAAMMDD
                            op.tipo_persona||'1',                           // C14: Tipo persona
                            op.nacionalidad||'1',                           // C15: Nacionalidad
                            op.tipo_relacion||'01',                         // C16: Tipo relación
                            clean(op.nombre_cliente||''),                   // C17: Nombre/Razón social
                            clean(op.apellido_paterno||''),                 // C18: Apellido paterno
                            clean(op.apellido_materno||'XXXX'),             // C19: Apellido materno
                            (op.rfc_cliente||'').toUpperCase().substring(0,13), // C20: RFC
                            (op.curp_cliente||'').toUpperCase().substring(0,18), // C21: CURP
                            (op.fecha_nacimiento||'').replace(/-/g,''),     // C22: Fecha nacimiento AAAAMMDD
                            op.pais_cliente||'MEX',                         // C23: País ISO 3166
                            op.actividad_economica||'',                     // C24: Actividad económica SCIAN
                            '00',                                           // C29: Consecutivo relacionados
                            cleanLong(op.descripcion||''),                  // C35: Descripción operación
                            reporteTipo!=='1' ? cleanLong(op.razon_inusualidad||'') : '', // C36: Razón inusualidad
                          ].join(';')
                        }).join('\n')
                        const blob = new Blob([lines],{type:'text/plain;charset=utf-8'})
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a'); a.href=url; a.download=`${reporteTipo}${periodo}${CASFIM_ENTIDAD}.txt`; a.click(); URL.revokeObjectURL(url)
                        await saveReporte({ tipo: reporteTipo, periodo, folio_inicial: '000001', num_ops: reporteOps.length, monto_total: reporteOps.reduce((s,o) => s+Number(o.monto||0),0), status: 'listo', ops: reporteOps })
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
                  <input value={String((newInv as Record<string, unknown>)[f.key] || '')} onChange={e => setNewInv(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder}
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
