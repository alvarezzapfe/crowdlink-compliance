import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
} from 'docx'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user
}

const NAVY = '0D2137'
const GRAY = '64748B'
const BLACK = '1E293B'
const LIGHT = 'F1F5F9'
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }
const sp = (before = 0, after = 0) => ({ spacing: { before, after } })

function hdr(text: string) {
  return new Paragraph({
    ...sp(280, 80),
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1', space: 4 } },
    children: [new TextRun({ text, bold: true, size: 22, color: NAVY, font: 'Arial', allCaps: true })],
  })
}

function clauseTitle(num: string, title: string) {
  return new Paragraph({
    ...sp(240, 60),
    children: [
      new TextRun({ text: `${num}. `, bold: true, size: 21, color: NAVY, font: 'Arial' }),
      new TextRun({ text: title.toUpperCase(), bold: true, size: 21, color: NAVY, font: 'Arial' }),
    ],
  })
}

function body(text: string, indent = false) {
  return new Paragraph({
    ...sp(80, 80), alignment: AlignmentType.JUSTIFIED,
    indent: indent ? { left: 360 } : undefined,
    children: [new TextRun({ text, size: 20, color: BLACK, font: 'Arial' })],
  })
}

function sub(num: string, text: string) {
  return new Paragraph({
    ...sp(80, 80), alignment: AlignmentType.JUSTIFIED,
    indent: { left: 360, hanging: 360 },
    children: [
      new TextRun({ text: `${num}\t`, bold: true, size: 20, color: NAVY, font: 'Arial' }),
      new TextRun({ text, size: 20, color: BLACK, font: 'Arial' }),
    ],
  })
}

function v(text: string) {
  return new TextRun({ text, bold: true, color: '0F7BF4', font: 'Arial', size: 20 })
}

function b(text: string) {
  return new TextRun({ text, bold: true, color: BLACK, font: 'Arial', size: 20 })
}

function empty(before = 80, after = 80) {
  return new Paragraph({ ...sp(before, after), children: [new TextRun('')] })
}

function generateNDA(data: {
  empresa: string; representante: string; fecha: string
  vigencia: string; domicilio: string; email: string
}) {
  const { empresa, representante, fecha, vigencia, domicilio, email } = data

  return new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 20, color: BLACK } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1260, bottom: 1260, left: 1440 },
        },
      },
      children: [
        // Header
        new Table({
          width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360],
          rows: [new TableRow({ children: [new TableCell({
            borders: noBorders,
            shading: { fill: NAVY, type: ShadingType.CLEAR },
            margins: { top: 240, bottom: 240, left: 360, right: 360 },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CONVENIO DE CONFIDENCIALIDAD', bold: true, size: 28, color: 'FFFFFF', font: 'Arial', allCaps: true })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, ...sp(80, 0), children: [new TextRun({ text: 'PorCuanto S.A. de C.V., Institución de Financiamiento Colectivo', size: 18, color: 'CBD5E1', font: 'Arial' })] }),
            ],
          })] })],
        }),
        empty(160, 80),

        // Partes
        new Table({
          width: { size: 9360, type: WidthType.DXA }, columnWidths: [4560, 4800],
          rows: [new TableRow({ children: [
            new TableCell({
              borders: noBorders, shading: { fill: 'EFF6FF', type: ShadingType.CLEAR },
              margins: { top: 180, bottom: 180, left: 240, right: 240 },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'PARTE REVELADORA', bold: true, size: 17, color: NAVY, font: 'Arial', allCaps: true })] }),
                new Paragraph({ ...sp(60, 0), children: [new TextRun({ text: 'PorCuanto S.A. de C.V., IFC', bold: true, size: 20, color: BLACK, font: 'Arial' })] }),
                new Paragraph({ ...sp(40, 0), children: [new TextRun({ text: 'Rep.: Luis Armando Álvarez Zapfe', size: 18, color: GRAY, font: 'Arial' })] }),
                new Paragraph({ ...sp(20, 0), children: [new TextRun({ text: 'luis@crowdlink.mx', size: 18, color: GRAY, font: 'Arial' })] }),
              ],
            }),
            new TableCell({
              borders: noBorders, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
              margins: { top: 180, bottom: 180, left: 240, right: 240 },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'PARTE RECEPTORA', bold: true, size: 17, color: NAVY, font: 'Arial', allCaps: true })] }),
                new Paragraph({ ...sp(60, 0), children: [new TextRun({ text: empresa, bold: true, size: 20, color: BLACK, font: 'Arial' })] }),
                new Paragraph({ ...sp(40, 0), children: [new TextRun({ text: `Rep.: ${representante}`, size: 18, color: GRAY, font: 'Arial' })] }),
                new Paragraph({ ...sp(20, 0), children: [new TextRun({ text: `Fecha: ${fecha}`, size: 18, color: GRAY, font: 'Arial' })] }),
              ],
            }),
          ]})]
        }),
        empty(240, 80),

        hdr('Declaraciones'),
        empty(60, 40),
        new Paragraph({ ...sp(80, 60), children: [b('I. '), b('PorCuanto S.A. de C.V., Institución de Financiamiento Colectivo'), new TextRun({ text: ', declara por conducto de su representante legal que:', size: 20, color: BLACK, font: 'Arial' })] }),
        body('a) Su representante legal cuenta con las facultades legales suficientes y necesarias para celebrar el presente Convenio en su nombre y representación, manifestando que dichas facultades no le han sido revocadas, modificadas ni limitadas de manera alguna.', true),
        body('b) Ha adoptado todas las resoluciones necesarias de carácter corporativo a fin de autorizar la celebración del presente Convenio.', true),
        body('c) La celebración, entrega y cumplimiento del presente Convenio no viola ninguna ley, reglamento o disposición legal aplicable, y una vez debidamente suscrito constituirá un documento válido y obligatorio.', true),
        empty(80, 40),
        new Paragraph({ ...sp(80, 60), children: [b('II. '), new TextRun({ text: empresa, bold: true, size: 20, color: BLACK, font: 'Arial' }), new TextRun({ text: ', declara a través de sus apoderados que:', size: 20, color: BLACK, font: 'Arial' })] }),
        body('a) Es una sociedad debidamente constituida conforme a las leyes de México y cuenta con todas las autorizaciones necesarias para la celebración y cumplimiento del presente Convenio.', true),
        body('b) Sus apoderados cuentan con facultades legales suficientes para obligar a su representada, mismas que no han sido revocadas ni modificadas.', true),
        body('c) Es su voluntad celebrar el presente Convenio para los fines establecidos en la Cláusula Primera.', true),
        empty(80, 40),
        new Paragraph({ ...sp(80, 60), children: [b('III. Las Partes declaran conjuntamente que'), new TextRun({ text: ' es su voluntad celebrar el presente Convenio, el cual se regirá conforme a las siguientes:', size: 20, color: BLACK, font: 'Arial' })] }),
        empty(160, 80),

        hdr('Cláusulas'),
        empty(60, 40),

        clauseTitle('Primera', 'Objeto del Convenio'),
        sub('1.1', 'Las Partes celebran el presente Convenio para facilitar las negociaciones entre ellas e intercambiar Información Confidencial relacionada con PorCuanto S.A. de C.V., Institución de Financiamiento Colectivo.'),
        sub('1.2', `Información Confidencial. Se entiende por Información Confidencial cualquier información de carácter técnico, comercial, legal, fiscal o administrativo, ya sea escrita, tangible o intangible, que cualquiera de las Partes proporcione a la otra en el marco del presente Convenio.`),
        sub('1.3', 'La Parte reveladora no será responsable por la exactitud o integridad de la Información Confidencial proporcionada ni por cualquier acción u omisión derivada de su uso.'),

        empty(120, 40),
        clauseTitle('Segunda', 'Obligaciones de la Parte Receptora'),
        sub('2.1', 'La Parte receptora mantendrá toda la Información Confidencial con tal carácter y no la revelará a ninguna persona ni para ningún fin distinto al establecido en la Cláusula Primera.'),
        sub('2.2', 'La Parte receptora protegerá la Información Confidencial ejerciendo al menos el mismo grado de cuidado que aplica a su propia información confidencial.'),
        sub('2.3', 'No se otorga derecho alguno, licencia u otro interés a la Parte receptora respecto de la Información Confidencial.'),
        sub('2.4', 'La Parte receptora será responsable por las acciones u omisiones de sus representantes respecto de la Información Confidencial.'),

        empty(120, 40),
        clauseTitle('Tercera', 'Excepciones'),
        body('La obligación de confidencialidad no aplicará cuando la información: (i) sea de conocimiento público; (ii) hubiere estado en posesión de la Parte receptora con anterioridad; (iii) sea proporcionada por un tercero sin indicación de confidencialidad; o (iv) deba ser revelada por disposición legal o resolución de autoridad competente, en cuyo caso la Parte receptora dará aviso previo por escrito a la Parte reveladora.'),

        empty(120, 40),
        clauseTitle('Cuarta', 'Vigencia'),
        sub('4.1', `El presente Convenio surtirá efectos a partir de la fecha de firma y continuará vigente durante ${vigencia} meses, salvo terminación anticipada por acuerdo escrito de las Partes.`),
        sub('4.2', 'A la terminación, la Parte receptora devolverá o destruirá toda la Información Confidencial en su poder y certificará por escrito que no conserva copia alguna.'),

        empty(120, 40),
        clauseTitle('Quinta', 'Disposiciones Generales'),
        sub('5.1', 'No asociación. Nada en el presente Convenio crea sociedad, asociación, fideicomiso o relación de agencia entre las Partes.'),
        sub('5.2', 'No renuncia. La falta o demora en el ejercicio de derechos no constituye renuncia.'),
        sub('5.3', 'Modificaciones. Cualquier modificación deberá constar por escrito y estar firmada por ambas Partes.'),
        sub('5.4', 'Independencia de cláusulas. La invalidez de cualquier disposición no afectará la validez del resto.'),
        sub('5.5', 'Cesión. Ninguna Parte podrá ceder el presente Convenio sin consentimiento previo y por escrito de la otra.'),
        sub('5.6', 'Acuerdo total. El presente Convenio constituye el acuerdo integral entre las Partes sobre su objeto.'),
        sub('5.7', 'Notificaciones. Los avisos deberán enviarse a las siguientes direcciones:'),
        empty(60, 40),

        new Table({
          width: { size: 8640, type: WidthType.DXA }, columnWidths: [4320, 4320],
          rows: [new TableRow({ children: [
            new TableCell({
              borders: noBorders, shading: { fill: LIGHT, type: ShadingType.CLEAR },
              margins: { top: 140, bottom: 140, left: 200, right: 200 },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'PARTE REVELADORA', bold: true, size: 17, color: NAVY, font: 'Arial', allCaps: true })] }),
                new Paragraph({ ...sp(60, 0), children: [new TextRun({ text: 'PorCuanto S.A. de C.V., IFC', bold: true, size: 19, color: BLACK, font: 'Arial' })] }),
                new Paragraph({ ...sp(40, 0), children: [new TextRun({ text: 'Torre Esmeralda III, Blvd. Manuel Ávila Camacho 32, Sky Lobby B, Lomas de Chapultepec, CP 11000, CDMX', size: 18, color: GRAY, font: 'Arial' })] }),
                new Paragraph({ ...sp(40, 0), children: [new TextRun({ text: 'luis@crowdlink.mx', size: 18, color: GRAY, font: 'Arial' })] }),
              ],
            }),
            new TableCell({
              borders: noBorders, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
              margins: { top: 140, bottom: 140, left: 200, right: 200 },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'PARTE RECEPTORA', bold: true, size: 17, color: NAVY, font: 'Arial', allCaps: true })] }),
                new Paragraph({ ...sp(60, 0), children: [new TextRun({ text: empresa, bold: true, size: 19, color: BLACK, font: 'Arial' })] }),
                new Paragraph({ ...sp(40, 0), children: [new TextRun({ text: domicilio || 'Ver datos de contacto', size: 18, color: GRAY, font: 'Arial' })] }),
                new Paragraph({ ...sp(40, 0), children: [new TextRun({ text: email, size: 18, color: GRAY, font: 'Arial' })] }),
              ],
            }),
          ]})]
        }),

        empty(120, 40),
        clauseTitle('Sexta', 'Ley Aplicable y Jurisdicción'),
        body('El presente Convenio se regirá conforme a las leyes de México. Las Partes se someten a la jurisdicción de los tribunales federales de la Ciudad de México y renuncian a cualquier otra jurisdicción.'),

        empty(280, 80),
        hdr('Firmas'),
        empty(120, 80),
        new Paragraph({ alignment: AlignmentType.CENTER, ...sp(60, 0), children: [new TextRun({ text: `En testimonio de lo anterior, las Partes suscriben el presente Convenio el día ${fecha}, en Ciudad de México.`, size: 20, color: BLACK, font: 'Arial' })] }),
        empty(200, 80),

        new Table({
          width: { size: 9360, type: WidthType.DXA }, columnWidths: [4320, 720, 4320],
          rows: [new TableRow({ children: [
            new TableCell({
              borders: noBorders, verticalAlign: VerticalAlign.BOTTOM,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 4 } }, ...sp(80, 0), children: [new TextRun({ text: 'Luis Armando Álvarez Zapfe', bold: true, size: 20, color: BLACK, font: 'Arial' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Apoderado · PorCuanto S.A. de C.V., IFC', size: 18, color: GRAY, font: 'Arial' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, ...sp(20, 0), children: [new TextRun({ text: 'Parte Reveladora', bold: true, size: 17, color: NAVY, font: 'Arial' })] }),
              ],
            }),
            new TableCell({ borders: noBorders, children: [new Paragraph({ children: [new TextRun('')] })] }),
            new TableCell({
              borders: noBorders, verticalAlign: VerticalAlign.BOTTOM,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 4 } }, ...sp(80, 0), children: [new TextRun({ text: representante, bold: true, size: 20, color: BLACK, font: 'Arial' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Apoderado(a) · ${empresa}`, size: 18, color: GRAY, font: 'Arial' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, ...sp(20, 0), children: [new TextRun({ text: 'Parte Receptora', bold: true, size: 17, color: NAVY, font: 'Arial' })] }),
              ],
            }),
          ]})]
        }),
      ],
    }],
  })
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { empresa, representante, fecha, vigencia, domicilio, email_destino, solo_descarga } = body

  if (!empresa || !representante || !fecha || !email_destino)
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })

  // Generar Word
  const doc = generateNDA({ empresa, representante, fecha, vigencia: vigencia || '12', domicilio: domicilio || '', email: email_destino })
  const buffer = await Packer.toBuffer(doc)
  const base64 = buffer.toString('base64')

  if (solo_descarga) {
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="NDA_${empresa.replace(/\s+/g, '_')}.docx"`,
      },
    })
  }

  // Enviar por Resend
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) return NextResponse.json({ error: 'Resend no configurado' }, { status: 500 })

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [email_destino],
      cc: ['luis@crowdlink.mx'],
      subject: `Convenio de Confidencialidad — PorCuanto S.A. de C.V. / ${empresa}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0D2137; padding: 28px 32px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #fff; margin: 0; font-size: 20px; font-weight: 700;">Convenio de Confidencialidad</h1>
            <p style="color: #94A3B8; margin: 6px 0 0; font-size: 14px;">PorCuanto S.A. de C.V., Institución de Financiamiento Colectivo</p>
          </div>
          <div style="background: #F8FAFC; padding: 28px 32px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="color: #1E293B; font-size: 15px; line-height: 1.6;">Estimado(a) <strong>${representante}</strong>,</p>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">Adjunto encontrará el Convenio de Confidencialidad entre <strong>PorCuanto S.A. de C.V.</strong> y <strong>${empresa}</strong>, con vigencia de ${vigencia || '12'} meses a partir de la firma.</p>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">Por favor revise el documento, fírmelo y devuelva una copia firmada a <a href="mailto:luis@crowdlink.mx" style="color: #1E6FF1;">luis@crowdlink.mx</a>.</p>
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;">
            <p style="color: #94A3B8; font-size: 12px; margin: 0;">PorCuanto S.A. de C.V. · CASFIM 0065022 · Torre Esmeralda III, CDMX</p>
          </div>
        </div>
      `,
      attachments: [{
        filename: `NDA_${empresa.replace(/\s+/g, '_')}_${fecha.replace(/\s+/g, '_')}.docx`,
        content: base64,
      }],
    }),
  })

  if (!emailRes.ok) {
    const err = await emailRes.json()
    return NextResponse.json({ error: err.message || 'Error al enviar email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: `NDA enviado a ${email_destino}` })
}
