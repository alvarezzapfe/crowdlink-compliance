'use client'

import { useState, useCallback } from 'react'
import { cl } from '@/lib/design'

type AmortizationType = 'bullet' | 'mensual' | 'trimestral' | 'personalizado'
type Currency = 'MXN' | 'UDIs' | 'USD'
type RateType = 'fija' | 'variable'
type PersonType = 'moral' | 'fisica'

interface FormData {
  razonSocial: string; rfc: string; tipoPersona: PersonType; representanteLegal: string
  monto: string; moneda: Currency; tipoAmortizacion: AmortizationType
  plazoMeses: string; fechaDisposicion: string; tipoTasa: RateType
  tasaAnual: string; referenciaVariable: string; spreadPuntos: string
  underwritingFee: string; comisionApertura: string; ivaAplicable: boolean
}

const INITIAL: FormData = {
  razonSocial: '', rfc: '', tipoPersona: 'moral', representanteLegal: '',
  monto: '', moneda: 'MXN', tipoAmortizacion: 'mensual',
  plazoMeses: '', fechaDisposicion: new Date().toISOString().split('T')[0],
  tipoTasa: 'fija', tasaAnual: '', referenciaVariable: 'TIIE28',
  spreadPuntos: '', underwritingFee: '', comisionApertura: '', ivaAplicable: true,
}

const STEPS = [
  { label: 'Acreditado', desc: 'Datos del solicitante' },
  { label: 'Condiciones', desc: 'Monto, plazo y tipo de amortización' },
  { label: 'Pricing', desc: 'Tasas, comisiones y fees' },
  { label: 'Resumen', desc: 'Revisa y descarga el term sheet' },
]

const ACCENT = '#7C3AED'
const ACCENT_LIGHT = '#F5F3FF'

function fmt(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function addMonths(d: Date, m: number) { const r = new Date(d); r.setMonth(r.getMonth() + m); return r }
function fmtDate(d: Date) { return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) }

function buildSchedule(data: FormData) {
  const monto = parseFloat(data.monto) || 0
  const plazo = parseInt(data.plazoMeses) || 0
  const tasaAnual = data.tipoTasa === 'fija' ? (parseFloat(data.tasaAnual) / 100 || 0) : (parseFloat(data.spreadPuntos) || 0) / 10000
  const comAp = (parseFloat(data.comisionApertura) / 100) || 0
  const iva = data.ivaAplicable ? 1.16 : 1
  const inicio = data.fechaDisposicion ? new Date(data.fechaDisposicion + 'T12:00:00') : new Date()
  if (!monto || !plazo) return []
  const rows: { periodo: number; fecha: string; saldoInicial: number; interes: number; amortizacion: number; comisiones: number; total: number; saldoFinal: number }[] = []
  if (data.tipoAmortizacion === 'bullet') {
    const tm = tasaAnual / 12
    for (let i = 1; i <= plazo; i++) {
      const interes = monto * tm * iva; const amort = i === plazo ? monto : 0; const comis = i === 1 ? comAp * monto : 0
      rows.push({ periodo: i, fecha: fmtDate(addMonths(inicio, i)), saldoInicial: monto, interes, amortizacion: amort, comisiones: comis, total: interes + amort + comis, saldoFinal: i === plazo ? 0 : monto })
    }
  } else if (data.tipoAmortizacion === 'mensual') {
    const tm = tasaAnual / 12; const pago = tm ? monto * tm / (1 - Math.pow(1 + tm, -plazo)) : monto / plazo; let saldo = monto
    for (let i = 1; i <= plazo; i++) {
      const interes = saldo * tm * iva; const amort = pago - saldo * tm; const sf = Math.max(0, saldo - amort); const comis = i === 1 ? comAp * monto : 0
      rows.push({ periodo: i, fecha: fmtDate(addMonths(inicio, i)), saldoInicial: saldo, interes, amortizacion: amort, comisiones: comis, total: pago * iva + comis, saldoFinal: sf }); saldo = sf
    }
  } else if (data.tipoAmortizacion === 'trimestral') {
    const periodos = Math.ceil(plazo / 3); const tt = tasaAnual / 4; const pago = tt ? monto * tt / (1 - Math.pow(1 + tt, -periodos)) : monto / periodos; let saldo = monto
    for (let i = 1; i <= periodos; i++) {
      const interes = saldo * tt * iva; const amort = pago - saldo * tt; const sf = Math.max(0, saldo - amort); const comis = i === 1 ? comAp * monto : 0
      rows.push({ periodo: i, fecha: fmtDate(addMonths(inicio, i * 3)), saldoInicial: saldo, interes, amortizacion: amort, comisiones: comis, total: pago * iva + comis, saldoFinal: sf }); saldo = sf
    }
  }
  return rows
}

const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '10px 14px', fontSize: '0.875rem', color: '#111827', background: '#FFFFFF', outline: 'none', boxSizing: 'border-box' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: '16px' }}><label style={labelStyle}>{label}</label>{children}</div>
}

function StepAcreditado({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string) => void }) {
  return (<>
    <Field label="Razón Social / Nombre"><input style={inputStyle} value={data.razonSocial} placeholder="Empresa S.A. de C.V." onChange={e => onChange('razonSocial', e.target.value)} /></Field>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
      <Field label="RFC"><input style={{ ...inputStyle, fontFamily: 'monospace', textTransform: 'uppercase' }} value={data.rfc} placeholder="AAA000101AAA" onChange={e => onChange('rfc', e.target.value.toUpperCase())} /></Field>
      <Field label="Tipo de Persona"><select style={inputStyle} value={data.tipoPersona} onChange={e => onChange('tipoPersona', e.target.value)}><option value="moral">Persona Moral</option><option value="fisica">Persona Física</option></select></Field>
    </div>
    <Field label="Representante Legal"><input style={inputStyle} value={data.representanteLegal} placeholder="Nombre completo" onChange={e => onChange('representanteLegal', e.target.value)} /></Field>
  </>)
}

function StepCondiciones({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string) => void }) {
  const opts: { val: AmortizationType; label: string; desc: string }[] = [{ val: 'bullet', label: 'Bullet', desc: 'Pago único al vencimiento' }, { val: 'mensual', label: 'Mensual', desc: 'Pagos fijos cada mes' }, { val: 'trimestral', label: 'Trimestral', desc: 'Pagos fijos cada trimestre' }, { val: 'personalizado', label: 'Personalizado', desc: 'Flujo a definir' }]
  return (<>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
      <Field label="Monto del Crédito"><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={data.monto} type="number" placeholder="1000000" onChange={e => onChange('monto', e.target.value)} /></Field>
      <Field label="Moneda"><select style={inputStyle} value={data.moneda} onChange={e => onChange('moneda', e.target.value)}><option value="MXN">MXN – Pesos Mexicanos</option><option value="UDIs">UDIs</option><option value="USD">USD – Dólares</option></select></Field>
    </div>
    <Field label="Tipo de Amortización">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {opts.map(o => (<button key={o.val} onClick={() => onChange('tipoAmortizacion', o.val)} style={{ border: `1.5px solid ${data.tipoAmortizacion === o.val ? ACCENT : '#E5E7EB'}`, borderRadius: '10px', padding: '12px 14px', background: data.tipoAmortizacion === o.val ? ACCENT_LIGHT : '#FFFFFF', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: data.tipoAmortizacion === o.val ? ACCENT : '#111827' }}>{o.label}</div>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>{o.desc}</div>
        </button>))}
      </div>
    </Field>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
      <Field label="Plazo (meses)"><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={data.plazoMeses} type="number" placeholder="24" onChange={e => onChange('plazoMeses', e.target.value)} /></Field>
      <Field label="Fecha de Disposición"><input style={inputStyle} value={data.fechaDisposicion} type="date" onChange={e => onChange('fechaDisposicion', e.target.value)} /></Field>
    </div>
  </>)
}

function StepPricing({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string | boolean) => void }) {
  return (<>
    <Field label="Tipo de Tasa">
      <div style={{ display: 'flex', gap: '10px' }}>
        {(['fija', 'variable'] as RateType[]).map(t => (<button key={t} onClick={() => onChange('tipoTasa', t)} style={{ flex: 1, border: `1.5px solid ${data.tipoTasa === t ? ACCENT : '#E5E7EB'}`, borderRadius: '10px', padding: '10px', background: data.tipoTasa === t ? ACCENT_LIGHT : '#FFFFFF', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: data.tipoTasa === t ? ACCENT : '#4B5563' }}>{t === 'fija' ? 'Tasa Fija' : 'Tasa Variable'}</button>))}
      </div>
    </Field>
    {data.tipoTasa === 'fija'
      ? <Field label="Tasa Anual (%)"><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={data.tasaAnual} type="number" step="0.25" placeholder="18.00" onChange={e => onChange('tasaAnual', e.target.value)} /></Field>
      : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <Field label="Referencia"><select style={inputStyle} value={data.referenciaVariable} onChange={e => onChange('referenciaVariable', e.target.value)}><option value="TIIE28">TIIE 28 días</option><option value="TIIE91">TIIE 91 días</option><option value="SOFR">SOFR</option></select></Field>
          <Field label="Spread (puntos base)"><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={data.spreadPuntos} type="number" placeholder="500" onChange={e => onChange('spreadPuntos', e.target.value)} /></Field>
        </div>}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
      <Field label="Underwriting Fee (%)"><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={data.underwritingFee} type="number" step="0.25" placeholder="2.00" onChange={e => onChange('underwritingFee', e.target.value)} /></Field>
      <Field label="Comisión de Apertura (%)"><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={data.comisionApertura} type="number" step="0.25" placeholder="1.00" onChange={e => onChange('comisionApertura', e.target.value)} /></Field>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F9FAFB', borderRadius: '10px', padding: '14px 16px', border: '1px solid #E5E7EB' }}>
      <div><div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>IVA sobre intereses</div><div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>Aplica 16% IVA sobre intereses y comisiones</div></div>
      <button onClick={() => onChange('ivaAplicable', !data.ivaAplicable)} style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative', background: data.ivaAplicable ? ACCENT : '#D1D5DB', transition: 'background 0.2s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: '3px', left: data.ivaAplicable ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#FFFFFF', transition: 'left 0.2s' }} />
      </button>
    </div>
  </>)
}

function StepResumen({ data, schedule }: { data: FormData; schedule: ReturnType<typeof buildSchedule> }) {
  const monto = parseFloat(data.monto) || 0
  const uw = (parseFloat(data.underwritingFee) / 100) || 0
  const totalInt = schedule.reduce((s, r) => s + r.interes, 0)
  const totalAmort = schedule.reduce((s, r) => s + r.amortizacion, 0)
  const totalComis = schedule.reduce((s, r) => s + r.comisiones, 0)
  const totalPago = schedule.reduce((s, r) => s + r.total, 0)
  const tasaLabel = data.tipoTasa === 'fija' ? `${data.tasaAnual}% anual fija` : `${data.referenciaVariable} + ${data.spreadPuntos} pb`
  const metrics = [['Monto', `${data.moneda} $${fmt(monto)}`], ['Plazo', `${data.plazoMeses} meses`], ['Tasa', tasaLabel], ['Amortización', data.tipoAmortizacion], ['Total intereses', `$${fmt(totalInt)}`], ['Total comisiones', `$${fmt(totalComis + uw * monto)}`]]
  return (<>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
      {metrics.map(([l, v]) => (<div key={l} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '12px 14px' }}>
        <div style={{ fontSize: '0.7rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{l}</div>
        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', marginTop: '4px', textTransform: 'capitalize' }}>{v}</div>
      </div>))}
    </div>
    {schedule.length > 0 && (<>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Tabla de amortización</div>
      <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: '10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: '620px' }}>
          <thead><tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            {['#', 'Fecha', 'Saldo Ini.', 'Interés', 'Amort.', 'Comis.', 'Total', 'Saldo Fin.'].map(h => (<th key={h} style={{ padding: '8px 10px', textAlign: h === '#' || h === 'Fecha' ? 'left' : 'right', color: '#6B7280', fontWeight: 600 }}>{h}</th>))}
          </tr></thead>
          <tbody>
            {schedule.map((r, i) => (<tr key={i} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 ? '#F9FAFB' : '#FFFFFF' }}>
              <td style={{ padding: '6px 10px', color: '#9CA3AF' }}>{r.periodo}</td>
              <td style={{ padding: '6px 10px', color: '#4B5563', fontFamily: 'monospace' }}>{r.fecha}</td>
              <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#374151' }}>{fmt(r.saldoInicial)}</td>
              <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#374151' }}>{fmt(r.interes)}</td>
              <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#374151' }}>{fmt(r.amortizacion)}</td>
              <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: r.comisiones > 0 ? '#B45309' : '#9CA3AF' }}>{r.comisiones > 0 ? fmt(r.comisiones) : '—'}</td>
              <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#111827' }}>{fmt(r.total)}</td>
              <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#4B5563' }}>{fmt(r.saldoFinal)}</td>
            </tr>))}
          </tbody>
          <tfoot><tr style={{ background: ACCENT_LIGHT, borderTop: `2px solid ${ACCENT}` }}>
            <td colSpan={4} style={{ padding: '8px 10px', fontSize: '0.75rem', fontWeight: 700, color: ACCENT }}>TOTALES</td>
            <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700, color: ACCENT }}>{fmt(totalAmort)}</td>
            <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700, color: ACCENT }}>{fmt(totalComis)}</td>
            <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700, color: ACCENT }}>{fmt(totalPago)}</td>
            <td style={{ padding: '8px 10px', textAlign: 'right', color: ACCENT }}>—</td>
          </tr></tfoot>
        </table>
      </div>
    </>)}
  </>)
}

export default function TermSheetPage() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<FormData>(INITIAL)
  const [generating, setGenerating] = useState(false)
  const onChange = useCallback((k: keyof FormData, v: string | boolean) => { setData(prev => ({ ...prev, [k]: v })) }, [])
  const schedule = buildSchedule(data)
  const handleGenerate = async () => { setGenerating(true); await new Promise(r => setTimeout(r, 1200)); setGenerating(false); alert('Próximamente: integración PDF vía /api/term-sheet/generate') }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: cl.fontFamily }}>
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '0 2rem', height: '60px', display: 'flex', alignItems: 'center' }}>
        <a href="/gate" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '22px', width: 'auto' }} />
          <div style={{ width: '1px', height: '18px', background: '#E5E7EB' }} />
          <span style={{ color: '#9CA3AF', fontSize: '0.82rem', fontWeight: 500 }}>Compliance Hub</span>
        </a>
      </div>
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '2.5rem 2rem 2rem' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ACCENT }} />
            <span style={{ color: ACCENT, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em' }}>TERM SHEET GENERATOR</span>
          </div>
          <h1 style={{ color: '#111827', fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.4rem', letterSpacing: '-0.02em' }}>Nueva propuesta de crédito</h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', margin: 0 }}>Completa los datos para generar el term sheet en PDF.</p>
        </div>
      </div>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px' }}>
          {STEPS.map((s, i) => (<div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div onClick={() => i < step && setStep(i)} style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, cursor: i < step ? 'pointer' : 'default', background: i < step ? '#059669' : i === step ? ACCENT : '#E5E7EB', color: i <= step ? '#FFFFFF' : '#9CA3AF', boxShadow: i === step ? `0 0 0 4px ${ACCENT_LIGHT}` : 'none' }}>
                {i < step ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, marginTop: '5px', color: i === step ? ACCENT : '#9CA3AF', whiteSpace: 'nowrap' }}>{s.label}</div>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: '1px', margin: '0 8px', marginBottom: '18px', background: i < step ? '#059669' : '#E5E7EB' }} />}
          </div>))}
        </div>
        <div style={{ background: '#FFFFFF', border: '1.5px solid #E5E7EB', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #F3F4F6' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>{STEPS[step].label}</div>
            <div style={{ fontSize: '0.82rem', color: '#6B7280', marginTop: '2px' }}>{STEPS[step].desc}</div>
          </div>
          {step === 0 && <StepAcreditado data={data} onChange={onChange as (k: keyof FormData, v: string) => void} />}
          {step === 1 && <StepCondiciones data={data} onChange={onChange as (k: keyof FormData, v: string) => void} />}
          {step === 2 && <StepPricing data={data} onChange={onChange} />}
          {step === 3 && <StepResumen data={data} schedule={schedule} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #F3F4F6' }}>
            <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} style={{ padding: '10px 20px', fontSize: '0.875rem', fontWeight: 600, border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF', color: '#4B5563', cursor: step === 0 ? 'not-allowed' : 'pointer', opacity: step === 0 ? 0.4 : 1 }}>← Anterior</button>
            {step < STEPS.length - 1
              ? <button onClick={() => setStep(s => s + 1)} style={{ padding: '10px 24px', fontSize: '0.875rem', fontWeight: 700, border: 'none', borderRadius: '10px', background: ACCENT, color: '#FFFFFF', cursor: 'pointer' }}>Siguiente →</button>
              : <button onClick={handleGenerate} disabled={generating} style={{ padding: '10px 24px', fontSize: '0.875rem', fontWeight: 700, border: 'none', borderRadius: '10px', background: '#059669', color: '#FFFFFF', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.7 : 1 }}>{generating ? 'Generando...' : '↓ Descargar Term Sheet PDF'}</button>}
          </div>
        </div>
        <p style={{ color: '#D1D5DB', fontSize: '0.75rem', textAlign: 'center', marginTop: '2rem' }}>PorCuanto S.A. de C.V.</p>
      </div>
    </div>
  )
}
