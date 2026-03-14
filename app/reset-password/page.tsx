'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { cl } from '@/lib/design'
import { IconLock, IconEye, IconEyeOff, IconCheck } from '@/components/Icons'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Supabase puts the token in the URL hash — need to let it process
    const supabase = createClient()
    // Listen for the session to be established from the hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setSessionReady(true)
      }
    })
    // Also try to get existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async () => {
    setError('')
    if (password.length < 8) { setError('Mínimo 8 caracteres'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setLoading(false)
    setTimeout(() => { window.location.href = '/login' }, 2000)
  }

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : password.match(/[A-Z]/) && password.match(/[0-9]/) ? 4 : 3
  const strengthColor = ['#E2E8F0', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'][strength]

  return (
    <div style={{ minHeight: '100vh', background: cl.gray50, fontFamily: cl.fontFamily, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: cl.white, borderBottom: `1px solid ${cl.gray200}`, padding: '0 2rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/crowdlink-logo.png" alt="Crowdlink" style={{ height: '20px', width: 'auto' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: cl.blueLight, border: '1.5px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <IconLock size={22} color="#0F7BF4" strokeWidth={2} />
            </div>
            <h1 style={{ color: cl.gray900, fontSize: '1.3rem', fontWeight: '800', margin: '0 0 0.3rem', letterSpacing: '-0.02em' }}>Nueva contraseña</h1>
            <p style={{ color: cl.gray400, fontSize: '0.85rem', margin: 0 }}>Elige una contraseña segura para tu cuenta</p>
          </div>

          <div style={{ background: cl.white, border: `1px solid ${cl.gray200}`, borderRadius: '18px', padding: '2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
            {!done ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={lbl}>Nueva contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres" autoFocus
                      style={{ ...inp, paddingRight: '3rem' }} />
                    <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                      {showPass ? <IconEyeOff size={16} color={cl.gray400} /> : <IconEye size={16} color={cl.gray400} />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div style={{ marginTop: '0.4rem' }}>
                      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.25rem' }}>
                        {[1,2,3,4].map(i => (
                          <div key={i} style={{ flex: 1, height: '3px', borderRadius: '9999px', background: i <= strength ? strengthColor : cl.gray200, transition: 'background 0.2s' }} />
                        ))}
                      </div>
                      <div style={{ color: strengthColor, fontSize: '0.7rem', fontWeight: '600' }}>
                        {['', 'Muy débil', 'Débil', 'Buena', 'Fuerte'][strength]}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label style={lbl}>Confirmar contraseña</label>
                  <input type="password" value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleReset()}
                    placeholder="Repite la contraseña"
                    style={{ ...inp, borderColor: confirm && confirm !== password ? '#FCA5A5' : undefined }} />
                  {confirm && confirm !== password && (
                    <div style={{ color: '#DC2626', fontSize: '0.72rem', marginTop: '0.25rem' }}>No coinciden</div>
                  )}
                </div>
                {error && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.7rem 0.9rem', color: '#DC2626', fontSize: '0.8rem' }}>{error}</div>
                )}
                {!sessionReady && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '0.7rem 0.9rem', color: '#92400E', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '14px', height: '14px', border: '2px solid #FDE68A', borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                    Verificando sesión...
                  </div>
                )}
                <button onClick={handleReset} disabled={loading || !password || !confirm || password !== confirm || !sessionReady} style={{ width: '100%', background: loading || !password || !confirm || password !== confirm || !sessionReady ? '#E2E8F0' : '#0F7BF4', border: 'none', borderRadius: '10px', padding: '0.85rem', color: loading || !password || !confirm || password !== confirm || !sessionReady ? '#94A3B8' : 'white', cursor: loading || !password || !confirm || password !== confirm || !sessionReady ? 'not-allowed' : 'pointer', fontFamily: cl.fontFamily, fontSize: '0.9rem', fontWeight: '700', boxShadow: sessionReady && password && confirm && password === confirm ? '0 4px 12px rgba(15,123,244,0.25)' : 'none', transition: 'all 0.2s' }}>
                  {loading ? 'Guardando...' : 'Guardar contraseña'}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#ECFDF5', border: '2px solid #6EE7B7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <IconCheck size={24} color="#059669" strokeWidth={2.5} />
                </div>
                <div style={{ color: cl.gray900, fontSize: '1rem', fontWeight: '700', marginBottom: '0.4rem' }}>Contraseña actualizada</div>
                <div style={{ color: cl.gray400, fontSize: '0.85rem' }}>Redirigiendo al login...</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); input:focus{border-color:#0F7BF4!important;box-shadow:0 0 0 3px #EBF3FF;outline:none;} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const lbl: React.CSSProperties = { color: '#475569', fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '0.45rem' }
const inp: React.CSSProperties = { width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '10px', padding: '0.8rem 1rem', color: '#1E293B', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }
