// Design tokens — Crowdlink brand
export const cl = {
  // Colors
  blue: '#1E6FF1',
  blueDark: '#1558C8',
  blueLight: '#EBF2FF',
  teal: '#00C896',
  tealDark: '#00A87E',
  tealLight: '#E6FAF5',
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',
  white: '#FFFFFF',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  success: '#10B981',
  successLight: '#ECFDF5',

  // Typography
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",

  // Shadows
  shadowSm: '0 1px 2px rgba(0,0,0,0.05)',
  shadowMd: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.05)',
  shadowLg: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)',
  shadowXl: '0 20px 25px -5px rgba(0,0,0,0.08), 0 10px 10px -5px rgba(0,0,0,0.03)',

  // Border radius
  radiusSm: '6px',
  radiusMd: '10px',
  radiusLg: '14px',
  radiusXl: '18px',
  radiusFull: '9999px',

  // Spacing
  navHeight: '64px',
}

// Shared component styles
export const sharedStyles = {
  // Root layout
  root: {
    minHeight: '100vh',
    background: cl.gray50,
    fontFamily: cl.fontFamily,
    color: cl.gray800,
  } as React.CSSProperties,

  // Nav
  nav: {
    position: 'fixed' as const,
    top: 0, left: 0, right: 0,
    height: cl.navHeight,
    background: cl.white,
    borderBottom: `1px solid ${cl.gray200}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2rem',
    zIndex: 100,
    boxShadow: cl.shadowSm,
  },

  // Page content (below nav)
  page: {
    paddingTop: cl.navHeight,
    minHeight: '100vh',
  } as React.CSSProperties,

  // Card
  card: {
    background: cl.white,
    border: `1px solid ${cl.gray200}`,
    borderRadius: cl.radiusLg,
    boxShadow: cl.shadowMd,
  } as React.CSSProperties,

  // Buttons
  btnPrimary: {
    background: cl.blue,
    color: cl.white,
    border: 'none',
    borderRadius: cl.radiusMd,
    padding: '0.7rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: cl.fontFamily,
    transition: 'all 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
  } as React.CSSProperties,

  btnTeal: {
    background: cl.teal,
    color: cl.white,
    border: 'none',
    borderRadius: cl.radiusMd,
    padding: '0.7rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: cl.fontFamily,
    transition: 'all 0.15s',
  } as React.CSSProperties,

  btnOutline: {
    background: 'transparent',
    color: cl.blue,
    border: `1.5px solid ${cl.blue}`,
    borderRadius: cl.radiusMd,
    padding: '0.65rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: cl.fontFamily,
    transition: 'all 0.15s',
  } as React.CSSProperties,

  btnGhost: {
    background: 'transparent',
    color: cl.gray500,
    border: `1px solid ${cl.gray200}`,
    borderRadius: cl.radiusMd,
    padding: '0.65rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '400',
    cursor: 'pointer',
    fontFamily: cl.fontFamily,
  } as React.CSSProperties,

  // Form elements
  label: {
    color: cl.gray600,
    fontSize: '0.8rem',
    fontWeight: '500',
    display: 'block',
    marginBottom: '0.4rem',
  } as React.CSSProperties,

  input: {
    width: '100%',
    background: cl.white,
    border: `1.5px solid ${cl.gray200}`,
    borderRadius: cl.radiusMd,
    padding: '0.7rem 0.9rem',
    color: cl.gray800,
    fontSize: '0.9rem',
    fontFamily: cl.fontFamily,
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  },

  // Badge
  badge: (color: string, bg: string) => ({
    background: bg,
    color,
    fontSize: '0.7rem',
    fontWeight: '600',
    padding: '0.25rem 0.6rem',
    borderRadius: cl.radiusFull,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
  } as React.CSSProperties),
}

// Status config
export const statusConfig: Record<string, { color: string; bg: string; label: string; dot: string }> = {
  pending: { color: '#B45309', bg: '#FFFBEB', label: 'Pendiente', dot: '#F59E0B' },
  in_review: { color: '#1D4ED8', bg: '#EFF6FF', label: 'En Revisión', dot: '#3B82F6' },
  approved: { color: '#065F46', bg: '#ECFDF5', label: 'Aprobado', dot: '#10B981' },
  rejected: { color: '#991B1B', bg: '#FEF2F2', label: 'Rechazado', dot: '#EF4444' },
}
