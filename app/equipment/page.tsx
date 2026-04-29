'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function EquipmentPage() {
  const { isLoggedIn } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ rr:'전체', type:'전체', model:'전체' })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: eq } = await supabase.from('equipment').select('*').order('no')
    setData(eq || [])
    setLoading(false)
  }

  const typeColors: any = { '복합기':'badge-blue','융착기':'badge-green','펀칭기':'badge-amber','지그':'badge-gray' }
  const rrColors: any = { 'RR':'badge-teal','FRT':'badge-blue' }

  const filtered = data.filter(d => {
    if (filter.rr !== '전체' && d.rr_frt !== filter.rr) return false
    if (filter.type !== '전체' && d.type !== filter.type) return false
    if (filter.model !== '전체' && d.model !== filter.model) return false
    return true
  })

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize:17, fontWeight:700 }}>설비 목록</div>
            <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>후가공설비 전체 목록 ({data.length}대)</div>
          </div>
        </div>

        <div className="content-area">
          {/* Filters */}
          <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ display:'flex', gap:4 }}>
              <span style={{ fontSize:11, color:'var(--text-muted)', lineHeight:'28px' }}>위치:</span>
              {['전체','RR','FRT'].map(v => <button key={v} className={`btn btn-sm ${filter.rr===v?'btn-primary':'btn-ghost'}`} onClick={()=>setFilter({...filter,rr:v})}>{v}</button>)}
            </div>
            <div style={{ display:'flex', gap:4 }}>
              <span style={{ fontSize:11, color:'var(--text-muted)', lineHeight:'28px' }}>유형:</span>
              {['전체','복합기','융착기','펀칭기','지그'].map(v => <button key={v} className={`btn btn-sm ${filter.type===v?'btn-primary':'btn-ghost'}`} onClick={()=>setFilter({...filter,type:v})}>{v}</button>)}
            </div>
            <div style={{ display:'flex', gap:4 }}>
              <span style={{ fontSize:11, color:'var(--text-muted)', lineHeight:'28px' }}>차종:</span>
              {['전체','OV1','SP2','SP3','NQ5'].map(v => <button key={v} className={`btn btn-sm ${filter.model===v?'btn-primary':'btn-ghost'}`} onClick={()=>setFilter({...filter,model:v})}>{v}</button>)}
            </div>
          </div>

          <div className="card">
            <div className="section-header">
              <div className="section-title">설비 목록 <span style={{ fontSize:12, fontWeight:400, color:'var(--text-muted)', marginLeft:6 }}>{filtered.length}대</span></div>
            </div>
            {loading ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)' }}>로딩 중...</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>NO</th><th>유형</th><th>위치</th><th>차종</th><th>라인</th><th>설비명</th><th>업체</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.no}>
                      <td className="mono" style={{ fontSize:12, color:'var(--text-muted)' }}>{String(r.no).padStart(2,'0')}</td>
                      <td><span className={`badge ${typeColors[r.type]||'badge-gray'}`}>{r.type}</span></td>
                      <td><span className={`badge ${rrColors[r.rr_frt]||'badge-gray'}`}>{r.rr_frt}</span></td>
                      <td><span className="badge badge-gray">{r.model}</span></td>
                      <td style={{ fontSize:11 }}>{r.location}</td>
                      <td style={{ fontSize:11, color:'var(--text-primary)', maxWidth:300 }}>{r.name}</td>
                      <td style={{ fontSize:11 }}>{r.vendor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
