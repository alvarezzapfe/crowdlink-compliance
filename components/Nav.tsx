'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { cl } from '@/lib/design'
import { IconArrowLeft, IconLogout } from '@/components/Icons'

interface NavProps {
  userEmail?: string
  back?: { href: string; label: string }
  title?: string
}

export default function Nav({ userEmail, back, title }: NavProps) {
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: '60px',
      background: cl.white,
      borderBottom: `1px solid ${cl.gray200}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 1.75rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {back && (
          <a href={back.href} style={{
            color: cl.gray400, fontSize: '0.8rem', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '500',
          }}>
            <IconArrowLeft size={14} color={cl.gray400} />
            {back.label}
          </a>
        )}
        {back && <div style={{ width: '1px', height: '18px', background: cl.gray200 }} />}

        <a href="/gate" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '26px', width: 'auto' }} />
        </a>

        {title && (
          <>
            <div style={{ width: '1px', height: '18px', background: cl.gray200 }} />
            <span style={{ color: cl.gray400, fontSize: '0.82rem', fontWeight: '500' }}>{title}</span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {userEmail && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: cl.gray50, border: `1px solid ${cl.gray200}`,
            borderRadius: '9999px', padding: '0.3rem 0.85rem 0.3rem 0.35rem',
          }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: `linear-gradient(135deg, #0F7BF4, #3DFFA0)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '0.65rem', fontWeight: '700',
            }}>
              {userEmail[0].toUpperCase()}
            </div>
            <span style={{ color: cl.gray600, fontSize: '0.78rem', fontWeight: '500' }}>{userEmail}</span>
          </div>
        )}
        <button onClick={handleLogout} disabled={loggingOut} style={{
          background: 'transparent', border: `1px solid ${cl.gray200}`,
          borderRadius: '8px', padding: '0.4rem 0.75rem',
          color: cl.gray500, fontSize: '0.78rem', fontWeight: '500',
          cursor: 'pointer', fontFamily: cl.fontFamily,
          display: 'flex', alignItems: 'center', gap: '0.4rem',
        }}>
          <IconLogout size={14} color={cl.gray400} />
          {loggingOut ? '...' : 'Salir'}
        </button>
      </div>
    </nav>
  )
}
