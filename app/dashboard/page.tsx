'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function DashboardPage() {
  const { isLoggedIn } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({ equipment: 0, scratch: 0, alarm: 0, maintenance: 0 })
  const [scratchList, setScratchList] = useState<any[]>([])
  const [equipByType, setEquipByType] = useState<any>({})
  const [equipByModel, setEquipByModel] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [clock, setClock] = useState('')

  useEffect(() => {
    if (!isLoggedIn) { router.push('/login'); return }
    fetchData()
    const t = setInterval(() => {
      const now = new Date()
      setClock(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`)
    }, 1000)
    return () => clearInterval(t)
  }, [isLoggedIn])

  async function fetchData() {
    setLoading(true)
    const [eq, sc, al, mn] = await Promise.all([
      supabase.from('equipment').select('*'),
      supabase.from('scratch').select('*').order('date', { ascending: false }).limit(8),
      supabase.from('alarm').select('*'),
      supabase.from('maintenance').select('*'),
    ])
    const eqData = eq.data || []
    setStats({
      equipment: eqData.length,
      scratch: sc.data?.length || 0,
      alarm: (al.data || []).reduce((s:number,r:any) => s + (r.punch_alarm||0) + (r.weld_alarm||0), 0),
      maintenance: mn.data?.length || 0,
    })
    setScratchList(sc.data || [])
    // by type
    const byType: any = {}
    eqData.forEach((e:any) => { byType[e.type] = (byType[e.type]||0)+1 })
    setEquipByType(byType)
    // by model
    const byModel: any = {}
    eqData.forEach((e:any) => { byModel[e.model] = (byModel[e.model]||0)+1 })
    setEquipByModel(byModel)
    setLoading(false)
  }

  const kpiCards = [
    { label: '관리 설비 수', value: stats.equipment, unit: '대', color: 'var(--accent-blue)', bg: 'var(--accent-blue-dim)' },
    { label: '찍힘 관리 건수', value: stats.scratch, unit: '건', color: 'var(--accent-green)', bg: 'var(--accent-green-dim)' },
    { label: '알람 발생 건수', value: stats.alarm, unit: '건', color: 'var(--accent-amber)', bg: 'var(--accent-amber-dim)' },
    { label: '정비이력 건수', value: stats.maintenance, unit: '건', color: 'var(--accent-teal)', bg: 'var(--accent-teal-dim)' },
  ]

  const typeColors: any = { '복합기': 'badge-blue', '융착기': 'badge-green', '펀칭기': 'badge-amber', '지그': 'badge-gray' }
  const actionColors: any = { '해당없음': 'badge-gray', '조치필요': 'badge-amber', '조치완료': 'badge-green' }

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>대시보드</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>후가공설비 현황을 한눈에 확인하세요</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              color: 'var(--text-muted)', background: 'var(--bg-card)',
              padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)'
            }}>{clock}</div>
            <button className="btn btn-ghost" onClick={fetchData}>↻ 새로고침</button>
            <button className="btn btn-primary" onClick={() => router.push('/maintenance')}>+ 정비이력 등록</button>
          </div>
        </div>

        <div className="content-area">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>데이터 로딩 중...</div>
          ) : (
            <>
              {/* KPI */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                {kpiCards.map(k => (
                  <div key={k.label} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: k.color, opacity: 0.8 }} />
                      </div>
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 30, fontWeight: 700, color: k.color, lineHeight: 1 }}>
                      {k.value}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Charts row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                {/* Type dist */}
                <div className="card">
                  <div className="section-title" style={{ marginBottom: 14 }}>설비 유형 분포</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(equipByType).map(([type, cnt]: any) => (
                      <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 60, textAlign: 'right', fontSize: 11, color: 'var(--text-secondary)' }}>{type}</div>
                        <div style={{ flex: 1, height: 12, background: 'var(--bg-surface)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(cnt/stats.equipment)*100}%`, background: 'var(--accent-blue)', borderRadius: 4 }} />
                        </div>
                        <div style={{ width: 24, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>{cnt}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Model dist */}
                <div className="card">
                  <div className="section-title" style={{ marginBottom: 14 }}>차종별 설비 분포</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(equipByModel).sort((a:any,b:any)=>b[1]-a[1]).map(([model, cnt]: any) => (
                      <div key={model} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, textAlign: 'right', fontSize: 11, color: 'var(--text-secondary)' }}>{model}</div>
                        <div style={{ flex: 1, height: 12, background: 'var(--bg-surface)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(cnt/stats.equipment)*100}%`, background: 'var(--accent-green)', borderRadius: 4 }} />
                        </div>
                        <div style={{ width: 24, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>{cnt}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent scratch */}
              <div className="card">
                <div className="section-header">
                  <div className="section-title">최근 찍힘 현황</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => router.push('/scratch')}>전체보기 →</button>
                </div>
                {scratchList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 12 }}>등록된 데이터가 없습니다</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>일자</th><th>오전/오후</th><th>차종</th><th>구분</th><th>찍힘부위</th><th>설비No</th><th>지그상태</th><th>설비문제</th><th>조치</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scratchList.map(r => (
                        <tr key={r.id}>
                          <td className="mono" style={{ fontSize: 11 }}>{r.date}</td>
                          <td>{r.time_of_day}</td>
                          <td><span className="badge badge-blue">{r.model}</span></td>
                          <td style={{ fontSize: 11 }}>{r.category}</td>
                          <td style={{ fontSize: 11 }}>{r.scratch_location}</td>
                          <td><span className="badge badge-gray">#{r.equipment_no}</span></td>
                          <td><span className={`badge ${r.jig_status === '양호' ? 'badge-green' : 'badge-red'}`}>{r.jig_status}</span></td>
                          <td><span className={`badge ${r.equipment_issue === '해당없음' ? 'badge-gray' : 'badge-amber'}`}>{r.equipment_issue}</span></td>
                          <td><span className={`badge ${actionColors[r.action] || 'badge-gray'}`}>{r.action}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
