// ─── Sanitización ─────────────────────────────────────────────────────────────
// Elimina caracteres peligrosos para prevenir XSS e inyecciones
export function sanitize(value: string): string {
  return value
    .replace(/[<>'"`;\\]/g, '')          // XSS básico
    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|SCRIPT)\b)/gi, '') // SQL/script keywords
    .trim()
    .slice(0, 500) // límite de longitud
}

export function sanitizeRFC(value: string): string {
  // RFC solo permite letras y números, sin caracteres especiales
  return value.replace(/[^A-ZÑ0-9&]/gi, '').toUpperCase().slice(0, 13)
}

export function sanitizeCURP(value: string): string {
  return value.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 18)
}

export function sanitizeNum(value: string): string {
  return value.replace(/[^0-9.,]/g, '').slice(0, 20)
}

export function sanitizeURL(value: string): string {
  // Solo permite https:// URLs limpias
  if (value && !value.startsWith('https://') && !value.startsWith('http://') && value.length > 0) {
    return value // devolver sin modificar, validar en submit
  }
  return value.replace(/[<>'"`;\\]/g, '').slice(0, 500)
}

// ─── Validaciones ──────────────────────────────────────────────────────────────
// RFC persona moral: 3 letras + 6 dígitos fecha + 3 homoclave
// RFC persona física: 4 letras + 6 dígitos fecha + 3 homoclave
const RFC_MORAL_REGEX = /^[A-ZÑ&]{3}[0-9]{6}[A-Z0-9]{3}$/
const RFC_FISICA_REGEX = /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{3}$/

export function validateRFC(rfc: string, tipo: 'moral' | 'fisica'): string | null {
  if (!rfc) return 'RFC requerido'
  const clean = rfc.trim().toUpperCase()
  if (tipo === 'moral' && !RFC_MORAL_REGEX.test(clean)) {
    return 'RFC persona moral: 3 letras + 6 dígitos (fecha) + 3 homoclave. Ej: EMP920101ABC'
  }
  if (tipo === 'fisica' && !RFC_FISICA_REGEX.test(clean)) {
    return 'RFC persona física: 4 letras + 6 dígitos (fecha) + 3 homoclave. Ej: GALJ900101H01'
  }
  return null
}

export function validateCURP(curp: string): string | null {
  if (!curp) return null // opcional
  const CURP_REGEX = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{2}$/
  if (!CURP_REGEX.test(curp.trim().toUpperCase())) {
    return 'CURP inválido. Formato: GALJ900101HMCRCN01'
  }
  return null
}

export function validateURL(url: string): string | null {
  if (!url) return null // opcional
  try {
    const u = new URL(url)
    if (!['http:', 'https:'].includes(u.protocol)) return 'URL debe comenzar con https://'
    return null
  } catch {
    return 'URL inválida'
  }
}

export function validateStep1(form: { razon_social: string; rfc: string; tipo_persona: 'moral' | 'fisica' }): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!form.razon_social.trim()) errs.razon_social = 'Razón social requerida'
  if (form.razon_social.length > 200) errs.razon_social = 'Máximo 200 caracteres'
  const rfcErr = validateRFC(form.rfc, form.tipo_persona)
  if (rfcErr) errs.rfc = rfcErr
  return errs
}

export function validateStep2(form: { rep_legal_nombre: string; rep_legal_curp: string }): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!form.rep_legal_nombre.trim()) errs.rep_legal_nombre = 'Nombre requerido'
  const curpErr = validateCURP(form.rep_legal_curp)
  if (curpErr) errs.rep_legal_curp = curpErr
  return errs
}

export function validateStep4(form: { nivel_facturacion: string }): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!form.nivel_facturacion) errs.nivel_facturacion = 'Selecciona un rango de facturación'
  return errs
}
