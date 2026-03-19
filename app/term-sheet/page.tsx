'use client'

import { useState, useCallback, useRef } from 'react'
import { cl } from '@/lib/design'

type AmortizationType = 'bullet' | 'mensual' | 'trimestral' | 'personalizado'
type Currency = 'MXN' | 'UDIs' | 'USD'
type RateType = 'fija' | 'variable'
type PersonType = 'moral' | 'fisica'

interface FormData {
  razonSocial: string; rfc: string; tipoPersona: PersonType; representanteLegal: string
  monto: string; montoRaw: string; moneda: Currency; tipoAmortizacion: AmortizationType
  plazoMeses: string; fechaDisposicion: string; tipoTasa: RateType
  tasaAnual: string; referenciaVariable: string; spreadPuntos: string
  underwritingFee: string; comisionApertura: string; ivaAplicable: boolean
}

const INITIAL: FormData = {
  razonSocial: '', rfc: '', tipoPersona: 'moral', representanteLegal: '',
  monto: '', montoRaw: '', moneda: 'MXN', tipoAmortizacion: 'mensual',
  plazoMeses: '', fechaDisposicion: new Date().toISOString().split('T')[0],
  tipoTasa: 'fija', tasaAnual: '', referenciaVariable: 'TIIE28',
  spreadPuntos: '', underwritingFee: '', comisionApertura: '', ivaAplicable: true,
}

const STEPS = [
  { label: 'Acreditado', desc: 'Datos del solicitante' },
  { label: 'Condiciones', desc: 'Monto, plazo y tipo de amortizacion' },
  { label: 'Pricing', desc: 'Tasas, comisiones y fees' },
  { label: 'Resumen', desc: 'Revisa y descarga el term sheet' },
]

const ACCENT = '#7C3AED'
const ACCENT_LIGHT = '#F5F3FF'
const PLAZO_OPTS = [6, 12, 18, 24, 30, 36, 48]

function fmt(n: number) { return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function addMonths(d: Date, m: number) { const r = new Date(d); r.setMonth(r.getMonth() + m); return r }
function fmtDate(d: Date) { return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) }

function buildSchedule(data: FormData) {
  const monto = parseFloat(data.montoRaw || data.monto) || 0
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
  return (
    <div style={{ minHeight: '300px' }}>
      <Field label="Razon Social / Nombre"><input style={inputStyle} value={data.razonSocial} placeholder="Empresa S.A. de C.V." onChange={e => onChange('razonSocial', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <Field label="RFC"><input style={{ ...inputStyle, fontFamily: 'monospace', textTransform: 'uppercase' }} value={data.rfc} placeholder="AAA000101AAA" onChange={e => onChange('rfc', e.target.value.toUpperCase())} /></Field>
        <Field label="Tipo de Persona"><select style={inputStyle} value={data.tipoPersona} onChange={e => onChange('tipoPersona', e.target.value)}><option value="moral">Persona Moral</option><option value="fisica">Persona Fisica</option></select></Field>
      </div>
      <Field label="Representante Legal"><input style={inputStyle} value={data.representanteLegal} placeholder="Nombre completo del representante legal" onChange={e => onChange('representanteLegal', e.target.value)} /></Field>
    </div>
  )
}

function StepCondiciones({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string) => void }) {
  const [montoDisplay, setMontoDisplay] = useState(data.monto)
  const opts: { val: AmortizationType; label: string; desc: string }[] = [
    { val: 'bullet', label: 'Bullet', desc: 'Pago unico al vencimiento' },
    { val: 'mensual', label: 'Mensual', desc: 'Pagos fijos cada mes' },
    { val: 'trimestral', label: 'Trimestral', desc: 'Cada trimestre' },
    { val: 'personalizado', label: 'Personalizado', desc: 'Flujo a definir' },
  ]
  return (
    <div style={{ minHeight: '300px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <Field label="Monto del Credito">
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280', fontSize: '0.875rem', fontWeight: 600 }}>$</span>
            <input style={{ ...inputStyle, fontFamily: 'monospace', paddingLeft: '26px' }} value={montoDisplay} placeholder="1,000,000.00"
              onChange={e => { const raw = e.target.value.replace(/[^0-9.]/g, ''); setMontoDisplay(e.target.value); onChange('montoRaw', raw); onChange('monto', raw) }}
              onBlur={() => { const n = parseFloat(data.montoRaw || data.monto); if (!isNaN(n) && n > 0) setMontoDisplay(n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) }}
              onFocus={() => setMontoDisplay(data.montoRaw || data.monto)}
            />
          </div>
        </Field>
        <Field label="Moneda">
          <select style={inputStyle} value={data.moneda} onChange={e => onChange('moneda', e.target.value)}>
            <option value="MXN">MXN - Pesos Mexicanos</option><option value="UDIs">UDIs</option><option value="USD">USD - Dolares</option>
          </select>
        </Field>
      </div>
      <Field label="Tipo de Amortizacion">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {opts.map(o => (<button key={o.val} onClick={() => onChange('tipoAmortizacion', o.val)} style={{ border: `1.5px solid ${data.tipoAmortizacion === o.val ? ACCENT : '#E5E7EB'}`, borderRadius: '10px', padding: '12px 14px', background: data.tipoAmortizacion === o.val ? ACCENT_LIGHT : '#FFFFFF', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: data.tipoAmortizacion === o.val ? ACCENT : '#111827' }}>{o.label}</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>{o.desc}</div>
          </button>))}
        </div>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <Field label="Plazo">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {PLAZO_OPTS.map(p => (<button key={p} onClick={() => onChange('plazoMeses', String(p))} style={{ padding: '7px 12px', borderRadius: '8px', border: `1.5px solid ${data.plazoMeses === String(p) ? ACCENT : '#E5E7EB'}`, background: data.plazoMeses === String(p) ? ACCENT_LIGHT : '#FFFFFF', color: data.plazoMeses === String(p) ? ACCENT : '#374151', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s' }}>{p}m</button>))}
          </div>
        </Field>
        <Field label="Fecha de Disposicion"><input style={inputStyle} value={data.fechaDisposicion} type="date" onChange={e => onChange('fechaDisposicion', e.target.value)} /></Field>
      </div>
    </div>
  )
}

function StepPricing({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string | boolean) => void }) {
  return (
    <div style={{ minHeight: '300px' }}>
      <Field label="Tipo de Tasa">
        <div style={{ display: 'flex', gap: '10px' }}>
          {(['fija', 'variable'] as RateType[]).map(t => (<button key={t} onClick={() => onChange('tipoTasa', t)} style={{ flex: 1, border: `1.5px solid ${data.tipoTasa === t ? ACCENT : '#E5E7EB'}`, borderRadius: '10px', padding: '10px', background: data.tipoTasa === t ? ACCENT_LIGHT : '#FFFFFF', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: data.tipoTasa === t ? ACCENT : '#4B5563', transition: 'all 0.15s' }}>{t === 'fija' ? 'Tasa Fija' : 'Tasa Variable'}</button>))}
        </div>
      </Field>
      {data.tipoTasa === 'fija'
        ? <Field label="Tasa Anual (%)"><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={data.tasaAnual} type="number" step="0.25" placeholder="18.00" onChange={e => onChange('tasaAnual', e.target.value)} /></Field>
        : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Referencia"><select style={inputStyle} value={data.referenciaVariable} onChange={e => onChange('referenciaVariable', e.target.value)}><option value="TIIE28">TIIE 28 dias</option><option value="TIIE91">TIIE 91 dias</option><option value="SOFR">SOFR</option></select></Field>
            <Field label="Spread (puntos base)"><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={data.spreadPuntos} type="number" placeholder="500" onChange={e => onChange('spreadPuntos', e.target.value)} /></Field>
          </div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <Field label="Underwriting Fee (%)"><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={data.underwritingFee} type="number" step="0.25" placeholder="2.00" onChange={e => onChange('underwritingFee', e.target.value)} /></Field>
        <Field label="Comision de Apertura (%)"><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={data.comisionApertura} type="number" step="0.25" placeholder="1.00" onChange={e => onChange('comisionApertura', e.target.value)} /></Field>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F9FAFB', borderRadius: '10px', padding: '14px 16px', border: '1px solid #E5E7EB' }}>
        <div><div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>IVA sobre intereses</div><div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>Aplica 16% IVA sobre intereses y comisiones</div></div>
        <button onClick={() => onChange('ivaAplicable', !data.ivaAplicable)} style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative', background: data.ivaAplicable ? ACCENT : '#D1D5DB', transition: 'background 0.2s', flexShrink: 0 }}>
          <span style={{ position: 'absolute', top: '3px', left: data.ivaAplicable ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#FFFFFF', transition: 'left 0.2s' }} />
        </button>
      </div>
    </div>
  )
}

function StepResumen({ data, schedule }: { data: FormData; schedule: ReturnType<typeof buildSchedule> }) {
  const monto = parseFloat(data.montoRaw || data.monto) || 0
  const uw = (parseFloat(data.underwritingFee) / 100) || 0
  const totalInt = schedule.reduce((s, r) => s + r.interes, 0)
  const totalAmort = schedule.reduce((s, r) => s + r.amortizacion, 0)
  const totalComis = schedule.reduce((s, r) => s + r.comisiones, 0)
  const totalPago = schedule.reduce((s, r) => s + r.total, 0)
  const tasaLabel = data.tipoTasa === 'fija' ? `${data.tasaAnual}% anual fija` : `${data.referenciaVariable} + ${data.spreadPuntos} pb`
  return (<>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
      {[['Acreditado', data.razonSocial || '—'], ['RFC', data.rfc || '—'], ['Monto', `${data.moneda} $${fmt(monto)}`], ['Plazo', `${data.plazoMeses} meses`], ['Tasa', tasaLabel], ['Amortizacion', data.tipoAmortizacion]].map(([l, v]) => (
        <div key={l} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '0.7rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{l}</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', marginTop: '4px', textTransform: 'capitalize', wordBreak: 'break-all' }}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
      {[['Total intereses', `$${fmt(totalInt)}`], ['Total amort.', `$${fmt(totalAmort)}`], ['Total comisiones', `$${fmt(totalComis + uw * monto)}`], ['Total a pagar', `$${fmt(totalPago)}`]].map(([l, v]) => (
        <div key={l} style={{ background: ACCENT_LIGHT, border: '1px solid #DDD6FE', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.65rem', color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{l}</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: ACCENT, marginTop: '3px', fontFamily: 'monospace' }}>{v}</div>
        </div>
      ))}
    </div>
    {schedule.length > 0 && (<>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Tabla de amortizacion</div>
      <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: '10px', maxHeight: '200px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', minWidth: '600px' }}>
          <thead style={{ position: 'sticky', top: 0 }}>
            <tr style={{ background: '#7C3AED' }}>
              {['#', 'Fecha', 'Saldo Ini.', 'Interes', 'Amort.', 'Comis.', 'Total', 'Saldo Fin.'].map(h => (<th key={h} style={{ padding: '8px 10px', textAlign: h === '#' || h === 'Fecha' ? 'left' : 'right', color: '#FFFFFF', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>))}
            </tr>
          </thead>
          <tbody>
            {schedule.map((r, i) => (<tr key={i} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 ? '#F9FAFB' : '#FFFFFF' }}>
              <td style={{ padding: '5px 10px', color: '#9CA3AF' }}>{r.periodo}</td>
              <td style={{ padding: '5px 10px', color: '#4B5563', fontFamily: 'monospace' }}>{r.fecha}</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#374151' }}>{fmt(r.saldoInicial)}</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#374151' }}>{fmt(r.interes)}</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#374151' }}>{fmt(r.amortizacion)}</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', color: r.comisiones > 0 ? '#B45309' : '#9CA3AF' }}>{r.comisiones > 0 ? fmt(r.comisiones) : '-'}</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#111827' }}>{fmt(r.total)}</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#4B5563' }}>{fmt(r.saldoFinal)}</td>
            </tr>))}
          </tbody>
          <tfoot><tr style={{ background: ACCENT_LIGHT, borderTop: `2px solid ${ACCENT}` }}>
            <td colSpan={4} style={{ padding: '7px 10px', fontSize: '0.72rem', fontWeight: 700, color: ACCENT }}>TOTALES</td>
            <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, color: ACCENT }}>{fmt(totalAmort)}</td>
            <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, color: ACCENT }}>{fmt(totalComis)}</td>
            <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, color: ACCENT }}>{fmt(totalPago)}</td>
            <td style={{ padding: '7px 10px', textAlign: 'right', color: ACCENT }}>-</td>
          </tr></tfoot>
        </table>
      </div>
    </>)}
  </>)
}

function EmailModal({ onClose, onSend }: { onClose: () => void; onSend: (email: string, msg: string) => void }) {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('Adjunto encontraras el term sheet de la propuesta de credito para tu revision.')
  const [sending, setSending] = useState(false)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '28px', width: '440px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Enviar por email</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: '1.2rem' }}>X</button>
        </div>
        <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Destinatario</label><input style={inputStyle} type="email" placeholder="cliente@empresa.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div style={{ marginBottom: '20px' }}><label style={labelStyle}>Mensaje</label><textarea style={{ ...inputStyle, height: '100px', resize: 'vertical' } as React.CSSProperties} value={msg} onChange={e => setMsg(e.target.value)} /></div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 18px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF', color: '#4B5563', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>Cancelar</button>
          <button onClick={async () => { if (!email) return alert('Ingresa un email'); setSending(true); await new Promise(r => setTimeout(r, 800)); setSending(false); onSend(email, msg) }} style={{ padding: '10px 20px', border: 'none', borderRadius: '10px', background: ACCENT, color: '#FFFFFF', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' }}>{sending ? 'Enviando...' : 'Enviar'}</button>
        </div>
      </div>
    </div>
  )
}

function PreviewModal({ data, schedule, onClose }: { data: FormData; schedule: ReturnType<typeof buildSchedule>; onClose: () => void }) {
  const monto = parseFloat(data.montoRaw || data.monto) || 0
  const uw = (parseFloat(data.underwritingFee) / 100) || 0
  const totalInt = schedule.reduce((s, r) => s + r.interes, 0)
  const totalAmort = schedule.reduce((s, r) => s + r.amortizacion, 0)
  const totalComis = schedule.reduce((s, r) => s + r.comisiones, 0)
  const totalPago = schedule.reduce((s, r) => s + r.total, 0)
  const tasaLabel = data.tipoTasa === 'fija' ? `${data.tasaAnual}% anual fija` : `${data.referenciaVariable} + ${data.spreadPuntos} pb`
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '16px', width: '800px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>Vista previa del Term Sheet</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: '1.2rem' }}>X</button>
        </div>
        <div style={{ padding: '40px 48px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '2px solid #7C3AED', marginBottom: '24px' }}>
            <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '30px' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: ACCENT }}>TERM SHEET - PROPUESTA DE CREDITO</div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>Fecha de emision: {new Date().toLocaleDateString('es-MX')}</div>
            </div>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Resumen Ejecutivo</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden', marginBottom: '14px' }}>
            {[['Acreditado', data.razonSocial || '-'], ['RFC', data.rfc || '-'], ['Tipo de Persona', data.tipoPersona === 'moral' ? 'Persona Moral' : 'Persona Fisica'], ['Rep. Legal', data.representanteLegal || '-'], ['Monto del Credito', `${data.moneda} $${fmt(monto)}`], ['Plazo', `${data.plazoMeses} meses`], ['Fecha de Disposicion', data.fechaDisposicion || '-'], ['Tipo de Amortizacion', data.tipoAmortizacion], ['Tasa', tasaLabel], ['IVA sobre intereses', data.ivaAplicable ? 'Si (16%)' : 'No'], ['Underwriting Fee', `${data.underwritingFee || 0}% ($${fmt(uw * monto)})`], ['Comision de Apertura', `${data.comisionApertura || 0}%`]].map(([l, v], i) => (
              <div key={i} style={{ display: 'flex', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ width: '40%', padding: '6px 10px', background: '#F9FAFB', fontSize: '9px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', borderRight: '1px solid #E5E7EB' }}>{l}</div>
                <div style={{ padding: '6px 10px', fontSize: '10px', color: '#111827' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
            {[['Total Intereses', `$${fmt(totalInt)}`], ['Total Amortizacion', `$${fmt(totalAmort)}`], ['Total Comisiones', `$${fmt(totalComis)}`], ['Total a Pagar', `$${fmt(totalPago)}`]].map(([l, v]) => (
              <div key={l} style={{ background: ACCENT_LIGHT, border: '1px solid #DDD6FE', borderRadius: '6px', padding: '8px 10px' }}>
                <div style={{ fontSize: '8px', color: ACCENT, textTransform: 'uppercase', fontWeight: 700 }}>{l}</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: ACCENT, marginTop: '2px' }}>{v}</div>
              </div>
            ))}
          </div>
          {schedule.length > 0 && (<>
            <div style={{ fontSize: '10px', fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Tabla de Amortizacion</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
              <thead><tr style={{ background: ACCENT }}>{['#', 'Fecha', 'Saldo Ini.', 'Interes', 'Amort.', 'Comis.', 'Total', 'Saldo Fin.'].map(h => (<th key={h} style={{ padding: '6px 8px', color: '#FFFFFF', textAlign: h === '#' || h === 'Fecha' ? 'left' : 'right', fontWeight: 600 }}>{h}</th>))}</tr></thead>
              <tbody>{schedule.map((r, i) => (<tr key={i} style={{ background: i % 2 ? '#FAFAFA' : '#FFFFFF', borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '4px 8px', color: '#9CA3AF' }}>{r.periodo}</td>
                <td style={{ padding: '4px 8px' }}>{r.fecha}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmt(r.saldoInicial)}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmt(r.interes)}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmt(r.amortizacion)}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right', color: r.comisiones > 0 ? '#B45309' : '#9CA3AF' }}>{r.comisiones > 0 ? fmt(r.comisiones) : '-'}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700 }}>{fmt(r.total)}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmt(r.saldoFinal)}</td>
              </tr>))}</tbody>
              <tfoot><tr style={{ background: ACCENT_LIGHT, borderTop: `2px solid ${ACCENT}` }}>
                <td colSpan={4} style={{ padding: '5px 8px', fontWeight: 700, color: ACCENT, fontSize: '9px' }}>TOTALES</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: ACCENT }}>{fmt(totalAmort)}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: ACCENT }}>{fmt(totalComis)}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: ACCENT }}>{fmt(totalPago)}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: ACCENT }}>-</td>
              </tr></tfoot>
            </table>
          </>)}
          <div style={{ marginTop: '24px', paddingTop: '12px', borderTop: '1px solid #E5E7EB', fontSize: '8px', color: '#9CA3AF' }}>PorCuanto S.A. de C.V. - IFC - CNBV - Art. 47 CUITF - LFPDPPP - Documento confidencial, no constituye oferta vinculante.</div>
        </div>
      </div>
    </div>
  )
}

export default function TermSheetPage() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<FormData>(INITIAL)
  const [generating, setGenerating] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const onChange = useCallback((k: keyof FormData, v: string | boolean) => { setData(prev => ({ ...prev, [k]: v })) }, [])
  const schedule = buildSchedule(data)

  const handleGenerate = async (format: 'pdf' | 'docx') => {
    setGenerating(true)
    try {
      const res = await fetch('/api/term-sheet/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { ...data, monto: data.montoRaw || data.monto }, format }) })
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'term-sheet-' + (data.razonSocial || 'credito').replace(/\s+/g, '-') + '-' + Date.now() + '.' + format
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { alert('Error: ' + (e instanceof Error ? e.message : String(e))) }
    finally { setGenerating(false) }
  }

  const btnBase: React.CSSProperties = { padding: '10px 16px', fontSize: '0.82rem', fontWeight: 700, border: 'none', borderRadius: '10px', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F9FAFB', fontFamily: cl.fontFamily, overflow: 'hidden' }}>
      {showEmail && <EmailModal onClose={() => setShowEmail(false)} onSend={(email) => { setShowEmail(false); alert(`Term sheet enviado a ${email} (integracion pendiente con SendGrid/Resend)`) }} />}
      {showPreview && <PreviewModal data={data} schedule={schedule} onClose={() => setShowPreview(false)} />}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '0 2rem', height: '60px', display: 'flex', alignItems: 'center' }}>
        <a href="/gate" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '22px', width: 'auto' }} />
          <div style={{ width: '1px', height: '18px', background: '#E5E7EB' }} />
          <span style={{ color: '#9CA3AF', fontSize: '0.82rem', fontWeight: 500 }}>Compliance Hub</span>
        </a>
      </div>
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '1.2rem 2rem 1rem' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ACCENT }} />
            <span style={{ color: ACCENT, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em' }}>TERM SHEET GENERATOR</span>
          </div>
          <h1 style={{ color: '#111827', fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.4rem', letterSpacing: '-0.02em' }}>Nueva propuesta de credito</h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', margin: 0 }}>Completa los datos para generar el term sheet en PDF o Word.</p>
        </div>
      </div>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 2rem', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          {STEPS.map((s, i) => (<div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div onClick={() => i < step && setStep(i)} style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, cursor: i < step ? 'pointer' : 'default', background: i < step ? '#059669' : i === step ? ACCENT : '#E5E7EB', color: i <= step ? '#FFFFFF' : '#9CA3AF', boxShadow: i === step ? `0 0 0 4px ${ACCENT_LIGHT}` : 'none', transition: 'all 0.2s' }}>{i < step ? 'v' : i + 1}</div>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, marginTop: '5px', color: i === step ? ACCENT : '#9CA3AF', whiteSpace: 'nowrap' }}>{s.label}</div>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: '1px', margin: '0 8px', marginBottom: '18px', background: i < step ? '#059669' : '#E5E7EB', transition: 'background 0.3s' }} />}
          </div>))}
        </div>
        <div style={{ background: '#FFFFFF', border: '1.5px solid #E5E7EB', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>{STEPS[step].label}</div>
            <div style={{ fontSize: '0.82rem', color: '#6B7280', marginTop: '2px' }}>{STEPS[step].desc}</div>
          </div>
          <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>
            {step === 0 && <StepAcreditado data={data} onChange={onChange as (k: keyof FormData, v: string) => void} />}
            {step === 1 && <StepCondiciones data={data} onChange={onChange as (k: keyof FormData, v: string) => void} />}
            {step === 2 && <StepPricing data={data} onChange={onChange} />}
            {step === 3 && <StepResumen data={data} schedule={schedule} />}
          </div>
          <div style={{ padding: '16px 28px', borderTop: '1px solid #F3F4F6', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} style={{ padding: '10px 20px', fontSize: '0.875rem', fontWeight: 600, border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF', color: '#4B5563', cursor: step === 0 ? 'not-allowed' : 'pointer', opacity: step === 0 ? 0.4 : 1 }}>Anterior</button>
            {step < STEPS.length - 1
              ? <button onClick={() => setStep(s => s + 1)} style={{ padding: '10px 28px', fontSize: '0.875rem', fontWeight: 700, border: 'none', borderRadius: '10px', background: ACCENT, color: '#FFFFFF', cursor: 'pointer' }}>Siguiente</button>
              : <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => setShowPreview(true)} style={{ ...btnBase, background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}>Vista previa</button>
                  <button onClick={() => setShowEmail(true)} style={{ ...btnBase, background: '#F5F3FF', color: ACCENT, border: `1px solid #DDD6FE` }}>Enviar</button>
                  <button onClick={() => handleGenerate('pdf')} disabled={generating} style={{ ...btnBase, background: '#059669', color: '#FFFFFF' }}>PDF</button>
                  <button onClick={() => handleGenerate('docx')} disabled={generating} style={{ ...btnBase, background: '#1D4ED8', color: '#FFFFFF' }}>Word</button>
                </div>}
          </div>
        </div>
        <p style={{ color: '#D1D5DB', fontSize: '0.75rem', textAlign: 'center', marginTop: '2rem' }}>PorCuanto S.A. de C.V.</p>
      </div>
    </div>
  )
}
