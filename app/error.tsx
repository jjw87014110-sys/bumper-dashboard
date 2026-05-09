'use client'
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg-base)' }}>
      <div style={{ textAlign:'center', maxWidth:400 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
        <div style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>오류가 발생했습니다</div>
        <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:20, lineHeight:1.6 }}>
          {error.message || '일시적인 문제가 발생했습니다. 다시 시도해주세요.'}
        </div>
        <button onClick={reset} style={{ padding:'8px 20px', borderRadius:6, border:'none', background:'var(--accent-blue)', color:'white', fontSize:12, fontWeight:500, cursor:'pointer' }}>
          다시 시도
        </button>
      </div>
    </div>
  )
}
