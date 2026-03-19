'use client'

import { useState, useCallback } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type AmortizationType = 'bullet' | 'mensual' | 'trimestral' | 'personalizado'
type Currency = 'MXN' | 'UDIs' | 'USD'
type RateType = 'fija' | 'variable'
type PersonType = 'moral' | 'fisica'

interface FormData {
  // Paso 1 – Acreditado
  razonSocial: string
  rfc: string
  tipoPersona: PersonType
  representanteLegal: string
  // Paso 2 – Condiciones
  monto: string
  moneda: Currency
  tipoAmortizacion: AmortizationType
  plazoMeses: string
  fechaDisposicion: string
  // Paso 3 – Pricing
  tipoTasa: RateType
  tasaAnual: string
  referenciaVariable: string
  spreadPuntos: string
  underwritingFee: string
  comisionApertura: string
  ivaAplicable: boolean
}

interface PeriodRow {
  periodo: number
  fecha: string
  saldoInicial: number
  interes: number
  amortizacion: number
  comisiones: number
  total: number
  saldoFinal: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMXN(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function buildSchedule(data: FormData): PeriodRow[] {
  const monto = parseFloat(data.monto.replace(/,/g, '')) || 0
  const plazo = parseInt(data.plazoMeses) || 0
  const tasaAnual = parseFloat(data.tasaAnual) / 100 || 0
  const comisionApertura = parseFloat(data.comisionApertura) / 100 || 0
  const ivaFactor = data.ivaAplicable ? 1.16 : 1
  const inicio = data.fechaDisposicion ? new Date(data.fechaDisposicion + 'T12:00:00') : new Date()

  if (!monto || !plazo) return []

  const rows: PeriodRow[] = []

  if (data.tipoAmortizacion === 'bullet') {
    const tasaMensual = tasaAnual / 12
    const comisionPeriodo = comisionApertura * monto
    for (let i = 1; i <= plazo; i++) {
      const interes = monto * tasaMensual * ivaFactor
      const amort = i === plazo ? monto : 0
      rows.push({
        periodo: i,
        fecha: formatDate(addMonths(inicio, i)),
        saldoInicial: monto,
        interes,
        amortizacion: amort,
        comisiones: i === 1 ? comisionPeriodo : 0,
        total: interes + amort + (i === 1 ? comisionPeriodo : 0),
        saldoFinal: i === plazo ? 0 : monto,
      })
    }
  } else if (data.tipoAmortizacion === 'mensual') {
    const tasaMensual = tasaAnual / 12
    const pago = monto * tasaMensual / (1 - Math.pow(1 + tasaMensual, -plazo))
    let saldo = monto
    for (let i = 1; i <= plazo; i++) {
      const interes = saldo * tasaMensual * ivaFactor
      const amort = pago - saldo * tasaMensual
      const saldoFinal = Math.max(0, saldo - amort)
      rows.push({
        periodo: i,
        fecha: formatDate(addMonths(inicio, i)),
        saldoInicial: saldo,
        interes,
        amortizacion: amort,
        comisiones: i === 1 ? comisionApertura * monto : 0,
        total: pago * ivaFactor + (i === 1 ? comisionApertura * monto : 0),
        saldoFinal,
      })
      saldo = saldoFinal
    }
  } else if (data.tipoAmortizacion === 'trimestral') {
    const periodosTotal = Math.ceil(plazo / 3)
    const tasaTrimestral = tasaAnual / 4
    const pago = monto * tasaTrimestral / (1 - Math.pow(1 + tasaTrimestral, -periodosTotal))
    let saldo = monto
    for (let i = 1; i <= periodosTotal; i++) {
      const interes = saldo * tasaTrimestral * ivaFactor
      const amort = pago - saldo * tasaTrimestral
      const saldoFinal = Math.max(0, saldo - amort)
      rows.push({
        periodo: i,
        fecha: formatDate(addMonths(inicio, i * 3)),
        saldoInicial: saldo,
        interes,
        amortizacion: amort,
        comisiones: i === 1 ? comisionApertura * monto : 0,
        total: pago * ivaFactor + (i === 1 ? comisionApertura * monto : 0),
        saldoFinal,
      })
      saldo = saldoFinal
    }
  }

  return rows
}

// ─── Step Components ─────────────────────────────────────────────────────────

function StepAcreditado({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Razón Social / Nombre</label>
        <input
          value={data.razonSocial}
          onChange={e => onChange('razonSocial', e.target.value)}
          placeholder="Empresa S.A. de C.V."
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">RFC</label>
          <input
            value={data.rfc}
            onChange={e => onChange('rfc', e.target.value.toUpperCase())}
            placeholder="AAA000101AAA"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tipo de Persona</label>
          <select
            value={data.tipoPersona}
            onChange={e => onChange('tipoPersona', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="moral">Persona Moral</option>
            <option value="fisica">Persona Física</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Representante Legal</label>
        <input
          value={data.representanteLegal}
          onChange={e => onChange('representanteLegal', e.target.value)}
          placeholder="Nombre completo del representante"
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}

function StepCondiciones({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Monto del Crédito</label>
          <input
            value={data.monto}
            onChange={e => onChange('monto', e.target.value)}
            placeholder="1,000,000"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Moneda</label>
          <select
            value={data.moneda}
            onChange={e => onChange('moneda', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="MXN">MXN – Pesos Mexicanos</option>
            <option value="UDIs">UDIs</option>
            <option value="USD">USD – Dólares</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tipo de Amortización</label>
        <div className="grid grid-cols-2 gap-3">
          {([
            ['bullet', 'Bullet', 'Pago único al vencimiento'],
            ['mensual', 'Mensual', 'Pagos fijos cada mes'],
            ['trimestral', 'Trimestral', 'Pagos fijos cada trimestre'],
            ['personalizado', 'Personalizado', 'Flujo a definir'],
          ] as [AmortizationType, string, string][]).map(([val, label, desc]) => (
            <button
              key={val}
              onClick={() => onChange('tipoAmortizacion', val)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                data.tipoAmortizacion === val
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-sm text-gray-800">{label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Plazo (meses)</label>
          <input
            value={data.plazoMeses}
            onChange={e => onChange('plazoMeses', e.target.value)}
            placeholder="24"
            type="number"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Fecha de Disposición</label>
          <input
            value={data.fechaDisposicion}
            onChange={e => onChange('fechaDisposicion', e.target.value)}
            type="date"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  )
}

function StepPricing({ data, onChange, onToggleIva }: {
  data: FormData
  onChange: (k: keyof FormData, v: string) => void
  onToggleIva: () => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tipo de Tasa</label>
        <div className="flex gap-3">
          {(['fija', 'variable'] as RateType[]).map(t => (
            <button
              key={t}
              onClick={() => onChange('tipoTasa', t)}
              className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold capitalize transition-all ${
                data.tipoTasa === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
              }`}
            >
              {t === 'fija' ? 'Tasa Fija' : 'Tasa Variable'}
            </button>
          ))}
        </div>
      </div>

      {data.tipoTasa === 'fija' ? (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tasa Anual (%)</label>
          <input
            value={data.tasaAnual}
            onChange={e => onChange('tasaAnual', e.target.value)}
            placeholder="18.00"
            type="number"
            step="0.25"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Referencia</label>
            <select
              value={data.referenciaVariable}
              onChange={e => onChange('referenciaVariable', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="TIIE28">TIIE 28 días</option>
              <option value="TIIE91">TIIE 91 días</option>
              <option value="SOFR">SOFR</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Spread (puntos base)</label>
            <input
              value={data.spreadPuntos}
              onChange={e => onChange('spreadPuntos', e.target.value)}
              placeholder="500"
              type="number"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Underwriting Fee (%)</label>
          <input
            value={data.underwritingFee}
            onChange={e => onChange('underwritingFee', e.target.value)}
            placeholder="2.00"
            type="number"
            step="0.25"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Comisión de Apertura (%)</label>
          <input
            value={data.comisionApertura}
            onChange={e => onChange('comisionApertura', e.target.value)}
            placeholder="1.00"
            type="number"
            step="0.25"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <div className="text-sm font-semibold text-gray-700">IVA sobre intereses</div>
          <div className="text-xs text-gray-500 mt-0.5">Aplica 16% IVA sobre intereses y comisiones</div>
        </div>
        <button
          onClick={onToggleIva}
          className={`relative w-11 h-6 rounded-full transition-colors ${data.ivaAplicable ? 'bg-blue-500' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${data.ivaAplicable ? 'translate-x-5' : ''}`} />
        </button>
      </div>
    </div>
  )
}

function StepReview({ data, schedule }: { data: FormData; schedule: PeriodRow[] }) {
  const monto = parseFloat(data.monto.replace(/,/g, '')) || 0
  const uwFee = parseFloat(data.underwritingFee) / 100 || 0
  const totalIntereses = schedule.reduce((s, r) => s + r.interes, 0)
  const totalComisiones = schedule.reduce((s, r) => s + r.comisiones, 0) + uwFee * monto
  const tasaLabel = data.tipoTasa === 'fija'
    ? `${data.tasaAnual}% anual fija`
    : `${data.referenciaVariable} + ${data.spreadPuntos} pb`

  return (
    <div className="space-y-6">
      {/* Resumen ejecutivo */}
      <div className="grid grid-cols-3 gap-3">
        {[
          ['Monto', `${data.moneda} $${formatMXN(monto)}`],
          ['Plazo', `${data.plazoMeses} meses`],
          ['Tasa', tasaLabel],
          ['Amortización', data.tipoAmortizacion],
          ['Total Intereses', `$${formatMXN(totalIntereses)}`],
          ['Total Comisiones', `$${formatMXN(totalComisiones)}`],
        ].map(([label, value]) => (
          <div key={label} className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
            <div className="text-sm font-semibold text-gray-800 mt-0.5 capitalize">{value}</div>
          </div>
        ))}
      </div>

      {/* Tabla de amortización */}
      {schedule.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tabla de Amortización</div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['#', 'Fecha', 'Saldo Inicial', 'Interés', 'Amortización', 'Comisiones', 'Total', 'Saldo Final'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, i) => (
                  <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    <td className="px-3 py-2 text-gray-500">{row.periodo}</td>
                    <td className="px-3 py-2 text-gray-600 font-mono">{row.fecha}</td>
                    <td className="px-3 py-2 text-gray-700 font-mono">{formatMXN(row.saldoInicial)}</td>
                    <td className="px-3 py-2 text-gray-700 font-mono">{formatMXN(row.interes)}</td>
                    <td className="px-3 py-2 text-gray-700 font-mono">{formatMXN(row.amortizacion)}</td>
                    <td className="px-3 py-2 text-orange-600 font-mono">{row.comisiones > 0 ? formatMXN(row.comisiones) : '—'}</td>
                    <td className="px-3 py-2 font-semibold text-gray-800 font-mono">{formatMXN(row.total)}</td>
                    <td className="px-3 py-2 text-gray-700 font-mono">{formatMXN(row.saldoFinal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                  <td colSpan={4} className="px-3 py-2 text-xs text-blue-700">TOTALES</td>
                  <td className="px-3 py-2 text-xs font-mono text-blue-700">{formatMXN(schedule.reduce((s, r) => s + r.amortizacion, 0))}</td>
                  <td className="px-3 py-2 text-xs font-mono text-blue-700">{formatMXN(schedule.reduce((s, r) => s + r.comisiones, 0))}</td>
                  <td className="px-3 py-2 text-xs font-mono text-blue-700">{formatMXN(schedule.reduce((s, r) => s + r.total, 0))}</td>
                  <td className="px-3 py-2 text-xs font-mono text-blue-700">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Acreditado', desc: 'Datos del solicitante' },
  { label: 'Condiciones', desc: 'Monto, plazo y tipo' },
  { label: 'Pricing', desc: 'Tasas y comisiones' },
  { label: 'Resumen', desc: 'Revisión y descarga' },
]

const INITIAL: FormData = {
  razonSocial: '',
  rfc: '',
  tipoPersona: 'moral',
  representanteLegal: '',
  monto: '',
  moneda: 'MXN',
  tipoAmortizacion: 'mensual',
  plazoMeses: '',
  fechaDisposicion: new Date().toISOString().split('T')[0],
  tipoTasa: 'fija',
  tasaAnual: '',
  referenciaVariable: 'TIIE28',
  spreadPuntos: '',
  underwritingFee: '',
  comisionApertura: '',
  ivaAplicable: true,
}

export default function TermSheetGenerator() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<FormData>(INITIAL)
  const [generating, setGenerating] = useState(false)

  const onChange = useCallback((k: keyof FormData, v: string) => {
    setData(prev => ({ ...prev, [k]: v }))
  }, [])

  const onToggleIva = useCallback(() => {
    setData(prev => ({ ...prev, ivaAplicable: !prev.ivaAplicable }))
  }, [])

  const schedule = buildSchedule(data)

  const handleGeneratePDF = async () => {
    setGenerating(true)
    // PDF generation would be handled server-side via API route
    // e.g. POST /api/term-sheet/generate with data + schedule
    await new Promise(r => setTimeout(r, 1500))
    setGenerating(false)
    alert('PDF generado. Integra /api/term-sheet/generate con ReportLab o Puppeteer.')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-blue-600 font-bold text-xl tracking-tight">crowdlink</span>
            <span className="text-gray-300 text-lg">|</span>
            <span className="text-gray-500 text-sm">Compliance Hub</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Page title */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs font-semibold text-green-600 uppercase tracking-widest">Term Sheet Generator</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Nueva Propuesta de Crédito</h1>
          <p className="text-gray-500 mt-1">Completa los datos para generar el term sheet en PDF.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <button
                onClick={() => i < step && setStep(i)}
                className="flex flex-col items-center flex-shrink-0"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i < step ? 'bg-green-500 text-white' :
                  i === step ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <div className={`text-xs font-semibold mt-1 ${i === step ? 'text-blue-600' : 'text-gray-400'}`}>
                  {s.label}
                </div>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-all ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">{STEPS[step].label}</h2>
            <p className="text-sm text-gray-500">{STEPS[step].desc}</p>
          </div>

          {step === 0 && <StepAcreditado data={data} onChange={onChange} />}
          {step === 1 && <StepCondiciones data={data} onChange={onChange} />}
          {step === 2 && <StepPricing data={data} onChange={onChange} onToggleIva={onToggleIva} />}
          {step === 3 && <StepReview data={data} schedule={schedule} />}

          {/* Actions */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              ← Anterior
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="px-6 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={handleGeneratePDF}
                disabled={generating}
                className="px-6 py-2.5 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-70"
              >
                {generating ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Generando PDF...
                  </>
                ) : (
                  '↓ Descargar Term Sheet PDF'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
