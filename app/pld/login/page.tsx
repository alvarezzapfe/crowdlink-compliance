'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { cl } from '@/lib/design'
import { IconShield, IconEye, IconEyeOff } from '@/components/Icons'

export default function PldLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError || !data.user) { setError('Credenciales incorrectas'); setLoading(false); return }
    const accessToken = data.session?.access_token
    if (!accessToken) { await supabase.auth.signOut(); setError('Error de sesión'); setLoading(false); return }
    // Allow admin and compliance roles + known PLD emails
    const pldEmails = ['luis@crowdlink.mx', 'lalvarezzapfe@gmail.com', 'pld@crowdlink.mx']
    if (!pldEmails.includes(data.user.email || '')) {
      const roleRes = await fetch('/api/v1/auth/check-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
      })
      if (!roleRes.ok) {
        await supabase.auth.signOut()
        setError('Sin acceso al módulo PLD'); setLoading(false); return
      }
    }
    window.location.href = '/pld'
  }

  return (
    <div style={{ minHeight: '100vh', background: cl.gray50, fontFamily: cl.fontFamily, display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <div style={{ height: '60px', background: cl.white, borderBottom: `1px solid ${cl.gray200}`, display: 'flex', alignItems: 'center', padding: '0 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <a href="/gate" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: cl.gray500, fontSize: '0.82rem', fontWeight: '500' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>
          Regresar
        </a>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '22px', width: 'auto' }} />
        </div>
        <div style={{ width: '80px' }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#ECFDF5', border: '1.5px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <IconShield size={22} color="#059669" strokeWidth={2} />
            </div>
            <h1 style={{ color: cl.gray900, fontSize: '1.3rem', fontWeight: '800', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>Sistema PLD</h1>
            <p style={{ color: cl.gray400, fontSize: '0.85rem', margin: 0 }}>Prevención de Lavado de Dinero · Equipo Compliance</p>
          </div>

          <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '18px', padding: '2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={lbl}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="compliance@crowdlink.mx" autoFocus style={inp} />
              </div>
              <div>
                <label style={lbl}>Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="••••••••" style={{ ...inp, paddingRight: '3rem' }} />
                  <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    {showPass ? <IconEyeOff size={16} color={cl.gray400} /> : <IconEye size={16} color={cl.gray400} />}
                  </button>
                </div>
              </div>
              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.7rem 0.9rem', color: '#DC2626', fontSize: '0.8rem' }}>{error}</div>
              )}
              <button onClick={handleLogin} disabled={loading || !email || !password} style={{
                width: '100%', background: loading || !email || !password ? '#E2E8F0' : '#059669',
                border: 'none', borderRadius: '10px', padding: '0.85rem',
                color: loading || !email || !password ? '#94A3B8' : 'white',
                cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
                fontFamily: cl.fontFamily, fontSize: '0.9rem', fontWeight: '700',
                boxShadow: loading || !email || !password ? 'none' : '0 4px 12px rgba(5,150,105,0.25)',
              }}>
                {loading ? 'Verificando...' : 'Acceder →'}
              </button>
            </div>
          </div>

          <p style={{ color: cl.gray300, fontSize: '0.72rem', textAlign: 'center', marginTop: '1.5rem' }}>
            PorCuanto S.A. de C.V. · IFC · CNBV · LFPIORPI
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        input:focus { border-color: #059669 !important; box-shadow: 0 0 0 3px #ECFDF5; outline: none; }
      `}</style>
    </div>
  )
}

const lbl: React.CSSProperties = { color: '#475569', fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.45rem' }
const inp: React.CSSProperties = { width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '10px', padding: '0.8rem 1rem', color: '#1E293B', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' as const }
