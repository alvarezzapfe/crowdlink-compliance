export type Role = 'super_admin' | 'admin' | 'compliance_officer' | 'readonly'
export type Modulo = 'pld' | 'kyc' | 'term_sheet' | 'contratos' | 'siti' | 'condusef' | 'usuarios'

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  compliance_officer: 'Compliance Officer',
  readonly: 'Solo lectura',
}

export const ROLE_COLORS: Record<Role, { color: string; bg: string }> = {
  super_admin: { color: '#7C3AED', bg: '#F5F3FF' },
  admin:       { color: '#0891B2', bg: '#ECFEFF' },
  compliance_officer: { color: '#059669', bg: '#ECFDF5' },
  readonly:    { color: '#64748B', bg: '#F1F5F9' },
}

export const DEFAULT_PERMISSIONS: Record<Role, Record<Modulo, { ver: boolean; editar: boolean }>> = {
  super_admin: {
    pld: { ver: true, editar: true }, kyc: { ver: true, editar: true },
    term_sheet: { ver: true, editar: true }, contratos: { ver: true, editar: true },
    siti: { ver: true, editar: true }, condusef: { ver: true, editar: true },
    usuarios: { ver: true, editar: true },
  },
  admin: {
    pld: { ver: true, editar: true }, kyc: { ver: true, editar: true },
    term_sheet: { ver: true, editar: true }, contratos: { ver: true, editar: true },
    siti: { ver: true, editar: true }, condusef: { ver: true, editar: true },
    usuarios: { ver: true, editar: true },
  },
  compliance_officer: {
    pld: { ver: true, editar: true }, kyc: { ver: true, editar: true },
    term_sheet: { ver: true, editar: true }, contratos: { ver: true, editar: true },
    siti: { ver: true, editar: true }, condusef: { ver: true, editar: true },
    usuarios: { ver: false, editar: false },
  },
  readonly: {
    pld: { ver: true, editar: false }, kyc: { ver: true, editar: false },
    term_sheet: { ver: true, editar: false }, contratos: { ver: true, editar: false },
    siti: { ver: true, editar: false }, condusef: { ver: true, editar: false },
    usuarios: { ver: false, editar: false },
  },
}

export function canManageUsers(role: Role): boolean {
  return role === 'super_admin' || role === 'admin'
}

export function canEdit(role: Role, modulo: Modulo): boolean {
  return DEFAULT_PERMISSIONS[role]?.[modulo]?.editar ?? false
}

export function canView(role: Role, modulo: Modulo): boolean {
  return DEFAULT_PERMISSIONS[role]?.[modulo]?.ver ?? false
}
