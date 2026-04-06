'use client'
import { cl } from '@/lib/design'

export default function CondusefsPage() {
  return (
    <div style={{ minHeight: '100vh', background: cl.gray50, fontFamily: cl.fontFamily, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: '480px', padding: '2rem' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <h1 style={{ color: cl.gray900, fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.75rem' }}>Reportes CONDUSEF</h1>
        <p style={{ color: cl.gray500, fontSize: '0.95rem', lineHeight: 1.7, margin: '0 0 2rem' }}>
          Generación y gestión de reportes RECA, UNES, REUNE y SIPRES en desarrollo. Disponible próximamente.
        </p>
        <a href="/gate" style={{ color: '#EA580C', fontSize: '0.875rem', fontWeight: '600', textDecoration: 'none' }}>← Volver al hub</a>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
    </div>
  )
}
