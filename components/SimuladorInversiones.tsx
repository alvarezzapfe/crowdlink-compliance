'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TasasResponse } from '@/app/api/tasas/route'

/* ─── Types ──────────────────────────────────────────────────── */

interface Instrumento {
  key: string
  label: string
  tasa: number
  color: string
  riesgo: 'MÍNIMO' | 'BAJO' | 'ALTO'
  riesgoNota: string
  visible: boolean
  isrTipo: 'deuda' | 'capital'
}

interface PuntoAnual {
  año: number
  [key: string]: number
}

interface ResultadoFinal {
  key: string
  label: string
  bruto: number
  isr: number
  neto: number
  ganancia: number
  riesgo: string
  riesgoNota: string
  color: string
}

/* ─── Defaults ───────────────────────────────────────────────── */

const INSTRUMENTOS_DEFAULT: Instrumento[] = [
  {
    key: 'crowdlink', label: 'Crédito Crowdlink', tasa: 15.0,
    color: '#3EE8A0', riesgo: 'ALTO',
    riesgoNota: 'No cubierto por IPAB. Riesgo de impago del acreditado.',
    visible: true, isrTipo: 'deuda',
  },
  {
    key: 'sp500', label: 'S&P 500', tasa: 10.0,
    color: '#0891B2', riesgo: 'ALTO',
    riesgoNota: 'Renta variable en USD. Volatilidad + riesgo cambiario MXN/USD.',
    visible: true, isrTipo: 'capital',
  },
  {
    key: 'cetes', label: 'CETES 364d', tasa: 7.17,
    color: '#7C3AED', riesgo: 'MÍNIMO',
    riesgoNota: 'Respaldo del Gobierno Federal. Prácticamente libre de riesgo.',
    visible: true, isrTipo: 'deuda',
  },
  {
    key: 'pagare', label: 'Pagaré bancario', tasa: 6.5,
    color: '#D97706', riesgo: 'BAJO',
    riesgoNota: 'Protegido por IPAB hasta 400,000 UDIs (~$3.2M MXN).',
    visible: true, isrTipo: 'deuda',
  },
]

const formatMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

const formatPct = (n: number) => `${n.toFixed(2)}%`

/* ─── Financial logic ────────────────────────────────────────── */

function simular(
  montoInicial: number,
  aportMensual: number,
  años: number,
  tasaAnual: number,
  isrTipo: 'deuda' | 'capital',
  descontarISR: boolean,
): { serieAnual: number[]; bruto: number; isr: number; neto: number } {
  const rMensual = Math.pow(1 + tasaAnual / 100, 1 / 12) - 1
  const meses = años * 12
  const serieAnual: number[] = [montoInicial]
  let saldo = montoInicial
  let isrAcumulado = 0

  for (let m = 1; m <= meses; m++) {
    if (descontarISR && isrTipo === 'deuda') {
      isrAcumulado += (0.009 / 12) * saldo
    }
    saldo = saldo * (1 + rMensual) + aportMensual
    if (m % 12 === 0) serieAnual.push(saldo)
  }
  // If we didn't end on a year boundary, push final
  if (meses % 12 !== 0) serieAnual.push(saldo)

  const bruto = saldo
  let isr = 0
  if (descontarISR) {
    if (isrTipo === 'deuda') {
      isr = isrAcumulado
    } else {
      // capital: 10% sobre ganancia total
      const ganancia = bruto - montoInicial - aportMensual * meses
      isr = ganancia > 0 ? 0.10 * ganancia : 0
    }
  }
  const neto = bruto - isr

  return { serieAnual, bruto, isr, neto }
}

/* ─── Component ──────────────────────────────────────────────── */

export default function SimuladorInversiones() {
  const [montoInicial, setMontoInicial] = useState(100000)
  const [aportMensual, setAportMensual] = useState(0)
  const [años, setAños] = useState(5)
  const [descontarISR, setDescontarISR] = useState(true)
  const [instrumentos, setInstrumentos] = useState<Instrumento[]>(INSTRUMENTOS_DEFAULT)
  const [tasasLive, setTasasLive] = useState(false)

  // Fetch live rates
  useEffect(() => {
    fetch('/api/tasas')
      .then(r => r.json())
      .then((data: TasasResponse) => {
        if (data.fuente === 'banxico' && data.cetes364 !== null) {
          setInstrumentos(prev => prev.map(inst => {
            if (inst.key === 'cetes' && data.cetes364 !== null) return { ...inst, tasa: data.cetes364 }
            if (inst.key === 'pagare' && data.cetes28 !== null) return { ...inst, tasa: Math.round(data.cetes28 * 0.95 * 100) / 100 }
            return inst
          }))
          setTasasLive(true)
        }
      })
      .catch(() => { /* keep defaults */ })
  }, [])

  const updateTasa = useCallback((key: string, tasa: number) => {
    setInstrumentos(prev => prev.map(i => i.key === key ? { ...i, tasa } : i))
  }, [])

  const toggleVisible = useCallback((key: string) => {
    setInstrumentos(prev => prev.map(i => i.key === key ? { ...i, visible: !i.visible } : i))
  }, [])

  // Calculate results
  const { chartData, resultados } = useMemo(() => {
    const results: ResultadoFinal[] = []
    const dataPoints: PuntoAnual[] = []

    // Init data points array
    for (let y = 0; y <= años; y++) {
      dataPoints.push({ año: y })
    }

    for (const inst of instrumentos) {
      const sim = simular(montoInicial, aportMensual, años, inst.tasa, inst.isrTipo, descontarISR)

      for (let y = 0; y <= años; y++) {
        if (sim.serieAnual[y] !== undefined) {
          dataPoints[y][inst.key] = Math.round(sim.serieAnual[y])
        }
      }

      const totalAportado = montoInicial + aportMensual * años * 12
      results.push({
        key: inst.key,
        label: inst.label,
        bruto: sim.bruto,
        isr: sim.isr,
        neto: sim.neto,
        ganancia: sim.neto - totalAportado,
        riesgo: inst.riesgo,
        riesgoNota: inst.riesgoNota,
        color: inst.color,
      })
    }

    results.sort((a, b) => b.neto - a.neto)

    return { chartData: dataPoints, resultados: results }
  }, [montoInicial, aportMensual, años, descontarISR, instrumentos])

  const mejorResultado = resultados[0]

  const riesgoColor = (r: string) =>
    r === 'MÍNIMO' ? '#3EE8A0' : r === 'BAJO' ? '#D97706' : '#FF4444'

  return (
    <div style={s.wrapper}>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
        .sim-input:focus { border-color: #3EE8A0 !important; outline: none; }
        .sim-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.08); outline: none; }
        .sim-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #3EE8A0; cursor: pointer; border: 2px solid #050A14; }
        .sim-slider::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: #3EE8A0; cursor: pointer; border: 2px solid #050A14; }
        .sim-slider:focus { box-shadow: 0 0 0 3px rgba(62,232,160,0.3); }
        .sim-toggle { position: relative; width: 40px; height: 22px; border-radius: 11px; cursor: pointer; border: none; transition: background 0.2s; }
        .sim-toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: white; transition: transform 0.2s; }
        .sim-toggle[data-on="true"] { background: #3EE8A0; }
        .sim-toggle[data-on="true"]::after { transform: translateX(18px); }
        .sim-toggle[data-on="false"] { background: rgba(255,255,255,0.15); }
        .winner-card { animation: glowPulse 3s ease-in-out infinite; }
        @keyframes glowPulse { 0%,100% { box-shadow: 0 0 20px rgba(62,232,160,0.1); } 50% { box-shadow: 0 0 30px rgba(62,232,160,0.2); } }
        .result-row { transition: background 0.15s; }
        .result-row:hover { background: rgba(255,255,255,0.03) !important; }
      `}</style>

      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3EE8A0' }} />
          <span style={s.tag}>SIMULADOR DE INVERSIONES</span>
        </div>
        <h2 style={s.title}>Compara tu rendimiento</h2>
        <p style={s.subtitle}>
          Simula cómo crecería tu inversión en diferentes instrumentos financieros.
          {tasasLive && (
            <span style={{ color: '#3EE8A0', fontSize: '0.72rem', marginLeft: '0.5rem' }}>
              ● Tasas actualizadas vía Banxico
            </span>
          )}
        </p>
      </div>

      {/* Controls grid */}
      <div style={s.controlsGrid}>
        {/* Monto inicial */}
        <div style={s.controlGroup}>
          <label htmlFor="sim-monto" style={s.label}>Monto inicial</label>
          <div style={s.inputWrapper}>
            <span style={s.inputPrefix}>$</span>
            <input
              id="sim-monto"
              className="sim-input"
              type="number"
              min={1000}
              step={1000}
              value={montoInicial}
              onChange={e => setMontoInicial(Math.max(0, Number(e.target.value)))}
              style={s.input}
              aria-label="Monto inicial en pesos mexicanos"
            />
          </div>
        </div>

        {/* Aportación mensual */}
        <div style={s.controlGroup}>
          <label htmlFor="sim-aport" style={s.label}>Aportación mensual</label>
          <div style={s.inputWrapper}>
            <span style={s.inputPrefix}>$</span>
            <input
              id="sim-aport"
              className="sim-input"
              type="number"
              min={0}
              step={500}
              value={aportMensual}
              onChange={e => setAportMensual(Math.max(0, Number(e.target.value)))}
              style={s.input}
              aria-label="Aportación mensual en pesos mexicanos"
            />
          </div>
        </div>

        {/* Plazo */}
        <div style={s.controlGroup}>
          <label htmlFor="sim-plazo" style={s.label}>
            Plazo: <strong style={{ color: '#3EE8A0' }}>{años} {años === 1 ? 'año' : 'años'}</strong>
          </label>
          <input
            id="sim-plazo"
            className="sim-slider"
            type="range"
            min={1}
            max={30}
            value={años}
            onChange={e => setAños(Number(e.target.value))}
            aria-label={`Plazo en años: ${años}`}
            aria-valuemin={1}
            aria-valuemax={30}
            aria-valuenow={años}
          />
          <div style={s.sliderLabels}>
            <span>1 año</span><span>30 años</span>
          </div>
        </div>

        {/* ISR toggle */}
        <div style={{ ...s.controlGroup, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label htmlFor="sim-isr" style={{ ...s.label, marginBottom: 0 }}>Descontar ISR estimado</label>
          <button
            id="sim-isr"
            className="sim-toggle"
            role="switch"
            aria-checked={descontarISR}
            aria-label="Descontar ISR estimado"
            data-on={String(descontarISR)}
            onClick={() => setDescontarISR(!descontarISR)}
          />
        </div>
      </div>

      {/* Instrument toggles + editable rates */}
      <div style={s.instrumentsGrid}>
        {instrumentos.map(inst => (
          <div key={inst.key} style={{
            ...s.instrumentCard,
            borderColor: inst.visible ? `${inst.color}40` : 'rgba(255,255,255,0.06)',
            opacity: inst.visible ? 1 : 0.5,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: inst.color }} />
                <span style={{ color: 'white', fontSize: '0.78rem', fontWeight: '600' }}>{inst.label}</span>
              </div>
              <button
                className="sim-toggle"
                role="switch"
                aria-checked={inst.visible}
                aria-label={`Mostrar ${inst.label} en gráfica`}
                data-on={String(inst.visible)}
                onClick={() => toggleVisible(inst.key)}
                style={{ width: '32px', height: '18px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input
                className="sim-input"
                type="number"
                step={0.01}
                min={0}
                max={100}
                value={inst.tasa}
                onChange={e => updateTasa(inst.key, Number(e.target.value))}
                style={{ ...s.input, width: '80px', padding: '0.35rem 0.5rem', fontSize: '0.82rem', textAlign: 'right' as const }}
                aria-label={`Tasa anual de ${inst.label}`}
              />
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>% anual</span>
            </div>
            <div style={{ marginTop: '0.4rem' }}>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: '700',
                color: riesgoColor(inst.riesgo),
                background: `${riesgoColor(inst.riesgo)}15`,
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                letterSpacing: '0.05em',
              }}>
                RIESGO {inst.riesgo}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={s.chartContainer}>
        <h3 style={s.sectionTitle}>Crecimiento proyectado</h3>
        <div style={{ width: '100%', height: 360 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="año"
                stroke="rgba(255,255,255,0.3)"
                fontSize={12}
                tickFormatter={(v: number) => `${v}a`}
              />
              <YAxis
                stroke="rgba(255,255,255,0.3)"
                fontSize={11}
                tickFormatter={(v: number) => {
                  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
                  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
                  return `$${v}`
                }}
                width={65}
              />
              <Tooltip
                contentStyle={{
                  background: '#0D1117',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  color: 'white',
                }}
                labelFormatter={(v) => `Año ${v}`}
                formatter={(value, name) => {
                  const inst = instrumentos.find(i => i.key === String(name))
                  return [formatMXN(Number(value)), inst?.label ?? String(name)]
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}
                formatter={(value: string) => {
                  const inst = instrumentos.find(i => i.key === value)
                  return inst?.label ?? value
                }}
              />
              {instrumentos.filter(i => i.visible).map(inst => (
                <Line
                  key={inst.key}
                  type="monotone"
                  dataKey={inst.key}
                  stroke={inst.color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0, fill: inst.color }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Winner card */}
      {mejorResultado && (
        <div className="winner-card" style={s.winnerCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3EE8A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span style={{ color: '#3EE8A0', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.1em' }}>
              MAYOR VALOR FINAL{descontarISR ? ' NETO' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'white', fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
              {mejorResultado.label}
            </span>
            <span style={{ color: '#3EE8A0', fontSize: '1.3rem', fontWeight: '700' }}>
              {formatMXN(mejorResultado.neto)}
            </span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            Ganancia{descontarISR ? ' neta' : ''}: {formatMXN(mejorResultado.ganancia)} · Riesgo: {mejorResultado.riesgo}
          </p>
        </div>
      )}

      {/* Results table */}
      <div style={s.tableContainer}>
        <h3 style={s.sectionTitle}>Comparativa detallada</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table} role="table">
            <thead>
              <tr>
                <th style={s.th}>Instrumento</th>
                <th style={{ ...s.th, textAlign: 'right' as const }}>Tasa</th>
                <th style={{ ...s.th, textAlign: 'right' as const }}>Valor bruto</th>
                {descontarISR && <th style={{ ...s.th, textAlign: 'right' as const }}>ISR estimado</th>}
                <th style={{ ...s.th, textAlign: 'right' as const }}>Valor {descontarISR ? 'neto' : 'final'}</th>
                <th style={{ ...s.th, textAlign: 'right' as const }}>Ganancia</th>
                <th style={{ ...s.th, textAlign: 'center' as const }}>Riesgo</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((r, i) => (
                <tr key={r.key} className="result-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={s.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '3px', background: r.color }} />
                      <span style={{ fontWeight: i === 0 ? '700' : '400', color: i === 0 ? '#3EE8A0' : 'rgba(255,255,255,0.8)' }}>
                        {r.label}
                      </span>
                      {i === 0 && <span style={{ fontSize: '0.6rem', color: '#3EE8A0', fontWeight: '700' }}>★</span>}
                    </div>
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' as const, fontFamily: "'DM Sans', monospace" }}>
                    {formatPct(instrumentos.find(x => x.key === r.key)?.tasa ?? 0)}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' as const, fontFamily: "'DM Sans', monospace" }}>
                    {formatMXN(r.bruto)}
                  </td>
                  {descontarISR && (
                    <td style={{ ...s.td, textAlign: 'right' as const, color: '#FF6B6B', fontFamily: "'DM Sans', monospace" }}>
                      −{formatMXN(r.isr)}
                    </td>
                  )}
                  <td style={{ ...s.td, textAlign: 'right' as const, fontWeight: '600', color: 'white', fontFamily: "'DM Sans', monospace" }}>
                    {formatMXN(r.neto)}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' as const, color: r.ganancia >= 0 ? '#3EE8A0' : '#FF4444', fontFamily: "'DM Sans', monospace" }}>
                    {r.ganancia >= 0 ? '+' : ''}{formatMXN(r.ganancia)}
                  </td>
                  <td style={{ ...s.td, textAlign: 'center' as const }}>
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: '700',
                      color: riesgoColor(r.riesgo),
                      background: `${riesgoColor(r.riesgo)}15`,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      letterSpacing: '0.05em',
                    }}>
                      {r.riesgo}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk notes */}
      <div style={s.notesContainer}>
        <h3 style={{ ...s.sectionTitle, marginBottom: '0.75rem' }}>Notas de riesgo</h3>
        {instrumentos.map(inst => (
          <div key={inst.key} style={s.noteRow}>
            <div style={{ width: '8px', height: '8px', borderRadius: '3px', background: inst.color, flexShrink: 0, marginTop: '0.2rem' }} />
            <div>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: '600' }}>{inst.label}</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem' }}> — {inst.riesgoNota}</span>
            </div>
          </div>
        ))}
        <div style={s.disclaimer}>
          <p>
            <strong>Disclaimer:</strong> Este simulador es una herramienta ilustrativa. Los rendimientos pasados no garantizan resultados futuros.
            Las tasas de CETES se obtienen del SIE de Banxico. El ISR sobre intereses usa la tasa de retención provisional
            del art. 21 LIF 2026 (0.90% anual sobre capital). S&P 500 considera rendimiento promedio histórico nominal en USD
            sin ajuste por tipo de cambio. Consulta a un asesor financiero antes de invertir.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── Styles ─────────────────────────────────────────────────── */

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    width: '100%',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '2rem',
  },
  tag: {
    color: '#3EE8A0',
    fontSize: '0.68rem',
    fontWeight: '700',
    letterSpacing: '0.1em',
  },
  title: {
    color: 'white',
    fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
    fontWeight: '800',
    letterSpacing: '-0.03em',
    lineHeight: 1.15,
    margin: '0 0 0.5rem',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '0.88rem',
    lineHeight: 1.7,
    margin: 0,
  },
  controlsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  controlGroup: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '1rem',
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
    fontWeight: '500',
    marginBottom: '0.5rem',
    display: 'block',
  },
  inputWrapper: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  inputPrefix: {
    position: 'absolute' as const,
    left: '0.75rem',
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.85rem',
    fontWeight: '500',
    pointerEvents: 'none' as const,
  },
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '0.6rem 0.75rem 0.6rem 1.75rem',
    color: 'white',
    fontSize: '0.9rem',
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    color: 'rgba(255,255,255,0.25)',
    fontSize: '0.65rem',
    marginTop: '0.35rem',
  },
  instrumentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '0.75rem',
    marginBottom: '2rem',
  },
  instrumentCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '1rem',
    transition: 'border-color 0.2s',
  },
  chartContainer: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.78rem',
    fontWeight: '600',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    marginBottom: '1rem',
    margin: '0 0 1rem',
  },
  winnerCard: {
    background: 'rgba(62,232,160,0.04)',
    border: '1px solid rgba(62,232,160,0.15)',
    borderRadius: '14px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  tableContainer: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.8rem',
  },
  th: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: '0.68rem',
    fontWeight: '600',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    padding: '0.6rem 0.75rem',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    textAlign: 'left' as const,
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '0.75rem',
    color: 'rgba(255,255,255,0.65)',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap' as const,
  },
  notesContainer: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '1.5rem',
  },
  noteRow: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.5rem',
    alignItems: 'flex-start',
  },
  disclaimer: {
    marginTop: '1rem',
    padding: '1rem',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.68rem',
    lineHeight: 1.7,
  },
}
