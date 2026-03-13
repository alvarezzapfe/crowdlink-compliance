'use client'
import { useState, useRef } from 'react'

interface PldRecord {
  nombre_completo?: string
  rfc?: string
  curp?: string
  fuente?: string
  motivo?: string
}

interface ConsultaResult {
  hits: number
  alerta: boolean
  resultados: PldRecord[]
  consultado: string
}

export default function PldPanel({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<'consulta' | 'base' | 'historial'>('consulta')
  const [consultaInput, setConsultaInput] = useState({ nombre: '', rfc: '', curp: '' })
  const [resultado, setResultado] = useState<ConsultaResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [uploadedRecords, setUploadedRecords] = useState<PldRecord[]>([])
  const [historial, setHistorial] = useState<ConsultaResult[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const handleConsulta = async () => {
    if (!consultaInput.nombre && !consultaInput.rfc && !consultaInput.curp) return
    setLoading(true)
    try {
      const res = await fetch('/api/v1/pld/consulta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cl_api_key') || ''}`,
        },
        body: JSON.stringify(consultaInput),
      })
      const data = await res.json()
      const r = { ...data, consultado: new Date().toLocaleTimeString('es-MX') }
      setResultado(r)
      setHistorial(prev => [r, ...prev].slice(0, 20))
    } catch {
      setResultado({ hits: 0, alerta: false, resultados: [], consultado: new Date().toLocaleTimeString() })
    }
    setLoading(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadStatus('Procesando...')

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const records: PldRecord[] = lines.slice(1).map(line => {
        const values = line.split(',')
        const record: PldRecord = {}
        headers.forEach((h, i) => {
          if (h.includes('nombre')) record.nombre_completo = values[i]?.trim()
          if (h === 'rfc') record.rfc = values[i]?.trim()
          if (h === 'curp') record.curp = values[i]?.trim()
          if (h.includes('fuente')) record.fuente = values[i]?.trim()
          if (h.includes('motivo')) record.motivo = values[i]?.trim()
        })
        return record
      }).filter(r => r.nombre_completo || r.rfc)
      setUploadedRecords(records)
      setUploadStatus(`✓ ${records.length} registros cargados — listos para importar`)
    }
    reader.readAsText(file)
  }

  const s = styles

  return (
    <div style={s.container}>
      <div style={s.grid} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '900px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={onBack} style={s.backBtn}>← HUB</button>
          <div>
            <h2 style={s.title}>Sistema PLD</h2>
            <p style={s.subtitle}>PREVENCIÓN DE LAVADO DE DINERO</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {[
            { id: 'consulta', label: 'Consulta' },
            { id: 'base', label: 'Base de Datos' },
            { id: 'historial', label: `Historial (${historial.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)} style={{
              ...s.tab,
              borderBottom: tab === t.id ? '2px solid #00FF88' : '2px solid transparent',
              color: tab === t.id ? '#00FF88' : '#4A5568',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* CONSULTA TAB */}
        {tab === 'consulta' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { key: 'nombre', label: 'Nombre completo' },
                { key: 'rfc', label: 'RFC' },
                { key: 'curp', label: 'CURP' },
              ].map(field => (
                <div key={field.key}>
                  <label style={s.label}>{field.label}</label>
                  <input
                    style={s.input}
                    placeholder={field.key === 'nombre' ? 'Ej. Juan García López' : field.key.toUpperCase()}
                    value={consultaInput[field.key as keyof typeof consultaInput]}
                    onChange={e => setConsultaInput(prev => ({ ...prev, [field.key]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleConsulta()}
                  />
                </div>
              ))}
            </div>
            <button onClick={handleConsulta} disabled={loading} style={{
              ...s.primaryBtn,
              opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Consultando...' : '→ Consultar Listas'}
            </button>

            {resultado && (
              <div style={{
                marginTop: '2rem',
                border: `1px solid ${resultado.alerta ? 'rgba(255,50,50,0.4)' : 'rgba(0,255,136,0.2)'}`,
                borderRadius: '12px', padding: '1.5rem',
                background: resultado.alerta ? 'rgba(255,50,50,0.05)' : 'rgba(0,255,136,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: resultado.alerta ? '#FF3232' : '#00FF88',
                    boxShadow: `0 0 12px ${resultado.alerta ? '#FF3232' : '#00FF88'}`,
                  }} />
                  <span style={{ color: resultado.alerta ? '#FF6060' : '#00FF88', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
                    {resultado.alerta ? `ALERTA — ${resultado.hits} coincidencia(s) encontrada(s)` : 'SIN COINCIDENCIAS — Lista limpia'}
                  </span>
                  <span style={{ color: '#2D3748', fontSize: '0.7rem', marginLeft: 'auto' }}>{resultado.consultado}</span>
                </div>
                {resultado.resultados.length > 0 && resultado.resultados.map((r, i) => (
                  <div key={i} style={{ padding: '0.75rem', background: 'rgba(255,50,50,0.08)', borderRadius: '8px', marginTop: '0.5rem' }}>
                    <div style={{ color: '#F0F0F0', fontSize: '0.85rem' }}>{r.nombre_completo}</div>
                    <div style={{ color: '#4A5568', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {r.fuente && `Fuente: ${r.fuente}`} {r.motivo && `· ${r.motivo}`}
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: '1rem', color: '#2D3748', fontSize: '0.7rem' }}>
                  Fuentes: pld_local · ofac_sdn (próx.) · sat_69b (próx.) · onu_consolidada (próx.)
                </div>
              </div>
            )}
          </div>
        )}

        {/* BASE DE DATOS TAB */}
        {tab === 'base' && (
          <div>
            <div style={{
              border: '1px dashed rgba(0,255,136,0.2)', borderRadius: '12px',
              padding: '3rem', textAlign: 'center', marginBottom: '1.5rem',
              background: 'rgba(0,255,136,0.02)', cursor: 'pointer',
            }}
            onClick={() => fileRef.current?.click()}
            >
              <div style={{ color: '#00FF88', fontSize: '2rem', marginBottom: '1rem' }}>↑</div>
              <div style={{ color: '#F0F0F0', marginBottom: '0.5rem' }}>Subir base de datos PLD</div>
              <div style={{ color: '#4A5568', fontSize: '0.8rem' }}>CSV · Columnas: nombre, rfc, curp, fuente, motivo</div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
            </div>

            {uploadStatus && (
              <div style={{ color: '#00FF88', fontSize: '0.8rem', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
                {uploadStatus}
              </div>
            )}

            {uploadedRecords.length > 0 && (
              <>
                <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem' }}>
                    {['Nombre', 'RFC', 'Fuente', 'Motivo'].map(h => (
                      <span key={h} style={{ color: '#4A5568', fontSize: '0.7rem', letterSpacing: '0.1em' }}>{h}</span>
                    ))}
                  </div>
                  {uploadedRecords.slice(0, 10).map((r, i) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                      padding: '0.75rem 1rem',
                      borderTop: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      <span style={{ color: '#F0F0F0', fontSize: '0.8rem' }}>{r.nombre_completo || '—'}</span>
                      <span style={{ color: '#4A5568', fontSize: '0.8rem' }}>{r.rfc || '—'}</span>
                      <span style={{ color: '#4A5568', fontSize: '0.8rem' }}>{r.fuente || '—'}</span>
                      <span style={{ color: '#4A5568', fontSize: '0.8rem' }}>{r.motivo || '—'}</span>
                    </div>
                  ))}
                  {uploadedRecords.length > 10 && (
                    <div style={{ padding: '0.75rem 1rem', color: '#2D3748', fontSize: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      + {uploadedRecords.length - 10} registros más
                    </div>
                  )}
                </div>
                <button style={s.primaryBtn}>→ Importar {uploadedRecords.length} registros a BD</button>
              </>
            )}
          </div>
        )}

        {/* HISTORIAL TAB */}
        {tab === 'historial' && (
          <div>
            {historial.length === 0 ? (
              <div style={{ color: '#2D3748', textAlign: 'center', padding: '3rem', fontSize: '0.85rem' }}>
                Sin consultas en esta sesión
              </div>
            ) : (
              historial.map((h, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                    background: h.alerta ? '#FF3232' : '#00FF88',
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#F0F0F0', fontSize: '0.85rem' }}>
                      {[consultaInput.nombre, consultaInput.rfc, consultaInput.curp].filter(Boolean).join(' · ') || 'Consulta'}
                    </div>
                    <div style={{ color: '#4A5568', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                      {h.hits} resultado(s)
                    </div>
                  </div>
                  <span style={{ color: '#2D3748', fontSize: '0.7rem' }}>{h.consultado}</span>
                </div>
              ))
            )}
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
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '2rem',
  },
  grid: {
    position: 'fixed', inset: 0, zIndex: 0,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  },
  backBtn: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
    color: '#4A5568', padding: '0.4rem 0.8rem', borderRadius: '6px',
    cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.1em',
    fontFamily: 'inherit',
  },
  title: { color: '#F0F0F0', fontSize: '1.4rem', fontWeight: '400', margin: 0 },
  subtitle: { color: '#4A5568', fontSize: '0.7rem', letterSpacing: '0.15em', margin: '0.25rem 0 0' },
  tab: {
    background: 'transparent', border: 'none', padding: '0.75rem 1.25rem',
    cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '0.08em',
    fontFamily: "'DM Mono', monospace", transition: 'color 0.2s',
  },
  label: { color: '#4A5568', fontSize: '0.7rem', letterSpacing: '0.1em', display: 'block', marginBottom: '0.4rem' },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
    padding: '0.75rem 1rem', color: '#F0F0F0', fontSize: '0.85rem',
    fontFamily: "'DM Mono', monospace", outline: 'none',
  },
  primaryBtn: {
    background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)',
    color: '#00FF88', padding: '0.75rem 1.5rem', borderRadius: '8px',
    cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '0.1em',
    fontFamily: "'DM Mono', monospace", transition: 'all 0.2s',
  },
}
