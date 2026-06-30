'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TasasResponse } from '@/app/api/tasas/route'
import { IconStar, IconTrendingUp, IconGlobe } from '@/components/Icons'

/* ─── Brand tokens (light) ───────────────────────────────────── */

const B = {
  blue: '#1478FB',
  mint: '#28C89C',
  mintDark: '#1FA882',
  mintLight: '#EDFAF5',
  ink: '#0A1628',
  textSoft: '#5B6B7F',
  textMuted: '#8D99A8',
  bg: '#FFFFFF',
  bgOff: '#F6F9FC',
  border: '#E6EBF1',
  borderLight: '#F0F3F7',
  shadow: '0 1px 3px rgba(10,22,40,0.06), 0 1px 2px rgba(10,22,40,0.04)',
  shadowMd: '0 4px 12px rgba(10,22,40,0.07), 0 1px 3px rgba(10,22,40,0.04)',
  shadowLg: '0 12px 32px rgba(10,22,40,0.08), 0 4px 8px rgba(10,22,40,0.04)',
  fontDisplay: "'DM Sans', -apple-system, sans-serif",
  fontBody: "'Inter', -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",
}

/* ─── Types ──────────────────────────────────────────────────── */

interface Instrumento {
  key: string
  label: string
  tasa: number
  color: string
  riesgo: 'MINIMO' | 'BAJO' | 'ALTO'
  riesgoLabel: string
  riesgoNota: string
  visible: boolean
  isrTipo: 'deuda' | 'capital'
}

interface PuntoAnual {
  year: number
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
  riesgoLabel: string
  riesgoNota: string
  color: string
  tasa: number
}

/* ─── Defaults ───────────────────────────────────────────────── */

const INSTRUMENTOS_DEFAULT: Instrumento[] = [
  {
    key: 'crowdlink', label: 'Credito Crowdlink', tasa: 15.0,
    color: '#1478FB', riesgo: 'ALTO', riesgoLabel: 'Alto',
    riesgoNota: 'No cubierto por IPAB. Riesgo de impago del acreditado.',
    visible: true, isrTipo: 'deuda',
  },
  {
    key: 'sp500', label: 'S&P 500', tasa: 10.0,
    color: '#28C89C', riesgo: 'ALTO', riesgoLabel: 'Alto',
    riesgoNota: 'Renta variable en USD. Volatilidad + riesgo cambiario MXN/USD.',
    visible: true, isrTipo: 'capital',
  },
  {
    key: 'cetes', label: 'CETES 364d', tasa: 7.17,
    color: '#7C3AED', riesgo: 'MINIMO', riesgoLabel: 'Minimo',
    riesgoNota: 'Respaldo del Gobierno Federal. Practicamente libre de riesgo.',
    visible: true, isrTipo: 'deuda',
  },
  {
    key: 'pagare', label: 'Pagare bancario', tasa: 6.5,
    color: '#D97706', riesgo: 'BAJO', riesgoLabel: 'Bajo',
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
  anios: number,
  tasaAnual: number,
  isrTipo: 'deuda' | 'capital',
  descontarISR: boolean,
): { serieAnual: number[]; bruto: number; isr: number; neto: number } {
  const rMensual = Math.pow(1 + tasaAnual / 100, 1 / 12) - 1
  const meses = anios * 12
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
  if (meses % 12 !== 0) serieAnual.push(saldo)

  const bruto = saldo
  let isr = 0
  if (descontarISR) {
    if (isrTipo === 'deuda') {
      isr = isrAcumulado
    } else {
      const ganancia = bruto - montoInicial - aportMensual * meses
      isr = ganancia > 0 ? 0.10 * ganancia : 0
    }
  }

  return { serieAnual, bruto, isr, neto: bruto - isr }
}

/* ─── Component ──────────────────────────────────────────────── */

export default function SimuladorInversiones() {
  const [mounted, setMounted] = useState(false)
  const [montoInicial, setMontoInicial] = useState(100000)
  const [aportMensual, setAportMensual] = useState(0)
  const [anios, setAnios] = useState(5)
  const [descontarISR, setDescontarISR] = useState(true)
  const [ajustarFX, setAjustarFX] = useState(false)
  const [deprecAnual, setDeprecAnual] = useState(4)
  const [instrumentos, setInstrumentos] = useState<Instrumento[]>(INSTRUMENTOS_DEFAULT)
  const [tasasLive, setTasasLive] = useState(false)

  useEffect(() => { setMounted(true) }, [])

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

    for (let y = 0; y <= anios; y++) {
      dataPoints.push({ year: y })
    }

    for (const inst of instrumentos) {
      // Adjust S&P 500 rate for FX if toggle is on
      let tasaEfectiva = inst.tasa
      if (inst.key === 'sp500' && ajustarFX) {
        // Convert USD return to MXN: (1 + USD_return)(1 + MXN_depreciation) - 1
        tasaEfectiva = ((1 + inst.tasa / 100) * (1 + deprecAnual / 100) - 1) * 100
      }

      const sim = simular(montoInicial, aportMensual, anios, tasaEfectiva, inst.isrTipo, descontarISR)

      for (let y = 0; y <= anios; y++) {
        if (sim.serieAnual[y] !== undefined) {
          dataPoints[y][inst.key] = Math.round(sim.serieAnual[y])
        }
      }

      const totalAportado = montoInicial + aportMensual * anios * 12
      results.push({
        key: inst.key,
        label: inst.label,
        bruto: sim.bruto,
        isr: sim.isr,
        neto: sim.neto,
        ganancia: sim.neto - totalAportado,
        riesgo: inst.riesgo,
        riesgoLabel: inst.riesgoLabel,
        riesgoNota: inst.riesgoNota,
        color: inst.color,
        tasa: inst.key === 'sp500' && ajustarFX ? tasaEfectiva : inst.tasa,
      })
    }

    results.sort((a, b) => b.neto - a.neto)
    return { chartData: dataPoints, resultados: results }
  }, [montoInicial, aportMensual, anios, descontarISR, instrumentos, ajustarFX, deprecAnual])

  const mejor = resultados[0]
  const segundo = resultados[1]
  const delta = mejor && segundo ? mejor.neto - segundo.neto : 0

  const riesgoColor = (r: string) =>
    r === 'MINIMO' ? B.mint : r === 'BAJO' ? '#D97706' : '#EF4444'

  const riesgoBg = (r: string) =>
    r === 'MINIMO' ? B.mintLight : r === 'BAJO' ? '#FFF8EB' : '#FEF2F2'

  return (
    <div style={{ width: '100%', maxWidth: '960px', margin: '0 auto' }}>
      <style>{`
        @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
        .sim-input{transition:border-color 0.15s}
        .sim-input:focus{border-color:${B.blue}!important;outline:none;box-shadow:0 0 0 3px rgba(20,120,251,0.1)}
        .sim-slider{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:3px;background:${B.border};outline:none}
        .sim-slider::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:${B.blue};cursor:pointer;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.15)}
        .sim-slider::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:${B.blue};cursor:pointer;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.15)}
        .sim-slider:focus-visible{box-shadow:0 0 0 3px rgba(20,120,251,0.2)}
        .sim-toggle{position:relative;width:44px;height:24px;border-radius:12px;cursor:pointer;border:none;transition:background 0.2s;flex-shrink:0}
        .sim-toggle::after{content:'';position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:white;transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.15)}
        .sim-toggle[data-on="true"]{background:${B.blue}}
        .sim-toggle[data-on="true"]::after{transform:translateX(20px)}
        .sim-toggle[data-on="false"]{background:${B.border}}
        .sim-toggle:focus-visible{outline:2px solid ${B.blue};outline-offset:2px}
        .result-row{transition:background 0.15s}
        .result-row:hover{background:${B.bgOff}!important}
        .inst-card{transition:all 0.15s}
        .inst-card:hover{box-shadow:${B.shadowMd}}
      `}</style>

      {/* ── Header ──────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <IconTrendingUp size={16} color={B.mint} strokeWidth={2} />
          <span style={{
            fontFamily: B.fontMono, fontSize: '0.7rem', fontWeight: '600',
            color: B.mint, letterSpacing: '0.08em',
          }}>
            SIMULADOR DE INVERSIONES
          </span>
          {tasasLive && (
            <span style={{
              fontFamily: B.fontMono, fontSize: '0.62rem', fontWeight: '500',
              color: B.textMuted, marginLeft: '0.5rem',
              background: B.bgOff, padding: '0.15rem 0.5rem', borderRadius: '4px',
            }}>
              Tasas via Banxico
            </span>
          )}
        </div>
        <h2 style={{
          fontFamily: B.fontDisplay, fontWeight: '800',
          fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
          letterSpacing: '-0.03em', lineHeight: 1.1,
          color: B.ink, margin: '0 0 0.5rem',
        }}>
          Compara tu rendimiento
        </h2>
        <p style={{
          color: B.textSoft, fontSize: '0.95rem', lineHeight: 1.6, margin: 0,
          fontFamily: B.fontBody,
        }}>
          Simula como creceria tu inversion en diferentes instrumentos financieros.
        </p>
      </div>

      {/* ── Winner card (prominent, at top) ─────────────── */}
      {mejor && (
        <div style={{
          background: `linear-gradient(135deg, ${B.bgOff} 0%, white 100%)`,
          border: `1px solid ${B.border}`,
          borderRadius: '16px', padding: '2rem',
          marginBottom: '2rem', boxShadow: B.shadowMd,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <IconStar size={18} color={B.mint} strokeWidth={2} />
            <span style={{
              fontFamily: B.fontMono, fontSize: '0.7rem', fontWeight: '700',
              color: B.mint, letterSpacing: '0.08em',
            }}>
              MAYOR VALOR FINAL{descontarISR ? ' NETO' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <span style={{
              fontFamily: B.fontDisplay, fontSize: 'clamp(1.3rem, 3vw, 1.6rem)',
              fontWeight: '800', color: B.ink, letterSpacing: '-0.02em',
            }}>
              {mejor.label}
            </span>
            <span style={{
              fontFamily: B.fontMono, fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              fontWeight: '700', color: B.mint, letterSpacing: '-0.02em',
            }}>
              {formatMXN(mejor.neto)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: B.fontBody, fontSize: '0.85rem', color: B.textSoft }}>
              Ganancia{descontarISR ? ' neta' : ''}:{' '}
              <span style={{ fontFamily: B.fontMono, fontWeight: '600', color: mejor.ganancia >= 0 ? B.mint : '#EF4444' }}>
                {mejor.ganancia >= 0 ? '+' : ''}{formatMXN(mejor.ganancia)}
              </span>
            </span>
            {delta > 0 && (
              <span style={{ fontFamily: B.fontBody, fontSize: '0.85rem', color: B.textSoft }}>
                Ventaja vs 2do:{' '}
                <span style={{ fontFamily: B.fontMono, fontWeight: '600', color: B.blue }}>
                  +{formatMXN(delta)}
                </span>
              </span>
            )}
            <span style={{
              fontFamily: B.fontMono, fontSize: '0.7rem', fontWeight: '600',
              color: riesgoColor(mejor.riesgo),
              background: riesgoBg(mejor.riesgo),
              padding: '0.2rem 0.6rem', borderRadius: '6px',
              alignSelf: 'center',
            }}>
              Riesgo {mejor.riesgoLabel}
            </span>
          </div>
        </div>
      )}

      {/* ── Controls ────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem', marginBottom: '1.5rem',
      }}>
        {/* Monto inicial */}
        <div style={s.controlGroup}>
          <label htmlFor="sim-monto" style={s.label}>Monto inicial</label>
          <div style={s.inputWrapper}>
            <span style={s.inputPrefix}>$</span>
            <input
              id="sim-monto" className="sim-input" type="number"
              min={1000} step={1000} value={montoInicial}
              onChange={e => setMontoInicial(Math.max(0, Number(e.target.value)))}
              style={s.input}
              aria-label="Monto inicial en pesos mexicanos"
            />
          </div>
        </div>

        {/* Aportacion mensual */}
        <div style={s.controlGroup}>
          <label htmlFor="sim-aport" style={s.label}>Aportacion mensual</label>
          <div style={s.inputWrapper}>
            <span style={s.inputPrefix}>$</span>
            <input
              id="sim-aport" className="sim-input" type="number"
              min={0} step={500} value={aportMensual}
              onChange={e => setAportMensual(Math.max(0, Number(e.target.value)))}
              style={s.input}
              aria-label="Aportacion mensual en pesos mexicanos"
            />
          </div>
        </div>

        {/* Plazo */}
        <div style={s.controlGroup}>
          <label htmlFor="sim-plazo" style={s.label}>
            Plazo:{' '}
            <span style={{ fontFamily: B.fontMono, fontWeight: '700', color: B.blue, fontSize: '1.1rem' }}>
              {anios}
            </span>{' '}
            <span style={{ color: B.textMuted }}>{anios === 1 ? 'anio' : 'anios'}</span>
          </label>
          <input
            id="sim-plazo" className="sim-slider" type="range"
            min={1} max={30} value={anios}
            onChange={e => setAnios(Number(e.target.value))}
            aria-label={`Plazo en anios: ${anios}`}
            aria-valuemin={1} aria-valuemax={30} aria-valuenow={anios}
          />
          <div style={s.sliderLabels}>
            <span>1</span><span>15</span><span>30</span>
          </div>
        </div>

        {/* ISR toggle */}
        <div style={{ ...s.controlGroup, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <label htmlFor="sim-isr" style={{ ...s.label, marginBottom: 0, flex: 1 }}>
            Descontar ISR estimado
          </label>
          <button
            id="sim-isr" className="sim-toggle" role="switch"
            aria-checked={descontarISR} aria-label="Descontar ISR estimado"
            data-on={String(descontarISR)}
            onClick={() => setDescontarISR(!descontarISR)}
          />
        </div>
      </div>

      {/* ── FX toggle ───────────────────────────────────── */}
      <div style={{
        background: B.bgOff, border: `1px solid ${B.border}`,
        borderRadius: '14px', padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 auto' }}>
          <IconGlobe size={16} color={B.blue} strokeWidth={1.8} />
          <span style={{ fontFamily: B.fontBody, fontSize: '0.85rem', fontWeight: '500', color: B.ink }}>
            Ajustar S&amp;P 500 por tipo de cambio (MXN/USD)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {ajustarFX && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <label htmlFor="sim-deprec" style={{ fontFamily: B.fontBody, fontSize: '0.78rem', color: B.textSoft, whiteSpace: 'nowrap' as const }}>
                Deprec. anual:
              </label>
              <input
                id="sim-deprec" className="sim-input" type="number"
                min={0} max={20} step={0.5} value={deprecAnual}
                onChange={e => setDeprecAnual(Math.max(0, Number(e.target.value)))}
                style={{
                  width: '60px', padding: '0.3rem 0.4rem',
                  fontFamily: B.fontMono, fontSize: '0.82rem', fontWeight: '600',
                  textAlign: 'right' as const,
                  background: B.bg, border: `1.5px solid ${B.border}`,
                  borderRadius: '8px', color: B.ink,
                }}
                aria-label="Depreciacion anual del peso"
              />
              <span style={{ fontFamily: B.fontMono, fontSize: '0.78rem', color: B.textMuted }}>%</span>
            </div>
          )}
          <button
            className="sim-toggle" role="switch"
            aria-checked={ajustarFX} aria-label="Ajustar por tipo de cambio"
            data-on={String(ajustarFX)}
            onClick={() => setAjustarFX(!ajustarFX)}
          />
        </div>
        {ajustarFX && (
          <p style={{
            width: '100%', margin: '0.25rem 0 0', fontSize: '0.72rem',
            color: B.textMuted, fontFamily: B.fontBody, lineHeight: 1.6,
          }}>
            Convierte el rendimiento del S&amp;P 500 de USD a MXN asumiendo una depreciacion del peso de {formatPct(deprecAnual)} anual.
            Historicamente el peso se ha depreciado ~4% anual frente al dolar.
          </p>
        )}
      </div>

      {/* ── Instrument cards ────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '0.75rem', marginBottom: '2rem',
      }}>
        {instrumentos.map(inst => (
          <div key={inst.key} className="inst-card" style={{
            background: B.bg,
            border: `1.5px solid ${inst.visible ? `${inst.color}40` : B.border}`,
            borderRadius: '14px', padding: '1.25rem',
            opacity: inst.visible ? 1 : 0.55,
            boxShadow: B.shadow,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '12px', height: '12px', borderRadius: '4px', background: inst.color,
                }} />
                <span style={{ fontFamily: B.fontDisplay, fontSize: '0.85rem', fontWeight: '700', color: B.ink }}>
                  {inst.label}
                </span>
              </div>
              <button
                className="sim-toggle" role="switch"
                aria-checked={inst.visible}
                aria-label={`Mostrar ${inst.label} en grafica`}
                data-on={String(inst.visible)}
                onClick={() => toggleVisible(inst.key)}
                style={{ width: '36px', height: '20px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.5rem' }}>
              <input
                className="sim-input" type="number"
                step={0.01} min={0} max={100} value={inst.tasa}
                onChange={e => updateTasa(inst.key, Number(e.target.value))}
                style={{
                  width: '80px', padding: '0.4rem 0.5rem',
                  fontFamily: B.fontMono, fontSize: '1rem', fontWeight: '700',
                  textAlign: 'right' as const, color: B.ink,
                  background: B.bgOff, border: `1.5px solid ${B.border}`, borderRadius: '8px',
                }}
                aria-label={`Tasa anual de ${inst.label}`}
              />
              <span style={{ fontFamily: B.fontMono, fontSize: '0.78rem', color: B.textMuted, fontWeight: '500' }}>
                % anual
              </span>
            </div>
            {inst.key === 'sp500' && ajustarFX && (
              <div style={{ marginBottom: '0.4rem' }}>
                <span style={{
                  fontFamily: B.fontMono, fontSize: '0.68rem', fontWeight: '600',
                  color: B.blue, background: `${B.blue}10`, padding: '0.15rem 0.4rem', borderRadius: '4px',
                }}>
                  Efectiva MXN: {formatPct(((1 + inst.tasa / 100) * (1 + deprecAnual / 100) - 1) * 100)}
                </span>
              </div>
            )}
            <span style={{
              fontFamily: B.fontMono, fontSize: '0.65rem', fontWeight: '700',
              color: riesgoColor(inst.riesgo),
              background: riesgoBg(inst.riesgo),
              padding: '0.2rem 0.5rem', borderRadius: '5px',
              letterSpacing: '0.04em',
            }}>
              RIESGO {inst.riesgo}
            </span>
          </div>
        ))}
      </div>

      {/* ── Chart ───────────────────────────────────────── */}
      <div style={{
        background: B.bg, border: `1px solid ${B.border}`,
        borderRadius: '16px', padding: '1.5rem',
        marginBottom: '1.5rem', boxShadow: B.shadow,
      }}>
        <h3 style={s.sectionTitle}>Crecimiento proyectado</h3>
        <div style={{ width: '100%', height: 380 }}>
          {mounted ? (
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={B.border} />
                <XAxis
                  dataKey="year" stroke={B.textMuted} fontSize={12}
                  fontFamily={B.fontMono}
                  tickFormatter={(v: number) => `${v}a`}
                />
                <YAxis
                  stroke={B.textMuted} fontSize={11}
                  fontFamily={B.fontMono}
                  tickFormatter={(v: number) => {
                    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
                    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
                    return `$${v}`
                  }}
                  width={65}
                />
                <Tooltip
                  contentStyle={{
                    background: B.bg, border: `1px solid ${B.border}`,
                    borderRadius: '12px', fontSize: '0.82rem', color: B.ink,
                    boxShadow: B.shadowMd, fontFamily: B.fontMono,
                  }}
                  labelFormatter={(v) => `Anio ${v}`}
                  formatter={(value, name) => {
                    const inst = instrumentos.find(i => i.key === String(name))
                    return [formatMXN(Number(value)), inst?.label ?? String(name)]
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '0.78rem', fontFamily: B.fontBody, color: B.textSoft }}
                  formatter={(value: string) => {
                    const inst = instrumentos.find(i => i.key === value)
                    return inst?.label ?? value
                  }}
                />
                {instrumentos.filter(i => i.visible).map(inst => (
                  <Line
                    key={inst.key} type="monotone" dataKey={inst.key}
                    stroke={inst.color} strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0, fill: inst.color }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{
              height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: B.textMuted, fontFamily: B.fontBody, fontSize: '0.88rem',
            }}>
              Cargando grafica...
            </div>
          )}
        </div>
      </div>

      {/* ── Results table ───────────────────────────────── */}
      <div style={{
        background: B.bg, border: `1px solid ${B.border}`,
        borderRadius: '16px', padding: '1.5rem',
        marginBottom: '1.5rem', boxShadow: B.shadow,
      }}>
        <h3 style={s.sectionTitle}>Comparativa detallada</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' as const }} role="table">
            <thead>
              <tr>
                <th style={s.th}>Instrumento</th>
                <th style={{ ...s.th, textAlign: 'right' as const }}>Tasa</th>
                <th style={{ ...s.th, textAlign: 'right' as const }}>Valor bruto</th>
                {descontarISR && <th style={{ ...s.th, textAlign: 'right' as const }}>ISR</th>}
                <th style={{ ...s.th, textAlign: 'right' as const }}>Valor {descontarISR ? 'neto' : 'final'}</th>
                <th style={{ ...s.th, textAlign: 'right' as const }}>Ganancia</th>
                <th style={{ ...s.th, textAlign: 'center' as const }}>Riesgo</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((r, i) => (
                <tr key={r.key} className="result-row" style={{ borderBottom: `1px solid ${B.borderLight}` }}>
                  <td style={s.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '4px', background: r.color }} />
                      <span style={{
                        fontFamily: B.fontDisplay, fontWeight: i === 0 ? '700' : '500',
                        color: i === 0 ? B.ink : B.textSoft, fontSize: '0.88rem',
                      }}>
                        {r.label}
                      </span>
                      {i === 0 && <IconStar size={12} color={B.mint} strokeWidth={2.5} />}
                    </div>
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' as const, fontFamily: B.fontMono, fontWeight: '600' }}>
                    {formatPct(r.tasa)}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' as const, fontFamily: B.fontMono }}>
                    {formatMXN(r.bruto)}
                  </td>
                  {descontarISR && (
                    <td style={{ ...s.td, textAlign: 'right' as const, fontFamily: B.fontMono, color: '#EF4444' }}>
                      -{formatMXN(r.isr)}
                    </td>
                  )}
                  <td style={{ ...s.td, textAlign: 'right' as const, fontFamily: B.fontMono, fontWeight: '700', color: B.ink }}>
                    {formatMXN(r.neto)}
                  </td>
                  <td style={{
                    ...s.td, textAlign: 'right' as const, fontFamily: B.fontMono, fontWeight: '600',
                    color: r.ganancia >= 0 ? B.mint : '#EF4444',
                  }}>
                    {r.ganancia >= 0 ? '+' : ''}{formatMXN(r.ganancia)}
                  </td>
                  <td style={{ ...s.td, textAlign: 'center' as const }}>
                    <span style={{
                      fontFamily: B.fontMono, fontSize: '0.65rem', fontWeight: '700',
                      color: riesgoColor(r.riesgo),
                      background: riesgoBg(r.riesgo),
                      padding: '0.2rem 0.5rem', borderRadius: '5px',
                    }}>
                      {r.riesgoLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Risk notes + disclaimer ─────────────────────── */}
      <div style={{
        background: B.bgOff, border: `1px solid ${B.border}`,
        borderRadius: '16px', padding: '1.5rem',
      }}>
        <h3 style={{ ...s.sectionTitle, marginBottom: '0.75rem' }}>Notas de riesgo</h3>
        {instrumentos.map(inst => (
          <div key={inst.key} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '3px', background: inst.color, flexShrink: 0, marginTop: '0.3rem' }} />
            <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.6 }}>
              <span style={{ fontFamily: B.fontDisplay, fontWeight: '600', color: B.ink }}>{inst.label}</span>
              <span style={{ color: B.textSoft }}> &mdash; {inst.riesgoNota}</span>
            </p>
          </div>
        ))}

        <div style={{
          marginTop: '1.25rem', padding: '1rem',
          background: B.bg, borderRadius: '10px', border: `1px solid ${B.border}`,
        }}>
          <p style={{
            margin: 0, color: B.textMuted, fontSize: '0.72rem',
            lineHeight: 1.7, fontFamily: B.fontBody,
          }}>
            <strong style={{ color: B.textSoft }}>Disclaimer:</strong> Este simulador es una herramienta ilustrativa.
            Los rendimientos pasados no garantizan resultados futuros.
            Las tasas de CETES se obtienen del SIE de Banxico.
            El ISR sobre intereses usa la tasa de retencion provisional del art. 21 LIF 2026 (0.90% anual sobre capital).
            S&amp;P 500 considera rendimiento promedio historico nominal en USD
            {ajustarFX ? `, ajustado por depreciacion del peso de ${formatPct(deprecAnual)} anual` : ' sin ajuste por tipo de cambio'}.
            Consulta a un asesor financiero antes de invertir.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── Styles ─────────────────────────────────────────────────── */

const s: Record<string, React.CSSProperties> = {
  controlGroup: {
    background: B.bg,
    border: `1px solid ${B.border}`,
    borderRadius: '14px',
    padding: '1.25rem',
    boxShadow: B.shadow,
  },
  label: {
    color: B.textSoft,
    fontSize: '0.82rem',
    fontWeight: '500',
    fontFamily: B.fontBody,
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
    left: '0.85rem',
    color: B.textMuted,
    fontSize: '1rem',
    fontWeight: '600',
    fontFamily: B.fontMono,
    pointerEvents: 'none' as const,
  },
  input: {
    width: '100%',
    background: B.bgOff,
    border: `1.5px solid ${B.border}`,
    borderRadius: '10px',
    padding: '0.7rem 0.85rem 0.7rem 2rem',
    color: B.ink,
    fontSize: '1.1rem',
    fontFamily: B.fontMono,
    fontWeight: '700',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    color: B.textMuted,
    fontSize: '0.68rem',
    fontFamily: B.fontMono,
    marginTop: '0.35rem',
  },
  sectionTitle: {
    fontFamily: B.fontMono,
    color: B.textMuted,
    fontSize: '0.72rem',
    fontWeight: '600',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    margin: '0 0 1rem',
  },
  th: {
    fontFamily: B.fontMono,
    color: B.textMuted,
    fontSize: '0.68rem',
    fontWeight: '600',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    padding: '0.6rem 0.75rem',
    borderBottom: `2px solid ${B.border}`,
    textAlign: 'left' as const,
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '0.85rem 0.75rem',
    color: B.textSoft,
    fontSize: '0.85rem',
    whiteSpace: 'nowrap' as const,
  },
}
