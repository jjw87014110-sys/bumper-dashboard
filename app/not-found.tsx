import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg-base)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:64, fontWeight:700, color:'var(--accent-blue)', fontFamily:'JetBrains Mono, monospace' }}>404</div>
        <div style={{ fontSize:14, color:'var(--text-secondary)', marginBottom:20 }}>페이지를 찾을 수 없습니다</div>
        <Link href="/dashboard" style={{ padding:'8px 20px', borderRadius:6, background:'var(--accent-blue)', color:'white', fontSize:12, fontWeight:500, textDecoration:'none' }}>
          Dashboard로 이동
        </Link>
      </div>
    </div>
  )
}
