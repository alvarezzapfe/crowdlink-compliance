'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import { cl } from '@/lib/design'
import {
  IconShield, IconSearch, IconDoc, IconHistory, IconCheck, IconX,
  IconUser, IconFilter, IconClock, IconInfo, IconBuilding
} from '@/components/Icons'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Consulta {
  id: string; nombre: string; tipo: string; resultado: 'limpio' | 'alerta' | 'coincidencia'
  listas_verificadas: string[]; fecha: string; detalles?: string
}
interface ReporteConfig { id: string; nombre: string; desc: string; periodicidad: string; plazo: string; icon: React.ReactNode }

// ─── Constants ────────────────────────────────────────────────────────────────
const LISTAS = ['OFAC SDN', 'SAT 69-B', 'ONU Sanciones', 'UIF México', 'PEPs México', 'Interpol']

const REPORTES: ReporteConfig[] = [
  { id: 'R01', nombre: 'R01 — Operaciones Relevantes', desc: 'Operaciones en efectivo ≥ $7,500 USD o equivalente. Art. 17 LFPIORPI.', periodicidad: 'Mensual', plazo: '17 días hábiles', icon: <IconDoc size={18} color="#0F7BF4" /> },
  { id: 'R10', nombre: 'R10 — Operaciones Inusuales', desc: 'Operaciones que no correspondan al perfil transaccional del cliente. Art. 18 LFPIORPI.', periodicidad: 'Mensual', plazo: '60 días naturales', icon: <IconDoc size={18} color="#F59E0B" /> },
  { id: 'R27', nombre: 'R27 — Operaciones Preocupantes', desc: 'Conductas de empleados o directivos que pudieran favorecer PLD/FT.', periodicidad: 'Inmediato', plazo: '24 horas', icon: <IconDoc size={18} color="#EF4444" /> },
  { id: 'IFT24', nombre: 'IFT-24 — Informe Semestral CNBV', desc: 'Reporte de cumplimiento PLD del semestre. Obligatorio para IFC reguladas por CUITF Art. 47.', periodicidad: 'Semestral', plazo: '15 días hábiles', icon: <IconDoc size={18} color="#8B5CF6" /> },
]

const RESULTADO_STYLE = {
  limpio: { color: '#065F46', bg: '#ECFDF5', dot: '#10B981', label: 'Limpio' },
  alerta: { color: '#92400E', bg: '#FFFBEB', dot: '#F59E0B', label: 'Alerta' },
  coincidencia: { color: '#991B1B', bg: '#FEF2F2', dot: '#EF4444', label: 'Coincidencia' },
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PldPage() {
  const [tab, setTab] = useState<'consulta' | 'historial' | 'reportes' | 'matrices'>('consulta')
  const [userEmail, setUserEmail] = useState('')
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('persona_fisica')
  const [listasSeleccionadas, setListasSeleccionadas] = useState<string[]>(LISTAS)
  const [resultado, setResultado] = useState<Consulta | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvResults, setCsvResults] = useState<Consulta[]>([])
  const [procesandoCsv, setProcesandoCsv] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUserEmail(user.email || '')
      // Cargar historial simulado por ahora
      setConsultas([
        { id: '1', nombre: 'Empresa Ejemplo SA', tipo: 'persona_moral', resultado: 'limpio', listas_verificadas: LISTAS, fecha: new Date(Date.now() - 86400000).toISOString(), detalles: 'Sin coincidencias en ninguna lista' },
        { id: '2', nombre: 'Juan Pérez García', tipo: 'persona_fisica', resultado: 'alerta', listas_verificadas: ['OFAC SDN', 'SAT 69-B'], fecha: new Date(Date.now() - 172800000).toISOString(), detalles: 'Nombre similar encontrado en lista SAT 69-B — requiere verificación manual' },
      ])
    }
    load()
  }, [])

  const toggleLista = (l: string) => {
    setListasSeleccionadas(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])
  }

  const handleConsulta = async () => {
    if (!nombre.trim()) return
    setBuscando(true)
    setResultado(null)
    await new Promise(r => setTimeout(r, 1800))
    // Simulación: nombres con ciertas letras generan alerta
    const hasAlert = nombre.toLowerCase().includes('alert') || nombre.toLowerCase().includes('sancion')
    const hasHit = nombre.toLowerCase().includes('ofac') || nombre.toLowerCase().includes('coincidencia')
    const res: Consulta = {
      id: Date.now().toString(),
      nombre, tipo,
      resultado: hasHit ? 'coincidencia' : hasAlert ? 'alerta' : 'limpio',
      listas_verificadas: listasSeleccionadas,
      fecha: new Date().toISOString(),
      detalles: hasHit
        ? `Coincidencia encontrada en OFAC SDN List. Designado el 12/03/2019. Requiere reporte R27 inmediato.`
        : hasAlert
          ? 'Nombre similar encontrado en lista SAT 69-B artículo 69. Verificar con RFC oficial.'
          : `Sin coincidencias en ${listasSeleccionadas.length} listas verificadas.`,
    }
    setResultado(res)
    setConsultas(prev => [res, ...prev])
    setBuscando(false)
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFile(file)
    setProcesandoCsv(true)
    await new Promise(r => setTimeout(r, 2500))
    // Simular resultados CSV
    setCsvResults([
      { id: 'c1', nombre: 'Empresa ABC SA de CV', tipo: 'persona_moral', resultado: 'limpio', listas_verificadas: LISTAS, fecha: new Date().toISOString() },
      { id: 'c2', nombre: 'Juan Carlos Martínez', tipo: 'persona_fisica', resultado: 'alerta', listas_verificadas: LISTAS, fecha: new Date().toISOString(), detalles: 'Similar en SAT 69-B' },
      { id: 'c3', nombre: 'Grupo Industrial XYZ', tipo: 'persona_moral', resultado: 'limpio', listas_verificadas: LISTAS, fecha: new Date().toISOString() },
    ])
    setProcesandoCsv(false)
  }

  const NAV_TABS = [
    { id: 'consulta', label: 'Consulta Individual', icon: <IconSearch size={16} /> },
    { id: 'historial', label: 'Historial', icon: <IconHistory size={16} /> },
    { id: 'reportes', label: 'Reportes CNBV', icon: <IconDoc size={16} /> },
    { id: 'matrices', label: 'Matrices de Riesgo', icon: <IconFilter size={16} /> },
  ]

  return (
    <div style={{ height: '100vh', display: 'flex', fontFamily: cl.fontFamily, background: cl.gray50, overflow: 'hidden' }}>

      {/* SIDEBAR */}
      <div style={{ width: '64px', flexShrink: 0, background: '#0B1120', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ width: '100%', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#0F7BF4,#3DFFA0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconShield size={16} color="white" strokeWidth={2} />
          </div>
        </div>
        <div title="Sistema PLD" style={{ width: '44px', height: '44px', borderRadius: '10px', margin: '0.75rem 0', background: 'rgba(15,123,244,0.2)', border: '1px solid rgba(15,123,244,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F7BF4' }}>
          <IconShield size={20} />
        </div>
        <div style={{ marginTop: 'auto', paddingBottom: '1rem' }}>
          <a href="/gate" title="Módulos" style={{ width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </a>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top nav */}
        <div style={{ height: '60px', background: cl.white, borderBottom: `1px solid ${cl.gray200}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.75rem', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <a href="/gate" style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '22px', width: 'auto' }} />
            </a>
            <div style={{ width: '1px', height: '18px', background: cl.gray200 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconShield size={16} color="#0F7BF4" />
              <span style={{ color: cl.gray700, fontSize: '0.85rem', fontWeight: '700' }}>Sistema PLD</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#ECFDF5', border: '1px solid #BBF7D0', borderRadius: '9999px', padding: '0.3rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
              <span style={{ color: '#065F46', fontSize: '0.72rem', fontWeight: '600' }}>Sistema activo</span>
            </div>
            <span style={{ color: cl.gray400, fontSize: '0.78rem' }}>{userEmail}</span>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '0 1.75rem', display: 'flex', gap: '0', flexShrink: 0 }}>
          {NAV_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)} style={{
              background: 'none', border: 'none', padding: '0.8rem 1.1rem',
              color: tab === t.id ? '#0F7BF4' : cl.gray400,
              fontWeight: tab === t.id ? '700' : '400', fontSize: '0.83rem',
              cursor: 'pointer', fontFamily: cl.fontFamily,
              borderBottom: tab === t.id ? '2px solid #0F7BF4' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: '0.45rem',
            }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>

          {/* ── CONSULTA ── */}
          {tab === 'consulta' && (
            <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>

              {/* Form */}
              <div>
                <PldCard title="Nueva Consulta de Listas" icon={<IconSearch size={16} color="#0F7BF4" />}>
                  <div style={{ display: 'grid', gap: '1.1rem' }}>
                    <div>
                      <label style={labelStyle}>Nombre o Razón Social</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          value={nombre} onChange={e => setNombre(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleConsulta()}
                          placeholder="Ej. Juan García López / Empresa SA de CV"
                          style={{ ...inputStyle, paddingRight: '110px' }}
                          autoFocus
                        />
                        <button onClick={handleConsulta} disabled={buscando || !nombre.trim()} style={{
                          position: 'absolute', right: '4px', top: '4px', bottom: '4px',
                          background: '#0F7BF4', color: 'white', border: 'none',
                          borderRadius: '7px', padding: '0 1rem',
                          fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer',
                          fontFamily: cl.fontFamily, opacity: !nombre.trim() ? 0.5 : 1,
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                        }}>
                          {buscando ? <Spinner /> : <IconSearch size={14} color="white" />}
                          {buscando ? 'Buscando...' : 'Consultar'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Tipo de persona</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[{ v: 'persona_fisica', l: 'Persona Física' }, { v: 'persona_moral', l: 'Persona Moral' }].map(o => (
                          <button key={o.v} onClick={() => setTipo(o.v)} style={{
                            flex: 1, padding: '0.6rem', borderRadius: '8px', cursor: 'pointer',
                            border: tipo === o.v ? '2px solid #0F7BF4' : `1.5px solid ${cl.gray200}`,
                            background: tipo === o.v ? '#EBF3FF' : cl.white,
                            color: tipo === o.v ? '#0F7BF4' : cl.gray500,
                            fontSize: '0.82rem', fontWeight: tipo === o.v ? '700' : '400',
                            fontFamily: cl.fontFamily, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                          }}>
                            {tipo === o.v ? <IconCheck size={14} color="#0F7BF4" /> : null}
                            {o.l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Listas a verificar ({listasSeleccionadas.length}/{LISTAS.length})</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {LISTAS.map(l => {
                          const active = listasSeleccionadas.includes(l)
                          return (
                            <button key={l} onClick={() => toggleLista(l)} style={{
                              padding: '0.3rem 0.75rem', borderRadius: '9999px', cursor: 'pointer',
                              border: `1.5px solid ${active ? '#0F7BF4' : cl.gray200}`,
                              background: active ? '#EBF3FF' : cl.gray50,
                              color: active ? '#0F7BF4' : cl.gray400,
                              fontSize: '0.72rem', fontWeight: active ? '700' : '400',
                              fontFamily: cl.fontFamily,
                            }}>{l}</button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </PldCard>

                {/* Carga CSV */}
                <div style={{ marginTop: '1rem' }}>
                  <PldCard title="Consulta Masiva por CSV" icon={<IconDoc size={16} color="#0F7BF4" />}>
                    <p style={{ color: cl.gray400, fontSize: '0.8rem', margin: '0 0 1rem', lineHeight: 1.6 }}>
                      Carga un archivo CSV con columnas: <code style={{ background: cl.gray100, padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.75rem' }}>nombre, tipo, rfc</code>
                    </p>
                    <div
                      onClick={() => fileRef.current?.click()}
                      style={{
                        border: `2px dashed ${csvFile ? '#0F7BF4' : cl.gray200}`,
                        borderRadius: '10px', padding: '1.5rem', textAlign: 'center',
                        background: csvFile ? '#EBF3FF' : cl.gray50, cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <IconDoc size={28} color={csvFile ? '#0F7BF4' : cl.gray300} />
                      <div style={{ color: csvFile ? '#0F7BF4' : cl.gray400, fontSize: '0.82rem', marginTop: '0.5rem', fontWeight: csvFile ? '600' : '400' }}>
                        {procesandoCsv ? 'Procesando...' : csvFile ? csvFile.name : 'Haz clic para subir CSV'}
                      </div>
                      <input ref={fileRef} type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: 'none' }} />
                    </div>

                    {csvResults.length > 0 && (
                      <div style={{ marginTop: '1rem' }}>
                        <div style={{ color: cl.gray600, fontSize: '0.78rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                          {csvResults.length} registros procesados
                        </div>
                        {csvResults.map(r => {
                          const rs = RESULTADO_STYLE[r.resultado]
                          return (
                            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: `1px solid ${cl.gray100}` }}>
                              <div>
                                <div style={{ color: cl.gray800, fontSize: '0.82rem', fontWeight: '500' }}>{r.nombre}</div>
                                {r.detalles && <div style={{ color: cl.gray400, fontSize: '0.72rem' }}>{r.detalles}</div>}
                              </div>
                              <span style={{ background: rs.bg, color: rs.color, fontSize: '0.68rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '9999px', flexShrink: 0 }}>{rs.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </PldCard>
                </div>
              </div>

              {/* Resultado */}
              <div>
                {buscando && (
                  <PldCard title="Consultando listas...">
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <Spinner large />
                      <div style={{ color: cl.gray400, fontSize: '0.82rem', marginTop: '1rem' }}>Verificando en {listasSeleccionadas.length} listas</div>
                    </div>
                  </PldCard>
                )}

                {resultado && !buscando && (() => {
                  const rs = RESULTADO_STYLE[resultado.resultado]
                  return (
                    <div>
                      <PldCard title="Resultado de Consulta" icon={
                        resultado.resultado === 'limpio' ? <IconCheck size={16} color="#10B981" /> :
                        resultado.resultado === 'coincidencia' ? <IconX size={16} color="#EF4444" /> :
                        <IconClock size={16} color="#F59E0B" />
                      }>
                        <div style={{ textAlign: 'center', padding: '1rem 0 1.5rem' }}>
                          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: rs.bg, border: `2px solid ${rs.dot}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: `0 0 24px ${rs.dot}30` }}>
                            {resultado.resultado === 'limpio' ? <IconCheck size={28} color={rs.dot} strokeWidth={2.5} /> :
                             resultado.resultado === 'coincidencia' ? <IconX size={28} color={rs.dot} strokeWidth={2.5} /> :
                             <IconClock size={28} color={rs.dot} />}
                          </div>
                          <span style={{ background: rs.bg, color: rs.color, fontSize: '0.88rem', fontWeight: '800', padding: '0.4rem 1.2rem', borderRadius: '9999px', border: `1.5px solid ${rs.dot}40` }}>{rs.label}</span>
                        </div>

                        <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
                          <DRow2 l="Nombre" v={resultado.nombre} />
                          <DRow2 l="Tipo" v={resultado.tipo === 'persona_fisica' ? 'Persona Física' : 'Persona Moral'} />
                          <DRow2 l="Listas verificadas" v={`${resultado.listas_verificadas.length} listas`} />
                          <DRow2 l="Fecha" v={new Date(resultado.fecha).toLocaleString('es-MX')} />
                        </div>

                        {resultado.detalles && (
                          <div style={{ background: rs.bg, border: `1px solid ${rs.dot}30`, borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ color: rs.color, fontSize: '0.8rem', lineHeight: 1.6 }}>{resultado.detalles}</div>
                          </div>
                        )}

                        {resultado.resultado === 'coincidencia' && (
                          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.75rem' }}>
                            <div style={{ color: '#991B1B', fontSize: '0.78rem', fontWeight: '700', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <IconInfo size={14} color="#991B1B" /> Acción requerida
                            </div>
                            <div style={{ color: '#7F1D1D', fontSize: '0.76rem', lineHeight: 1.6 }}>
                              Generar Reporte R27 ante la UIF dentro de las próximas 24 horas. Suspender relación comercial hasta nueva revisión.
                            </div>
                          </div>
                        )}
                      </PldCard>
                    </div>
                  )
                })()}

                {/* Listas verificadas chip list */}
                {resultado && (
                  <div style={{ marginTop: '1rem' }}>
                    <PldCard title="Listas verificadas">
                      <div style={{ display: 'grid', gap: '0.4rem' }}>
                        {resultado.listas_verificadas.map(l => (
                          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0', borderBottom: `1px solid ${cl.gray50}` }}>
                            <span style={{ color: cl.gray600, fontSize: '0.8rem' }}>{l}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#065F46', fontSize: '0.72rem', fontWeight: '600' }}>
                              <IconCheck size={12} color="#10B981" strokeWidth={2.5} /> Verificado
                            </span>
                          </div>
                        ))}
                      </div>
                    </PldCard>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── HISTORIAL ── */}
          {tab === 'historial' && (
            <div style={{ maxWidth: '820px', margin: '0 auto' }}>
              <PldCard title="Historial de Consultas" icon={<IconHistory size={16} color="#0F7BF4" />}>
                {consultas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: cl.gray400 }}>Sin consultas registradas</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${cl.gray100}` }}>
                        {['Nombre / Razón Social', 'Tipo', 'Listas', 'Resultado', 'Fecha'].map(h => (
                          <th key={h} style={{ color: cl.gray400, fontWeight: '600', fontSize: '0.72rem', textAlign: 'left', padding: '0.5rem 0.75rem', letterSpacing: '0.04em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {consultas.map(c => {
                        const rs = RESULTADO_STYLE[c.resultado]
                        return (
                          <tr key={c.id} style={{ borderBottom: `1px solid ${cl.gray50}` }}>
                            <td style={{ padding: '0.75rem', color: cl.gray800, fontWeight: '500' }}>{c.nombre}</td>
                            <td style={{ padding: '0.75rem', color: cl.gray500, fontSize: '0.75rem' }}>{c.tipo === 'persona_fisica' ? 'Física' : 'Moral'}</td>
                            <td style={{ padding: '0.75rem', color: cl.gray400, fontSize: '0.73rem' }}>{c.listas_verificadas.length} listas</td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{ background: rs.bg, color: rs.color, fontSize: '0.68rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>{rs.label}</span>
                            </td>
                            <td style={{ padding: '0.75rem', color: cl.gray400, fontSize: '0.73rem' }}>
                              {new Date(c.fecha).toLocaleDateString('es-MX')}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </PldCard>
            </div>
          )}

          {/* ── REPORTES CNBV ── */}
          {tab === 'reportes' && (
            <div style={{ maxWidth: '820px', margin: '0 auto', display: 'grid', gap: '1rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <h2 style={{ color: cl.gray900, fontSize: '1.1rem', fontWeight: '700', margin: '0 0 0.25rem' }}>Reportes Regulatorios CNBV / UIF</h2>
                <p style={{ color: cl.gray400, fontSize: '0.85rem', margin: 0 }}>
                  Obligaciones de reporte para IFC bajo CUITF Art. 47 y LFPIORPI
                </p>
              </div>

              {REPORTES.map(r => (
                <PldCard key={r.id} title="" icon={null}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1 }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: cl.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {r.icon}
                      </div>
                      <div>
                        <div style={{ color: cl.gray900, fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.3rem' }}>{r.nombre}</div>
                        <div style={{ color: cl.gray500, fontSize: '0.8rem', lineHeight: 1.6, marginBottom: '0.6rem' }}>{r.desc}</div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <span style={{ background: cl.gray100, color: cl.gray600, fontSize: '0.7rem', fontWeight: '600', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>
                            {r.periodicidad}
                          </span>
                          <span style={{ background: '#FEF9C3', color: '#854D0E', fontSize: '0.7rem', fontWeight: '600', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>
                            Plazo: {r.plazo}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
                      <button style={{ background: '#0F7BF4', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', fontFamily: cl.fontFamily, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <IconDoc size={14} color="white" /> Generar
                      </button>
                      <button style={{ background: cl.gray100, color: cl.gray600, border: `1px solid ${cl.gray200}`, borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', fontFamily: cl.fontFamily }}>
                        Historial
                      </button>
                    </div>
                  </div>
                </PldCard>
              ))}

              {/* Calendario regulatorio */}
              <PldCard title="Calendario de Obligaciones" icon={<IconClock size={16} color="#0F7BF4" />}>
                <div style={{ display: 'grid', gap: '0.5rem', paddingTop: '0.25rem' }}>
                  {[
                    { rep: 'R01', vence: '17 abr 2026', estado: 'pending', desc: 'Operaciones relevantes — Marzo 2026' },
                    { rep: 'IFT-24', vence: '15 jul 2026', estado: 'upcoming', desc: 'Informe semestral 1er semestre 2026' },
                    { rep: 'R01', vence: '17 mar 2026', estado: 'done', desc: 'Operaciones relevantes — Febrero 2026' },
                    { rep: 'IFT-24', vence: '15 ene 2026', estado: 'done', desc: 'Informe semestral 2do semestre 2025' },
                  ].map((item, i) => {
                    const stateStyle = {
                      done: { color: '#065F46', bg: '#ECFDF5', dot: '#10B981', label: 'Presentado' },
                      pending: { color: '#92400E', bg: '#FFFBEB', dot: '#F59E0B', label: 'Pendiente' },
                      upcoming: { color: '#1D4ED8', bg: '#EFF6FF', dot: '#3B82F6', label: 'Próximo' },
                    }[item.estado] || { color: cl.gray500, bg: cl.gray100, dot: cl.gray400, label: '' }
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem', background: cl.gray50, borderRadius: '8px', border: `1px solid ${cl.gray100}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stateStyle.dot, flexShrink: 0 }} />
                          <div>
                            <span style={{ color: cl.gray800, fontSize: '0.82rem', fontWeight: '600' }}>{item.rep}</span>
                            <span style={{ color: cl.gray400, fontSize: '0.78rem', marginLeft: '0.5rem' }}>{item.desc}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ color: cl.gray400, fontSize: '0.73rem' }}>Vence: {item.vence}</span>
                          <span style={{ background: stateStyle.bg, color: stateStyle.color, fontSize: '0.68rem', fontWeight: '700', padding: '0.18rem 0.55rem', borderRadius: '9999px' }}>{stateStyle.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </PldCard>
            </div>
          )}

          {/* ── MATRICES ── */}
          {tab === 'matrices' && (
            <div style={{ maxWidth: '820px', margin: '0 auto' }}>
              <PldCard title="Matrices de Riesgo PLD" icon={<IconFilter size={16} color="#0F7BF4" />}>
                <div style={{ textAlign: 'center', padding: '3rem', color: cl.gray400 }}>
                  <IconFilter size={40} color={cl.gray200} />
                  <div style={{ fontSize: '0.9rem', marginTop: '1rem', fontWeight: '500' }}>En construcción</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>Matrices de riesgo por cliente, producto y geografía</div>
                </div>
              </PldCard>
            </div>
          )}

        </div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function PldCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      {title && (
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: `1px solid ${cl.gray100}`, display: 'flex', alignItems: 'center', gap: '0.5rem', background: cl.gray50 }}>
          {icon}
          <span style={{ color: cl.gray700, fontSize: '0.82rem', fontWeight: '700' }}>{title}</span>
        </div>
      )}
      <div style={{ padding: '1.25rem' }}>{children}</div>
    </div>
  )
}

function DRow2({ l, v }: { l: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: `1px solid ${cl.gray50}` }}>
      <span style={{ color: cl.gray400, fontSize: '0.78rem' }}>{l}</span>
      <span style={{ color: cl.gray700, fontSize: '0.8rem', fontWeight: '500' }}>{v}</span>
    </div>
  )
}

function Spinner({ large }: { large?: boolean }) {
  const s = large ? 32 : 14
  return (
    <div style={{ width: s, height: s, border: `${large ? 3 : 2}px solid rgba(15,123,244,0.2)`, borderTopColor: '#0F7BF4', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: large ? '0 auto' : undefined }} />
  )
}

const labelStyle: React.CSSProperties = { color: cl.gray600, fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.45rem' }
const inputStyle: React.CSSProperties = {
  width: '100%', background: cl.white, border: `1.5px solid ${cl.gray200}`, borderRadius: '10px',
  padding: '0.75rem 1rem', color: cl.gray800, fontSize: '0.88rem', fontFamily: cl.fontFamily,
  outline: 'none', boxSizing: 'border-box' as const,
}
