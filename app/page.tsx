'use client'
import { useState, useEffect } from 'react'

const MODULOS = [
  { icon: '🛡', label: 'Sistema PLD', desc: 'OFAC · SAT 69-B · ONU · UIF', color: '#3EE8A0' },
  { icon: '🏢', label: 'KYC Empresas', desc: 'Ekatena · Buró · CNBV', color: '#0891B2' },
  { icon: '📄', label: 'Term Sheets', desc: 'Bullet · Mensual · Trimestral', color: '#7C3AED' },
  { icon: '📝', label: 'Contratos', desc: 'Wizard · Word · Email', color: '#D97706' },
  { icon: '📊', label: 'SITI AA', desc: 'CNBV · LRITF · CUITF', color: '#059669' },
  { icon: '📋', label: 'CONDUSEF', desc: 'RECA · UNES · SIPRES', color: '#DC2626' },
]

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#050A14', fontFamily: "'DM Sans', -apple-system, sans-serif", color: 'white', overflow: 'hidden' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}} .mod-card{transition:all 0.2s} .mod-card:hover{transform:translateY(-4px)} .btn-primary{transition:all 0.2s} .btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(62,232,160,0.35)!important} .btn-sec:hover{border-color:rgba(255,255,255,0.3)!important;color:white!important}`}</style>
      <div style={{ position:'fixed', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize:'60px 60px', pointerEvents:'none' }} />
      <div style={{ position:'fixed', top:'-20%', left:'-10%', width:'600px', height:'600px', background:'radial-gradient(circle, rgba(62,232,160,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'-20%', right:'-10%', width:'500px', height:'500px', background:'radial-gradient(circle, rgba(8,145,178,0.07) 0%, transparent 70%)', pointerEvents:'none' }} />
      <nav style={{ position:'relative', zIndex:10, padding:'0 2rem', height:'64px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <span style={{ color:'#3EE8A0', fontWeight:'900', fontSize:'1.2rem', letterSpacing:'-0.03em' }}>crowd</span>
          <span style={{ color:'white', fontWeight:'900', fontSize:'1.2rem', letterSpacing:'-0.03em' }}>link</span>
          <div style={{ marginLeft:'0.5rem', background:'rgba(62,232,160,0.1)', border:'1px solid rgba(62,232,160,0.2)', borderRadius:'6px', padding:'0.15rem 0.5rem' }}>
            <span style={{ color:'#3EE8A0', fontSize:'0.62rem', fontWeight:'700', letterSpacing:'0.08em' }}>COMPLIANCE</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
          <a href="/faq" className="btn-sec" style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.82rem', fontWeight:'500', textDecoration:'none', padding:'0.5rem 1rem', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.1)', transition:'all 0.2s' }}>FAQ</a>
          <a href="/login" className="btn-primary" style={{ display:'flex', alignItems:'center', gap:'0.4rem', background:'linear-gradient(135deg, #3EE8A0, #0891B2)', color:'#050A14', textDecoration:'none', padding:'0.55rem 1.25rem', borderRadius:'9px', fontSize:'0.85rem', fontWeight:'700' }}>Iniciar sesión →</a>
        </div>
      </nav>
      <div style={{ position:'relative', zIndex:5, maxWidth:'900px', margin:'0 auto', padding:'5rem 2rem 4rem', textAlign:'center', animation: mounted ? 'fadeUp 0.6s ease forwards' : 'none' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', background:'rgba(62,232,160,0.08)', border:'1px solid rgba(62,232,160,0.2)', borderRadius:'20px', padding:'0.4rem 1rem', marginBottom:'2rem' }}>
          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#3EE8A0', animation:'pulse 2s infinite' }} />
          <span style={{ color:'#3EE8A0', fontSize:'0.72rem', fontWeight:'700', letterSpacing:'0.1em' }}>REGULADO POR LA CNBV · CASFIM 0065022</span>
        </div>
        <h1 style={{ fontSize:'clamp(2.5rem, 6vw, 4.5rem)', fontWeight:'900', lineHeight:1.05, letterSpacing:'-0.04em', marginBottom:'1.5rem' }}>
          Centro de operaciones<br />
          <span style={{ background:'linear-gradient(135deg, #3EE8A0 0%, #0891B2 50%, #7C3AED 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>regulatorio</span>{' '}de Crowdlink
        </h1>
        <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'clamp(0.95rem, 2vw, 1.1rem)', lineHeight:1.8, maxWidth:'640px', margin:'0 auto 2.5rem' }}>
          Plataforma interna para la gestión de cumplimiento normativo, KYC, contratos de adhesión, prevención de lavado de dinero y reportes regulatorios de PorCuanto, S.A. de C.V.
        </p>
        <div style={{ display:'flex', gap:'1rem', justifyContent:'center', flexWrap:'wrap', marginBottom:'4rem' }}>
          <a href="/login" className="btn-primary" style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'linear-gradient(135deg, #3EE8A0, #0891B2)', color:'#050A14', textDecoration:'none', padding:'0.85rem 2rem', borderRadius:'12px', fontSize:'0.95rem', fontWeight:'800', letterSpacing:'-0.01em', boxShadow:'0 4px 20px rgba(62,232,160,0.2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Iniciar sesión
          </a>
          <a href="/faq" className="btn-sec" style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'transparent', color:'rgba(255,255,255,0.6)', textDecoration:'none', padding:'0.85rem 2rem', borderRadius:'12px', fontSize:'0.95rem', fontWeight:'600', border:'1px solid rgba(255,255,255,0.12)', transition:'all 0.2s' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Ver guía de inversión
          </a>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'0.75rem', maxWidth:'720px', margin:'0 auto' }}>
          {MODULOS.map((m, i) => (
            <div key={i} className="mod-card" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'1.25rem', textAlign:'left' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.5rem' }}>
                <span style={{ fontSize:'1.1rem' }}>{m.icon}</span>
                <span style={{ color:'white', fontSize:'0.82rem', fontWeight:'600' }}>{m.label}</span>
              </div>
              <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.7rem', margin:0, lineHeight:1.5 }}>{m.desc}</p>
              <div style={{ marginTop:'0.75rem', height:'2px', borderRadius:'1px', background:`${m.color}30` }}>
                <div style={{ height:'100%', width:'60%', borderRadius:'1px', background:m.color, opacity:0.6 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position:'relative', zIndex:5, borderTop:'1px solid rgba(255,255,255,0.05)', borderBottom:'1px solid rgba(255,255,255,0.05)', margin:'2rem 0' }}>
        <div style={{ maxWidth:'900px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(4, 1fr)' }}>
          {[{val:'CASFIM 0065022',label:'Autorización CNBV',color:'#3EE8A0'},{val:'6',label:'Módulos activos',color:'#0891B2'},{val:'LRITF',label:'Marco regulatorio',color:'#7C3AED'},{val:'2FA',label:'Autenticación segura',color:'#D97706'}].map((s,i) => (
            <div key={i} style={{ padding:'1.5rem', textAlign:'center', borderRight: i<3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <p style={{ color:s.color, fontSize:'1rem', fontWeight:'800', margin:'0 0 0.25rem', letterSpacing:'-0.02em' }}>{s.val}</p>
              <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.7rem', margin:0 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position:'relative', zIndex:5, maxWidth:'900px', margin:'0 auto', padding:'2rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem' }}>
        <p style={{ color:'rgba(255,255,255,0.2)', fontSize:'0.72rem' }}>PorCuanto, S.A. de C.V. · Institución de Financiamiento Colectivo</p>
        <div style={{ display:'flex', gap:'1.5rem' }}>
          <a href="/faq" style={{ color:'rgba(255,255,255,0.2)', fontSize:'0.72rem', textDecoration:'none' }}>Guía de inversión</a>
          <a href="https://crowdlink.mx" target="_blank" rel="noreferrer" style={{ color:'rgba(255,255,255,0.2)', fontSize:'0.72rem', textDecoration:'none' }}>crowdlink.mx ↗</a>
        </div>
      </div>
    </div>
  )
}
