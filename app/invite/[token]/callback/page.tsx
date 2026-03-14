'use client'
import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { cl } from '@/lib/design'

export default function InviteCallbackPage() {
  const params = useParams()
  const token = params.token as string

  useEffect(() => {
    if (!token) return
    const finalize = async () => {
      try {
        const supabase = createClient()
        await new Promise(r => setTimeout(r, 1500))
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) { window.location.href = `/invite/${token}`; return }
        await fetch('/api/v1/invitations/use', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ token }) })
        window.location.href = '/kyc/wizard'
      } catch { window.location.href = '/login' }
    }
    finalize()
  }, [token])

  return (
    <div style={{ minHeight: '100vh', background: cl.gray50, fontFamily: cl.fontFamily, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '44px', height: '44px', border: '3px solid #EBF3FF', borderTopColor: '#0F7BF4', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 1.25rem' }} />
        <div style={{ color: '#0F172A', fontSize: '1rem', fontWeight: '700', marginBottom: '0.4rem' }}>Activando tu acceso...</div>
        <div style={{ color: '#94A3B8', fontSize: '0.85rem' }}>Serás redirigido al formulario KYC</div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
