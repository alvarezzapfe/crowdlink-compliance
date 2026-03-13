'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { cl } from '@/lib/design'

export default function InviteCallbackPage({ params }: { params: { token: string } }) {
  useEffect(() => {
    const finalize = async () => {
      try {
        const supabase = createClient()

        // Esperar a que Supabase procese el magic link de la URL
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          // Dar tiempo al hash de la URL para procesarse
          await new Promise(r => setTimeout(r, 1500))
        }

        const { data: { session: session2 } } = await supabase.auth.getSession()
        if (!session2?.user) {
          window.location.href = `/invite/${params.token}`
          return
        }

        // Marcar token como usado via API
        await fetch('/api/v1/invitations/use', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session2.access_token}`,
          },
          body: JSON.stringify({ token: params.token }),
        })

        // Redirigir al wizard
        window.location.href = '/kyc/wizard'
      } catch {
        window.location.href = '/login'
      }
    }
    finalize()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: cl.gray50, fontFamily: cl.fontFamily, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '44px', height: '44px', border: '3px solid #EBF3FF', borderTopColor: '#0F7BF4', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 1.25rem' }} />
        <div style={{ color: '#0F172A', fontSize: '1rem', fontWeight: '700', marginBottom: '0.4rem' }}>Activando tu acceso...</div>
        <div style={{ color: '#94A3B8', fontSize: '0.85rem' }}>Serás redirigido al formulario KYC</div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
