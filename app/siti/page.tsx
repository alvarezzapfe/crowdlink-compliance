'use client'
import { cl } from '@/lib/design'

export default function SitiPage() {
  return (
    <div style={{ minHeight: '100vh', background: cl.gray50, fontFamily: cl.fontFamily, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: '480px', padding: '2rem' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9333EA" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
          </svg>
        </div>
        <h1 style={{ color: cl.gray900, fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.75rem' }}>SITI AA</h1>
        <p style={{ color: cl.gray500, fontSize: '0.95rem', lineHeight: 1.7, margin: '0 0 2rem' }}>
          Módulo de cumplimiento regulatorio CNBV en desarrollo. Disponible próximamente.
        </p>
        <a href="/gate" style={{ color: '#9333EA', fontSize: '0.875rem', fontWeight: '600', textDecoration: 'none' }}>← Volver al hub</a>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
    </div>
  )
}
