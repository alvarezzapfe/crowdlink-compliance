import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import {
  Document as PDFDocument, Page, Text, View, Image,
  StyleSheet, renderToBuffer,
} from '@react-pdf/renderer'
import {
  Document as DocxDocument, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, BorderStyle, ShadingType, ImageRun,
} from 'docx'
import fs from 'fs'
import path from 'path'

function fmt(n: number) { return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function addMonths(d: Date, m: number) { const r = new Date(d); r.setMonth(r.getMonth() + m); return r }
function fmtDate(d: Date) { return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) }

function buildSchedule(data: any) {
  const monto = parseFloat(data.monto) || 0; const plazo = parseInt(data.plazoMeses) || 0
  const tasaAnual = data.tipoTasa === 'fija' ? (parseFloat(data.tasaAnual) / 100 || 0) : (parseFloat(data.spreadPuntos) || 0) / 10000
  const comAp = (parseFloat(data.comisionApertura) / 100) || 0; const iva = data.ivaAplicable ? 1.16 : 1
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

const S = StyleSheet.create({
  page: { padding: 36, fontSize: 8, fontFamily: 'Helvetica', backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#7C3AED', paddingBottom: 10, marginBottom: 16 },
  logo: { width: 110, height: 28 },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#7C3AED' },
  headerDate: { fontSize: 7.5, color: '#6B7280', marginTop: 3 },
  sectionTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#7C3AED', textTransform: 'uppercase', marginBottom: 6, marginTop: 14 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 4 },
  summaryItem: { width: '50%', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  summaryLabel: { width: '42%', padding: '5 8', backgroundColor: '#F9FAFB', fontFamily: 'Helvetica-Bold', color: '#6B7280', fontSize: 7, textTransform: 'uppercase', borderRightWidth: 1, borderRightColor: '#E5E7EB' },
  summaryValue: { flex: 1, padding: '5 8', color: '#111827', fontSize: 7.5 },
  totalsRow: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 4 },
  totalBox: { flex: 1, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE', borderRadius: 4, padding: '7 8' },
  totalLabel: { fontSize: 6.5, color: '#7C3AED', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
  totalValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#7C3AED', marginTop: 2 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#7C3AED', borderRadius: 2 },
  tableHeaderCell: { padding: '5 4', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', flex: 1, textAlign: 'right' },
  tableHeaderCellL: { padding: '5 4', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', flex: 1, textAlign: 'left' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#FAFAFA' },
  tableCell: { padding: '4 4', fontSize: 7, color: '#374151', flex: 1, textAlign: 'right' },
  tableCellL: { padding: '4 4', fontSize: 7, color: '#6B7280', flex: 1, textAlign: 'left' },
  tableTotRow: { flexDirection: 'row', backgroundColor: '#F5F3FF', borderTopWidth: 2, borderTopColor: '#7C3AED' },
  tableTotCell: { padding: '5 4', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#7C3AED', flex: 1, textAlign: 'right' },
  tableTotCellL: { padding: '5 4', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#7C3AED', flex: 1, textAlign: 'left' },
  footer: { marginTop: 20, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB', fontSize: 6.5, color: '#9CA3AF' },
})

function TermSheetPDF({ data, schedule, logoPath }: { data: any; schedule: any[]; logoPath: string }) {
  const monto = parseFloat(data.monto) || 0; const uw = (parseFloat(data.underwritingFee) / 100) || 0
  const totalInt = schedule.reduce((s: number, r: any) => s + r.interes, 0)
  const totalAmort = schedule.reduce((s: number, r: any) => s + r.amortizacion, 0)
  const totalComis = schedule.reduce((s: number, r: any) => s + r.comisiones, 0)
  const totalPago = schedule.reduce((s: number, r: any) => s + r.total, 0)
  const tasaLabel = data.tipoTasa === 'fija' ? `${data.tasaAnual}% anual fija` : `${data.referenciaVariable} + ${data.spreadPuntos} pb`
  const summaryItems = [
    ['Acreditado', data.razonSocial || '—'], ['RFC', data.rfc || '—'],
    ['Tipo de Persona', data.tipoPersona === 'moral' ? 'Persona Moral' : 'Persona Fisica'],
    ['Rep. Legal', data.representanteLegal || '—'],
    ['Monto', `${data.moneda} $${fmt(monto)}`], ['Plazo', `${data.plazoMeses} meses`],
    ['Fecha Disposicion', data.fechaDisposicion || '—'], ['Amortizacion', data.tipoAmortizacion],
    ['Tasa', tasaLabel], ['IVA intereses', data.ivaAplicable ? 'Si (16%)' : 'No'],
    ['Underwriting Fee', `${data.underwritingFee || 0}% ($${fmt(uw * monto)})`],
    ['Comision Apertura', `${data.comisionApertura || 0}%`],
  ]
  const R = React.createElement
  return R(PDFDocument, null, R(Page, { size: 'LETTER', style: S.page },
    R(View, { style: S.header },
      R(Image, { style: S.logo, src: logoPath }),
      R(View, { style: S.headerRight },
        R(Text, { style: S.headerTitle }, 'TERM SHEET - PROPUESTA DE CREDITO'),
        R(Text, { style: S.headerDate }, `Fecha de emision: ${new Date().toLocaleDateString('es-MX')}`)
      )
    ),
    R(Text, { style: S.sectionTitle }, 'Resumen Ejecutivo'),
    R(View, { style: S.summaryGrid },
      ...summaryItems.map(([l, v], i) =>
        R(View, { key: String(i), style: [S.summaryItem, i >= summaryItems.length - 2 ? { borderBottomWidth: 0 } : {}] as any },
          R(Text, { style: S.summaryLabel }, l),
          R(Text, { style: S.summaryValue }, v)
        )
      )
    ),
    R(View, { style: S.totalsRow },
      ...[['Total Intereses', `$${fmt(totalInt)}`], ['Total Amortizacion', `$${fmt(totalAmort)}`], ['Total Comisiones', `$${fmt(totalComis)}`], ['Total a Pagar', `$${fmt(totalPago)}`]].map(([l, v], i) =>
        R(View, { key: String(i), style: S.totalBox }, R(Text, { style: S.totalLabel }, l), R(Text, { style: S.totalValue }, v))
      )
    ),
    R(Text, { style: S.sectionTitle }, 'Tabla de Amortizacion'),
    R(View, { style: S.tableHeader },
      R(Text, { style: [S.tableHeaderCellL, { flex: 0.4 }] as any }, '#'),
      R(Text, { style: [S.tableHeaderCellL, { flex: 1.2 }] as any }, 'Fecha'),
      R(Text, { style: S.tableHeaderCell }, 'Saldo Ini.'),
      R(Text, { style: S.tableHeaderCell }, 'Interes'),
      R(Text, { style: S.tableHeaderCell }, 'Amort.'),
      R(Text, { style: S.tableHeaderCell }, 'Comis.'),
      R(Text, { style: [S.tableHeaderCell, { fontFamily: 'Helvetica-Bold' }] as any }, 'Total'),
      R(Text, { style: S.tableHeaderCell }, 'Saldo Fin.'),
    ),
    ...schedule.map((r: any, i: number) =>
      R(View, { key: String(i), style: i % 2 === 0 ? S.tableRow : S.tableRowAlt },
        R(Text, { style: [S.tableCellL, { flex: 0.4 }] as any }, String(r.periodo)),
        R(Text, { style: [S.tableCellL, { flex: 1.2 }] as any }, r.fecha),
        R(Text, { style: S.tableCell }, fmt(r.saldoInicial)),
        R(Text, { style: S.tableCell }, fmt(r.interes)),
        R(Text, { style: S.tableCell }, fmt(r.amortizacion)),
        R(Text, { style: [S.tableCell, { color: r.comisiones > 0 ? '#B45309' : '#9CA3AF' }] as any }, r.comisiones > 0 ? fmt(r.comisiones) : '-'),
        R(Text, { style: [S.tableCell, { fontFamily: 'Helvetica-Bold' }] as any }, fmt(r.total)),
        R(Text, { style: S.tableCell }, fmt(r.saldoFinal)),
      )
    ),
    R(View, { style: S.tableTotRow },
      R(Text, { style: [S.tableTotCellL, { flex: 0.4 }] as any }, ''),
      R(Text, { style: [S.tableTotCellL, { flex: 1.2 }] as any }, 'TOTALES'),
      R(Text, { style: S.tableTotCell }, ''),
      R(Text, { style: S.tableTotCell }, fmt(totalInt)),
      R(Text, { style: S.tableTotCell }, fmt(totalAmort)),
      R(Text, { style: S.tableTotCell }, fmt(totalComis)),
      R(Text, { style: S.tableTotCell }, fmt(totalPago)),
      R(Text, { style: S.tableTotCell }, '-'),
    ),
    R(Text, { style: S.footer }, 'PorCuanto S.A. de C.V. - IFC - CNBV - Art. 47 CUITF - LFPDPPP - Documento confidencial, no constituye oferta vinculante.')
  ))
}

async function generateDocx(data: any, schedule: any[]) {
  const monto = parseFloat(data.monto) || 0; const uw = (parseFloat(data.underwritingFee) / 100) || 0
  const totalInt = schedule.reduce((s: number, r: any) => s + r.interes, 0)
  const totalAmort = schedule.reduce((s: number, r: any) => s + r.amortizacion, 0)
  const totalComis = schedule.reduce((s: number, r: any) => s + r.comisiones, 0)
  const totalPago = schedule.reduce((s: number, r: any) => s + r.total, 0)
  const tasaLabel = data.tipoTasa === 'fija' ? `${data.tasaAnual}% anual fija` : `${data.referenciaVariable} + ${data.spreadPuntos} pb`
  const logoBuffer = fs.readFileSync(path.join(process.cwd(), 'public', 'crowdlink-logo.png'))
  const PURPLE = '7C3AED'; const GRAY = '6B7280'; const LIGHT = 'F5F3FF'
  const hdrCell = (text: string) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, color: 'FFFFFF', font: 'Calibri' })], alignment: AlignmentType.CENTER })], shading: { type: ShadingType.SOLID, color: PURPLE, fill: PURPLE }, margins: { top: 80, bottom: 80, left: 100, right: 100 } })
  const dataCell = (text: string, right = false, bold = false, color = '374151') => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, size: 17, bold, color, font: 'Calibri' })], alignment: right ? AlignmentType.RIGHT : AlignmentType.LEFT })], margins: { top: 60, bottom: 60, left: 100, right: 100 } })
  const totCell = (text: string, right = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 17, color: PURPLE, font: 'Calibri' })], alignment: right ? AlignmentType.RIGHT : AlignmentType.LEFT })], shading: { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT }, margins: { top: 80, bottom: 80, left: 100, right: 100 } })
  const borders = { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' }, insideH: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' }, insideV: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' } }
  const summaryItems = [['Acreditado', data.razonSocial || '—'], ['RFC', data.rfc || '—'], ['Representante Legal', data.representanteLegal || '—'], ['Tipo de Persona', data.tipoPersona === 'moral' ? 'Persona Moral' : 'Persona Fisica'], ['Monto del Credito', `${data.moneda} $${fmt(monto)}`], ['Plazo', `${data.plazoMeses} meses`], ['Fecha de Disposicion', data.fechaDisposicion || '—'], ['Tipo de Amortizacion', data.tipoAmortizacion], ['Tasa', tasaLabel], ['IVA sobre intereses', data.ivaAplicable ? 'Si (16%)' : 'No'], ['Underwriting Fee', `${data.underwritingFee || 0}% ($${fmt(uw * monto)})`], ['Comision de Apertura', `${data.comisionApertura || 0}%`], ['Total Intereses', `$${fmt(totalInt)}`], ['Total Amortizacion', `$${fmt(totalAmort)}`], ['Total Comisiones', `$${fmt(totalComis)}`], ['Total a Pagar', `$${fmt(totalPago)}`]]
  const summaryRows = summaryItems.map(([label, value]) => new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 17, color: GRAY, font: 'Calibri' })] })], width: { size: 35, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: 'F9FAFB', fill: 'F9FAFB' }, margins: { top: 80, bottom: 80, left: 120, right: 80 } }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: value, size: 17, font: 'Calibri', color: '111827' })] })], width: { size: 65, type: WidthType.PERCENTAGE }, margins: { top: 80, bottom: 80, left: 120, right: 80 } })] }))
  const doc = new DocxDocument({ sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } }, children: [new Paragraph({ children: [new ImageRun({ data: logoBuffer, transformation: { width: 140, height: 35 }, type: 'png' })], spacing: { after: 200 } }), new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PURPLE } }, spacing: { after: 300 }, children: [] }), new Paragraph({ children: [new TextRun({ text: 'TERM SHEET - PROPUESTA DE CREDITO', bold: true, size: 28, color: PURPLE, font: 'Calibri' })], spacing: { after: 80 } }), new Paragraph({ children: [new TextRun({ text: `Fecha de emision: ${new Date().toLocaleDateString('es-MX')}`, size: 18, color: GRAY, font: 'Calibri' })], spacing: { after: 400 } }), new Paragraph({ children: [new TextRun({ text: 'RESUMEN EJECUTIVO', bold: true, size: 20, color: PURPLE, font: 'Calibri' })], spacing: { after: 160 } }), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: summaryRows, borders }), new Paragraph({ children: [], spacing: { after: 400 } }), new Paragraph({ children: [new TextRun({ text: 'TABLA DE AMORTIZACION', bold: true, size: 20, color: PURPLE, font: 'Calibri' })], spacing: { after: 160 } }), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders, rows: [new TableRow({ tableHeader: true, children: ['#', 'Fecha', 'Saldo Ini.', 'Interes', 'Amort.', 'Comis.', 'Total', 'Saldo Fin.'].map(hdrCell) }), ...schedule.map((r: any) => new TableRow({ children: [dataCell(String(r.periodo)), dataCell(r.fecha), dataCell(fmt(r.saldoInicial), true), dataCell(fmt(r.interes), true), dataCell(fmt(r.amortizacion), true), dataCell(r.comisiones > 0 ? fmt(r.comisiones) : '-', true, false, r.comisiones > 0 ? 'B45309' : '9CA3AF'), dataCell(fmt(r.total), true, true), dataCell(fmt(r.saldoFinal), true)] })), new TableRow({ children: [totCell('TOTALES'), totCell(''), totCell(''), totCell(fmt(totalInt), true), totCell(fmt(totalAmort), true), totCell(fmt(totalComis), true), totCell(fmt(totalPago), true), totCell('-', true)] })] }), new Paragraph({ children: [], spacing: { after: 400 } }), new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' } }, children: [new TextRun({ text: 'PorCuanto S.A. de C.V. - IFC - CNBV - Art. 47 CUITF - LFPDPPP - Documento confidencial.', size: 14, color: '9CA3AF', font: 'Calibri' })], spacing: { before: 200 } })] }] })
  return Packer.toBuffer(doc)
}

export async function POST(req: NextRequest) {
  try {
    const { data, format } = await req.json()
    if (!data) return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    const schedule = buildSchedule(data)
    const slug = (data.razonSocial || 'credito').replace(/\s+/g, '-')
    if (format === 'pdf') {
      const logoPath = path.join(process.cwd(), 'public', 'crowdlink-logo.png')
      const buffer = await renderToBuffer(React.createElement(TermSheetPDF, { data, schedule, logoPath }) as any)
      return new NextResponse(buffer as any, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="term-sheet-${slug}-${Date.now()}.pdf"` } })
    }
    if (format === 'docx') {
      const buffer = await generateDocx(data, schedule)
      return new NextResponse(buffer as any, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="term-sheet-${slug}-${Date.now()}.docx"` } })
    }
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (err: any) {
    console.error('Term sheet error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
