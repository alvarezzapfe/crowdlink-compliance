import { NextResponse } from 'next/server'

// Series SIE de Banxico
// CETES: 28d=SF43936, 91d=SF43939, 182d=SF43942, 364d=SF43945
// TIIE 28d=SF43783
const SERIES = 'SF43936,SF43939,SF43942,SF43945,SF43783'

interface SieDato {
  fecha: string
  dato: string
}

interface SieSerie {
  idSerie: string
  titulo: string
  datos: SieDato[]
}

interface BanxicoResponse {
  bmx: {
    series: SieSerie[]
  }
}

export interface TasasResponse {
  cetes28: number | null
  cetes91: number | null
  cetes182: number | null
  cetes364: number | null
  tiie28: number | null
  fecha: string | null
  fuente: 'banxico' | 'defaults'
}

// Defaults reales junio 2026
const DEFAULTS: TasasResponse = {
  cetes28: 7.0,
  cetes91: 7.05,
  cetes182: 7.1,
  cetes364: 7.17,
  tiie28: 7.25,
  fecha: null,
  fuente: 'defaults',
}

const SERIE_MAP: Record<string, keyof Omit<TasasResponse, 'fecha' | 'fuente'>> = {
  SF43936: 'cetes28',
  SF43939: 'cetes91',
  SF43942: 'cetes182',
  SF43945: 'cetes364',
  SF43783: 'tiie28',
}

export async function GET() {
  const token = process.env.BANXICO_TOKEN
  if (!token) {
    return NextResponse.json(DEFAULTS, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    })
  }

  try {
    const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${SERIES}/datos/oportuno?token=${token}`
    const res = await fetch(url, { next: { revalidate: 3600 } })

    if (!res.ok) {
      console.error(`Banxico API error: ${res.status}`)
      return NextResponse.json(DEFAULTS)
    }

    const data: BanxicoResponse = await res.json()
    const result: TasasResponse = { ...DEFAULTS, fuente: 'banxico' }

    for (const serie of data.bmx.series) {
      const key = SERIE_MAP[serie.idSerie]
      if (key && serie.datos.length > 0) {
        const valor = parseFloat(serie.datos[serie.datos.length - 1].dato)
        if (!isNaN(valor)) {
          result[key] = valor
          if (!result.fecha) result.fecha = serie.datos[serie.datos.length - 1].fecha
        }
      }
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch (err) {
    console.error('Banxico fetch failed:', err)
    return NextResponse.json(DEFAULTS)
  }
}
