import { NextRequest, NextResponse } from 'next/server'
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, BorderStyle,
  ShadingType, ImageRun,
} from 'docx'
import fs from 'fs'
import path from 'path'

function fmt(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function addMonths(d: Date, m: number) { const r = new Date(d); r.setMonth(r.getMonth() + m); return r }
function fmtDate(d: Date) { return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) }

function buildSchedule(data: any) {
  const monto = parseFloat(data.monto) || 0
  const plazo = parseInt(data.plazoMeses) || 0
  const tasaAnual = data.tipoTasa === 'fija' ? (parseFloat(data.tasaAnual) / 100 || 0) : (parseFloat(data.spreadPuntos) || 0) / 10000
  const comAp = (parseFloat(data.comisionApertura) / 100) || 0
  const iva = data.ivaAplicable ? 1.16 : 1
  const inicio = data.fechaDisposicion ? new Date(data.fechaDisposicion + 'T12:00:00') : new Date()
  if (!monto || !plazo) return []
  const rows: any[] = []
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

async function generateDocx(data: any, schedule: any[]) {
  const monto = parseFloat(data.monto) || 0
  const uw = (parseFloat(data.underwritingFee) / 100) || 0
  const totalInt = schedule.reduce((s: number, r: any) => s + r.interes, 0)
  const totalAmort = schedule.reduce((s: number, r: any) => s + r.amortizacion, 0)
  const totalComis = schedule.reduce((s: number, r: any) => s + r.comisiones, 0)
  const totalPago = schedule.reduce((s: number, r: any) => s + r.total, 0)
  const tasaLabel = data.tipoTasa === 'fija' ? `${data.tasaAnual}% anual fija` : `${data.referenciaVariable} + ${data.spreadPuntos} pb`
  const logoPath = path.join(process.cwd(), 'public', 'crowdlink-logo.png')
  const logoBuffer = fs.readFileSync(logoPath)
  const PURPLE = '7C3AED'; const GRAY = '6B7280'; const LIGHT = 'F5F3FF'

  const hdrCell = (text: string) => new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, color: 'FFFFFF', font: 'Calibri' })], alignment: AlignmentType.CENTER })],
    shading: { type: ShadingType.SOLID, color: PURPLE, fill: PURPLE },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
  })
  const dataCell = (text: string, right = false, bold = false, color = '374151') => new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, size: 17, bold, color, font: 'Calibri' })], alignment: right ? AlignmentType.RIGHT : AlignmentType.LEFT })],
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  })
  const totCell = (text: string, right = false) => new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 17, color: PURPLE, font: 'Calibri' })], alignment: right ? AlignmentType.RIGHT : AlignmentType.LEFT })],
    shading: { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
  })

  const summaryItems = [
    ['Acreditado', data.razonSocial || '—'], ['RFC', data.rfc || '—'],
    ['Representante Legal', data.representanteLegal || '—'],
    ['Tipo de Persona', data.tipoPersona === 'moral' ? 'Persona Moral' : 'Persona Física'],
    ['Monto del Crédito', `${data.moneda} $${fmt(monto)}`], ['Plazo', `${data.plazoMeses} meses`],
    ['Fecha de Disposición', data.fechaDisposicion || '—'], ['Tipo de Amortización', data.tipoAmortizacion],
    ['Tasa', tasaLabel], ['IVA sobre intereses', data.ivaAplicable ? 'Sí (16%)' : 'No'],
    ['Underwriting Fee', `${data.underwritingFee || 0}% ($${fmt(uw * monto)})`],
    ['Comisión de Apertura', `${data.comisionApertura || 0}%`],
    ['Total Intereses', `$${fmt(totalInt)}`], ['Total Amortización', `$${fmt(totalAmort)}`],
    ['Total Comisiones', `$${fmt(totalComis)}`], ['Total a Pagar', `$${fmt(totalPago)}`],
  ]

  const summaryRows = summaryItems.map(([label, value]) => new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 17, color: GRAY, font: 'Calibri' })] })], width: { size: 35, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: 'F9FAFB', fill: 'F9FAFB' }, margins: { top: 80, bottom: 80, left: 120, right: 80 } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: value, size: 17, font: 'Calibri', color: '111827' })] })], width: { size: 65, type: WidthType.PERCENTAGE }, margins: { top: 80, bottom: 80, left: 120, right: 80 } }),
    ],
  }))

  const borders = { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' }, insideH: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' }, insideV: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' } }

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
      children: [
        new Paragraph({ children: [new ImageRun({ data: logoBuffer, transformation: { width: 140, height: 35 }, type: 'png' })], spacing: { after: 200 } }),
        new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PURPLE } }, spacing: { after: 300 }, children: [] }),
        new Paragraph({ children: [new TextRun({ text: 'TERM SHEET — PROPUESTA DE CRÉDITO', bold: true, size: 28, color: PURPLE, font: 'Calibri' })], spacing: { after: 80 } }),
        new Paragraph({ children: [new TextRun({ text: `Fecha de emisión: ${new Date().toLocaleDateString('es-MX')}`, size: 18, color: GRAY, font: 'Calibri' })], spacing: { after: 400 } }),
        new Paragraph({ children: [new TextRun({ text: 'RESUMEN EJECUTIVO', bold: true, size: 20, color: PURPLE, font: 'Calibri' })], spacing: { after: 160 } }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: summaryRows, borders }),
        new Paragraph({ children: [], spacing: { after: 400 } }),
        new Paragraph({ children: [new TextRun({ text: 'TABLA DE AMORTIZACIÓN', bold: true, size: 20, color: PURPLE, font: 'Calibri' })], spacing: { after: 160 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE }, borders,
          rows: [
            new TableRow({ tableHeader: true, children: ['#', 'Fecha', 'Saldo Ini.', 'Interés', 'Amort.', 'Comis.', 'Total', 'Saldo Fin.'].map(hdrCell) }),
            ...schedule.map((r: any) => new TableRow({ children: [dataCell(String(r.periodo)), dataCell(r.fecha), dataCell(fmt(r.saldoInicial), true), dataCell(fmt(r.interes), true), dataCell(fmt(r.amortizacion), true), dataCell(r.comisiones > 0 ? fmt(r.comisiones) : '—', true, false, r.comisiones > 0 ? 'B45309' : '9CA3AF'), dataCell(fmt(r.total), true, true), dataCell(fmt(r.saldoFinal), true)] })),
            new TableRow({ children: [totCell('TOTALES'), totCell(''), totCell(''), totCell(fmt(totalInt), true), totCell(fmt(totalAmort), true), totCell(fmt(totalComis), true), totCell(fmt(totalPago), true), totCell('—', true)] }),
          ],
        }),
        new Paragraph({ children: [], spacing: { after: 400 } }),
        new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' } }, children: [new TextRun({ text: 'PorCuanto S.A. de C.V. · IFC · CNBV · Art. 47 CUITF · LFPDPPP · Documento confidencial, no constituye oferta vinculante.', size: 14, color: '9CA3AF', font: 'Calibri' })], spacing: { before: 200 } }),
      ],
    }],
  })
  return Packer.toBuffer(doc)
}

async function generatePdf(data: any, schedule: any[]) {
  const monto = parseFloat(data.monto) || 0
  const uw = (parseFloat(data.underwritingFee) / 100) || 0
  const totalInt = schedule.reduce((s: number, r: any) => s + r.interes, 0)
  const totalAmort = schedule.reduce((s: number, r: any) => s + r.amortizacion, 0)
  const totalComis = schedule.reduce((s: number, r: any) => s + r.comisiones, 0)
  const totalPago = schedule.reduce((s: number, r: any) => s + r.total, 0)
  const tasaLabel = data.tipoTasa === 'fija' ? `${data.tasaAnual}% anual fija` : `${data.referenciaVariable} + ${data.spreadPuntos} pb`
  const summaryItems = [
    ['Acreditado', data.razonSocial || '—'], ['RFC', data.rfc || '—'],
    ['Representante Legal', data.representanteLegal || '—'],
    ['Tipo de Persona', data.tipoPersona === 'moral' ? 'Persona Moral' : 'Persona Física'],
    ['Monto del Crédito', `${data.moneda} $${fmt(monto)}`], ['Plazo', `${data.plazoMeses} meses`],
    ['Fecha de Disposición', data.fechaDisposicion || '—'], ['Tipo de Amortización', data.tipoAmortizacion],
    ['Tasa', tasaLabel], ['IVA sobre intereses', data.ivaAplicable ? 'Sí (16%)' : 'No'],
    ['Underwriting Fee', `${data.underwritingFee || 0}% ($${fmt(uw * monto)})`],
    ['Comisión de Apertura', `${data.comisionApertura || 0}%`],
  ]
  const logoPath = path.join(process.cwd(), 'public', 'crowdlink-logo.png')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#111827;background:#fff;padding:40px 48px}
  .header{display:flex;align-items:center;justify-content:space-between;padding-bottom:16px;border-bottom:2px solid #7C3AED;margin-bottom:24px}
  .header img{height:28px}.header-right{text-align:right}.header-right .title{font-size:15px;font-weight:700;color:#7C3AED;letter-spacing:.05em}
  .header-right .date{font-size:10px;color:#6B7280;margin-top:3px}
  .section-title{font-size:11px;font-weight:700;color:#7C3AED;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;margin-top:24px}
  .summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden}
  .summary-item{display:flex;border-bottom:1px solid #E5E7EB}.summary-item:nth-last-child(-n+2){border-bottom:none}
  .summary-label{width:42%;padding:7px 12px;background:#F9FAFB;font-weight:600;color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:.04em;border-right:1px solid #E5E7EB}
  .summary-value{padding:7px 12px;color:#111827;font-size:11px}
  .totals-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px}
  .total-box{background:#F5F3FF;border:1px solid #DDD6FE;border-radius:8px;padding:10px 12px}
  .total-label{font-size:9px;color:#7C3AED;text-transform:uppercase;font-weight:700;letter-spacing:.06em}
  .total-value{font-size:13px;font-weight:700;color:#7C3AED;margin-top:3px}
  table{width:100%;border-collapse:collapse;font-size:10px;margin-top:10px}
  th{background:#7C3AED;color:#fff;padding:7px 8px;text-align:right;font-weight:600;font-size:10px}
  th:first-child,th:nth-child(2){text-align:left}
  td{padding:5px 8px;text-align:right;border-bottom:1px solid #F3F4F6;color:#374151}
  td:first-child,td:nth-child(2){text-align:left;color:#6B7280}
  tr:nth-child(even) td{background:#FAFAFA}.comis-val{color:#B45309}
  .total-row td{background:#F5F3FF!important;font-weight:700;color:#7C3AED;border-top:2px solid #7C3AED}
  .footer{margin-top:28px;padding-top:12px;border-top:1px solid #E5E7EB;font-size:9px;color:#9CA3AF}
  </style></head><body>
  <div class="header">
    <img src="file://${logoPath}" />
    <div class="header-right"><div class="title">TERM SHEET — PROPUESTA DE CRÉDITO</div><div class="date">Fecha de emisión: ${new Date().toLocaleDateString('es-MX')}</div></div>
  </div>
  <div class="section-title">Resumen Ejecutivo</div>
  <div class="summary-grid">${summaryItems.map(([l, v]) => `<div class="summary-item"><div class="summary-label">${l}</div><div class="summary-value">${v}</div></div>`).join('')}</div>
  <div class="totals-row">
    <div class="total-box"><div class="total-label">Total Intereses</div><div class="total-value">$${fmt(totalInt)}</div></div>
    <div class="total-box"><div class="total-label">Total Amortización</div><div class="total-value">$${fmt(totalAmort)}</div></div>
    <div class="total-box"><div class="total-label">Total Comisiones</div><div class="total-value">$${fmt(totalComis)}</div></div>
    <div class="total-box"><div class="total-label">Total a Pagar</div><div class="total-value">$${fmt(totalPago)}</div></div>
  </div>
  <div class="section-title">Tabla de Amortización</div>
  <table><thead><tr><th>#</th><th>Fecha</th><th>Saldo Ini.</th><th>Interés</th><th>Amort.</th><th>Comis.</th><th>Total</th><th>Saldo Fin.</th></tr></thead>
  <tbody>
    ${schedule.map(r => `<tr><td>${r.periodo}</td><td>${r.fecha}</td><td>${fmt(r.saldoInicial)}</td><td>${fmt(r.interes)}</td><td>${fmt(r.amortizacion)}</td><td class="${r.comisiones > 0 ? 'comis-val' : ''}">${r.comisiones > 0 ? fmt(r.comisiones) : '—'}</td><td><strong>${fmt(r.total)}</strong></td><td>${fmt(r.saldoFinal)}</td></tr>`).join('')}
    <tr class="total-row"><td colspan="3">TOTALES</td><td>${fmt(totalInt)}</td><td>${fmt(totalAmort)}</td><td>${fmt(totalComis)}</td><td>${fmt(totalPago)}</td><td>—</td></tr>
  </tbody></table>
  <div class="footer">PorCuanto S.A. de C.V. · IFC · CNBV · Art. 47 CUITF · LFPDPPP · Documento confidencial, no constituye oferta vinculante.</div>
  </body></html>`

  const chromium = await import('@sparticuz/chromium')
  const puppeteer = await import('puppeteer-core')
  const browser = await puppeteer.default.launch({
    args: chromium.default.args,
    defaultViewport: chromium.default.defaultViewport,
    executablePath: await chromium.default.executablePath(),
    headless: true,
  })
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  const pdf = await page.pdf({ format: 'Letter', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } })
  await browser.close()
  return pdf
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { data, format } = body
    if (!data) return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    const schedule = buildSchedule(data)
    if (format === 'docx') {
      const buffer = await generateDocx(data, schedule)
      const filename = `term-sheet-${(data.razonSocial || 'credito').replace(/\s+/g, '-')}-${Date.now()}.docx`
      return new NextResponse(buffer, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${filename}"` } })
    }
    if (format === 'pdf') {
      const buffer = await generatePdf(data, schedule)
      const filename = `term-sheet-${(data.razonSocial || 'credito').replace(/\s+/g, '-')}-${Date.now()}.pdf`
      return new NextResponse(buffer, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"` } })
    }
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (err: any) {
    console.error('Term sheet error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
