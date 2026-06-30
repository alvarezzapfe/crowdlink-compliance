'use client'
import { useState, useEffect, useRef } from 'react'
import { cl, sharedStyles } from '@/lib/design'
import { createClient } from '@/lib/supabase-client'

const ACCENT = '#EA580C'
const ACCENT_LIGHT = '#FFF7ED'

interface Reporte {
  id: string; registro: string; tipo_reporte: string; periodicidad: string
  periodo: string; file_name: string | null; file_path: string | null
  file_url: string | null; status: string; uploaded_at: string | null
}

const REGISTROS = [
  {
    id: 'IFIT', label: 'IFIT', fullName: 'Ingreso de Fichas Técnicas', color: '#0891B2', bg: '#ECFEFF',
    reportes: [
      { tipo: 'Ficha Técnica Mensual', periodicidad: 'mensual' },
      { tipo: 'Actualización de Datos', periodicidad: 'mensual' },
    ],
  },
  {
    id: 'REDECO', label: 'REDECO', fullName: 'Registro de Despachos de Cobranza', color: '#7C3AED', bg: '#F5F3FF',
    reportes: [
      { tipo: 'Informe Mensual REDECO', periodicidad: 'mensual' },
      { tipo: 'Quejas y Reclamaciones', periodicidad: 'mensual' },
    ],
  },
  {
    id: 'REUNE', label: 'REUNE', fullName: 'Registro Único de UNEs', color: '#059669', bg: '#ECFDF5',
    reportes: [
      { tipo: 'Validación de datos de la UNE', periodicidad: 'mensual' },
      { tipo: 'Consultas, Reclamaciones y Aclaraciones', periodicidad: 'trimestral' },
      { tipo: 'Actualización de datos de la UNE', periodicidad: 'trimestral' },
    ],
  },
  {
    id: 'REUS', label: 'REUS', fullName: 'Registro de Usuarios', color: '#D97706', bg: '#FFFBEB',
    reportes: [
      { tipo: 'Art. 158 — Quincenal 1', periodicidad: 'quincenal' },
      { tipo: 'Art. 158 — Quincenal 2', periodicidad: 'quincenal' },
      { tipo: 'Art. 160 — Mensual', periodicidad: 'mensual' },
    ],
  },
  {
    id: 'SIPRES', label: 'SIPRES', fullName: 'Sistema de Registro de Prestadores', color: '#DC2626', bg: '#FEF2F2',
    reportes: [
      { tipo: 'Reporte SIPRES Mensual', periodicidad: 'mensual' },
    ],
  },
]

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function getPeriodo(anio: number, mes: number, periodicidad: string, quincena?: 1|2): string {
  const m = String(mes + 1).padStart(2, '0')
  if (periodicidad === 'quincenal') return `${anio}-${m}-Q${quincena || 1}`
  if (periodicidad === 'trimestral') {
    const q = Math.floor(mes / 3) + 1
    return `${anio}-Q${q}`
  }
  return `${anio}-${m}`
}

function StatusBadge({ status }: { status: string }) {
  const cfg = status === 'cargado' || status === 'automatico'
    ? { color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0', label: 'Cargado' }
    : { color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', label: 'Pendiente' }
  return (
    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: '0.58rem', fontWeight: '700', padding: '0.15rem 0.45rem', borderRadius: '5px', letterSpacing: '0.04em' }}>
      {cfg.label}
    </span>
  )
}

function UploadCell({ reporte, periodo, existing, token, onRefresh }: {
  reporte: { tipo: string; periodicidad: string }
  periodo: string; existing: Reporte | undefined
  token: string; onRefresh: () => void
  registro: string
}) {
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const registroId = periodo.split('/')[0] // passed via key

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('registro', registroId)
    fd.append('tipo_reporte', reporte.tipo)
    fd.append('periodicidad', reporte.periodicidad)
    fd.append('periodo', periodo)
    await fetch('/api/condusef', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
    setLoading(false)
    onRefresh()
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDownload() {
    if (!existing?.file_url) return
    setDownloading(true)
    window.open(existing.file_url, '_blank')
    setDownloading(false)
  }

  async function handleDelete() {
    if (!existing || !confirm(`¿Eliminar "${reporte.tipo}"?`)) return
    setLoading(true)
    await fetch('/api/condusef', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: existing.id, file_path: existing.file_path }),
    })
    setLoading(false)
    onRefresh()
  }

  const isCargado = existing?.status === 'cargado' || existing?.status === 'automatico'

  return (
    <div style={{ background: isCargado ? '#F0FDF4' : '#FAFAFA', border: `1px solid ${isCargado ? '#BBF7D0' : '#E2E8F0'}`, borderRadius: '8px', padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
        <span style={{ color: '#334155', fontSize: '0.72rem', fontWeight: '600', lineHeight: 1.3, flex: 1 }}>{reporte.tipo}</span>
        <StatusBadge status={existing?.status || 'pendiente'} />
      </div>

      {isCargado && existing?.uploaded_at && (
        <p style={{ color: '#64748B', fontSize: '0.65rem', margin: 0 }}>
          {new Date(existing.uploaded_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.15rem' }}>
        <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFile} />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          style={{ background: isCargado ? '#F1F5F9' : ACCENT, color: isCargado ? '#64748B' : '#fff', border: isCargado ? '1px solid #E2E8F0' : 'none', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.65rem', fontWeight: '600', cursor: 'pointer', opacity: loading ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          {loading ? 'Subiendo…' : isCargado ? 'Sustituir' : 'Subir PDF'}
        </button>
        {isCargado && (
          <>
            <button onClick={handleDownload} disabled={downloading}
              style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.65rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Ver
            </button>
            <button onClick={handleDelete}
              style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function CondusefsPage() {
  const [token, setToken] = useState('')
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [mesActivo, setMesActivo] = useState(new Date().getMonth())
  const [reportes, setReportes] = useState<Reporte[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) { setToken(session.access_token); loadReportes(session.access_token, anio) }
    })
  }, [])

  async function loadReportes(t: string, a: number) {
    setLoading(true)
    const res = await fetch(`/api/condusef?anio=${a}`, { headers: { Authorization: `Bearer ${t}` } })
    if (res.ok) { const d = await res.json(); setReportes(d.reportes || []) }
    setLoading(false)
  }

  function findReporte(registro: string, tipo: string, periodo: string) {
    return reportes.find(r => r.registro === registro && r.tipo_reporte === tipo && r.periodo === periodo)
  }

  function getResumen(mes: number) {
    let total = 0, cargados = 0
    REGISTROS.forEach(reg => {
      reg.reportes.forEach(r => {
        let periodos: string[] = []
        if (r.periodicidad === 'quincenal') periodos = [getPeriodo(anio, mes, 'quincenal', 1), getPeriodo(anio, mes, 'quincenal', 2)]
        else if (r.periodicidad === 'trimestral') { if (mes % 3 === 0) periodos = [getPeriodo(anio, mes, 'trimestral')] }
        else periodos = [getPeriodo(anio, mes, 'mensual')]
        periodos.forEach(p => {
          total++
          if (findReporte(reg.id, r.tipo, p)) cargados++
        })
      })
    })
    return { total, cargados }
  }

  const trimestre = Math.floor(mesActivo / 3) + 1

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: cl.fontFamily }}>
      {/* Header */}
      <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '0 1.75rem', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '20px' }} />
          <span style={{ color: cl.gray300 }}>/</span>
          <a href="/gate" style={{ color: cl.gray400, fontSize: '0.8rem', fontWeight: '500', textDecoration: 'none' }}>Compliance Hub</a>
          <span style={{ color: cl.gray300 }}>/</span>
          <span style={{ color: cl.gray800, fontSize: '0.8rem', fontWeight: '600' }}>CONDUSEF</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button onClick={() => { setAnio(a => a - 1); loadReportes(token, anio - 1) }}
              style={{ background: cl.gray100, border: 'none', borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer', color: cl.gray600, fontSize: '0.8rem', fontWeight: '600' }}>‹</button>
            <span style={{ color: cl.gray800, fontSize: '0.88rem', fontWeight: '700', minWidth: '40px', textAlign: 'center' }}>{anio}</span>
            <button onClick={() => { setAnio(a => a + 1); loadReportes(token, anio + 1) }}
              style={{ background: cl.gray100, border: 'none', borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer', color: cl.gray600, fontSize: '0.8rem', fontWeight: '600' }}>›</button>
          </div>
          <a href="/gate" style={{ color: cl.gray400, fontSize: '0.78rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Volver
          </a>
        </div>
      </div>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1.75rem' }}>

        {/* Title */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ACCENT }} />
            <span style={{ color: cl.gray400, fontSize: '0.67rem', fontWeight: '700', letterSpacing: '0.08em' }}>REPORTES REGULATORIOS</span>
          </div>
          <h1 style={{ color: cl.gray900, fontSize: '1.4rem', fontWeight: '800', margin: '0 0 0.2rem', letterSpacing: '-0.02em' }}>CONDUSEF — Portal Único de Registros</h1>
          <p style={{ color: cl.gray400, fontSize: '0.8rem', margin: 0 }}>Gestión de reportes IFIT, REDECO, REUNE, REUS y SIPRES</p>
        </div>

        {/* Mes selector */}
        <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: cl.gray500, fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.06em' }}>SELECCIONA EL MES</span>
            <span style={{ color: cl.gray400, fontSize: '0.72rem' }}>T{trimestre} {anio}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '0.4rem' }}>
            {MESES.map((m, i) => {
              const { total, cargados } = getResumen(i)
              const completo = cargados === total && total > 0
              const parcial = cargados > 0 && cargados < total
              const activo = i === mesActivo
              return (
                <button key={i} onClick={() => setMesActivo(i)}
                  style={{ background: activo ? ACCENT : completo ? '#ECFDF5' : parcial ? '#FFFBEB' : cl.gray50, color: activo ? '#fff' : completo ? '#065F46' : parcial ? '#92400E' : cl.gray600, border: `1.5px solid ${activo ? ACCENT : completo ? '#A7F3D0' : parcial ? '#FDE68A' : cl.gray200}`, borderRadius: '8px', padding: '0.5rem 0.25rem', cursor: 'pointer', fontFamily: cl.fontFamily, transition: 'all 0.15s' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700' }}>{m}</div>
                  <div style={{ fontSize: '0.58rem', marginTop: '0.15rem', opacity: 0.8 }}>{cargados}/{total}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Registros */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: cl.gray300, fontSize: '0.85rem' }}>Cargando reportes…</div>
          ) : REGISTROS.map(reg => (
            <div key={reg.id} style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '12px', overflow: 'hidden' }}>
              {/* Registro header */}
              <div style={{ padding: '0.85rem 1.25rem', borderBottom: `1px solid ${cl.gray100}`, display: 'flex', alignItems: 'center', gap: '0.75rem', background: reg.bg + '44' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: reg.bg, border: `1.5px solid ${reg.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: reg.color, fontSize: '0.65rem', fontWeight: '800' }}>{reg.id}</span>
                </div>
                <div>
                  <p style={{ color: reg.color, fontWeight: '700', fontSize: '0.85rem', margin: 0 }}>{reg.id}</p>
                  <p style={{ color: cl.gray400, fontSize: '0.7rem', margin: 0 }}>{reg.fullName}</p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                  {reg.reportes.map(r => {
                    let periodos: string[] = []
                    if (r.periodicidad === 'quincenal') periodos = [getPeriodo(anio, mesActivo, 'quincenal', 1), getPeriodo(anio, mesActivo, 'quincenal', 2)]
                    else if (r.periodicidad === 'trimestral') { if (mesActivo % 3 === 0) periodos = [getPeriodo(anio, mesActivo, 'trimestral')] }
                    else periodos = [getPeriodo(anio, mesActivo, 'mensual')]
                    const allLoaded = periodos.every(p => findReporte(reg.id, r.tipo, p))
                    return allLoaded ? (
                      <span key={r.tipo} style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', fontSize: '0.6rem', fontWeight: '700', padding: '0.15rem 0.45rem', borderRadius: '5px' }}>✓</span>
                    ) : null
                  })}
                </div>
              </div>

              {/* Reportes grid */}
              <div style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.65rem' }}>
                  {reg.reportes.map(r => {
                    // Determinar periodos para este reporte en el mes activo
                    if (r.periodicidad === 'quincenal') {
                      return ([1, 2] as const).map(q => {
                        const p = getPeriodo(anio, mesActivo, 'quincenal', q)
                        const existing = findReporte(reg.id, r.tipo.replace('Quincenal 1', `Quincenal ${q}`).replace('Quincenal 2', `Quincenal ${q}`), p)
                        const tipoLabel = r.tipo.includes('Q1') || r.tipo.includes('Quincenal 1')
                          ? r.tipo.replace('Quincenal 1', `Quincenal ${q}`)
                          : r.tipo
                        return (
                          <UploadCell
                            key={`${reg.id}-${r.tipo}-Q${q}`}
                            reporte={{ tipo: `${r.tipo.split('—')[0].trim()} — Q${q}`, periodicidad: r.periodicidad }}
                            periodo={p}
                            existing={existing}
                            token={token}
                            onRefresh={() => loadReportes(token, anio)}
                            registro={reg.id}
                          />
                        )
                      })
                    }
                    if (r.periodicidad === 'trimestral') {
                      if (mesActivo % 3 !== 0) return (
                        <div key={r.tipo} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.6rem 0.75rem', opacity: 0.5 }}>
                          <p style={{ color: cl.gray500, fontSize: '0.72rem', fontWeight: '600', margin: '0 0 0.2rem' }}>{r.tipo}</p>
                          <p style={{ color: cl.gray400, fontSize: '0.65rem', margin: 0 }}>Solo inicio de trimestre (T{trimestre})</p>
                        </div>
                      )
                      const p = getPeriodo(anio, mesActivo, 'trimestral')
                      return (
                        <UploadCell
                          key={`${reg.id}-${r.tipo}`}
                          reporte={r}
                          periodo={p}
                          existing={findReporte(reg.id, r.tipo, p)}
                          token={token}
                          onRefresh={() => loadReportes(token, anio)}
                          registro={reg.id}
                        />
                      )
                    }
                    const p = getPeriodo(anio, mesActivo, 'mensual')
                    return (
                      <UploadCell
                        key={`${reg.id}-${r.tipo}`}
                        reporte={r}
                        periodo={p}
                        existing={findReporte(reg.id, r.tipo, p)}
                        token={token}
                        onRefresh={() => loadReportes(token, anio)}
                        registro={reg.id}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
