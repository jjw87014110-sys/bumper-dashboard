'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

function BarChart({ items, color, max }: { items: any[], color: string, max: number }) {
  const td: React.CSSProperties = { fontSize: 11, padding: '7px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }
  const th: React.CSSProperties = { fontSize: 10, padding: '7px 10px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', textAlign: 'left' as const }

  if (items.length === 0) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>데이터 없음</div>

  return (
    <div>
      {/* 바 차트 */}
      <div style={{ padding: '16px 16px 8px' }}>
        {items.map((item: any) => (
          <div key={item.no} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', width: 24, flexShrink: 0, fontFamily: 'JetBrains Mono, monospace' }}>#{String(item.no).padStart(2,'0')}</div>
            <div style={{ flex: 1, height: 20, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', width: `${(item.count/max)*100}%`, background: color, borderRadius: 4, transition: 'width 0.5s' }} />
              <div style={{ position: 'absolute', left: 8, top: 0, height: '100%', display: 'flex', alignItems: 'center', fontSize: 10, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '85%' }}>
                {item.name.length > 30 ? item.name.slice(0,30)+'…' : item.name}
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace', width: 28, textAlign: 'right', flexShrink: 0 }}>{item.count}</div>
          </div>
        ))}
      </div>
      {/* 테이블 */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={th}>순위</th>
          <th style={th}>No</th>
          <th style={th}>설비명</th>
          <th style={{ ...th, textAlign: 'right' as const }}>건수</th>
        </tr></thead>
        <tbody>{items.map((item: any, i: number) => (
          <tr key={item.no}>
            <td style={td}><span className="badge badge-gray">{i+1}</span></td>
            <td style={{ ...td, fontFamily: 'JetBrains Mono, monospace' }}>#{String(item.no).padStart(2,'0')}</td>
            <td style={td}>{item.name}</td>
            <td style={{ ...td, textAlign: 'right', fontWeight: 700, color }}>{item.count}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export default function AnalysisPage() {
  useAuth()
  const [loading, setLoading] = useState(true)
  const [scratchByEq, setScratchByEq] = useState<any[]>([])
  const [maintenanceByEq, setMaintenanceByEq] = useState<any[]>([])
  const [alarmByEq, setAlarmByEq] = useState<any[]>([])
  const [topN, setTopN] = useState(10)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [eqRes, alRes, mnRes, scRes] = await Promise.all([
      supabase.from('equipment').select('no, name'),
      supabase.from('alarm').select('equipment_no, punch_alarm, weld_alarm'),
      supabase.from('maintenance').select('equipment_no'),
      supabase.from('scratch').select('equipment_no'),
    ])
    const eqData = eqRes.data || []

    // 알람 집계
    const alarmMap: any = {}
    ;(alRes.data || []).forEach((r: any) => {
      alarmMap[r.equipment_no] = (alarmMap[r.equipment_no] || 0) + (r.punch_alarm||0) + (r.weld_alarm||0)
    })
    setAlarmByEq(eqData.filter((e: any) => alarmMap[e.no] > 0)
      .map((e: any) => ({ no: e.no, name: e.name, count: alarmMap[e.no] }))
      .sort((a: any, b: any) => b.count - a.count))

    // 정비 집계
    const mnMap: any = {}
    ;(mnRes.data || []).forEach((r: any) => { mnMap[r.equipment_no] = (mnMap[r.equipment_no]||0)+1 })
    setMaintenanceByEq(eqData.filter((e: any) => mnMap[e.no] > 0)
      .map((e: any) => ({ no: e.no, name: e.name, count: mnMap[e.no] }))
      .sort((a: any, b: any) => b.count - a.count))

    // 찍힘 집계
    const scMap: any = {}
    ;(scRes.data || []).forEach((r: any) => { scMap[r.equipment_no] = (scMap[r.equipment_no]||0)+1 })
    setScratchByEq(eqData.filter((e: any) => scMap[e.no] > 0)
      .map((e: any) => ({ no: e.no, name: e.name, count: scMap[e.no] }))
      .sort((a: any, b: any) => b.count - a.count))

    setLoading(false)
  }

  const scratchSlice = scratchByEq.slice(0, topN)
  const maintenanceSlice = maintenanceByEq.slice(0, topN)
  const alarmSlice = alarmByEq.slice(0, topN)

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Analysis</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>설비별 데이터 분석 현황</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>상위</span>
            {[5,10,15,20].map(n => (
              <button key={n} className={`btn btn-sm ${topN===n?'btn-primary':'btn-ghost'}`} onClick={() => setTopN(n)}>{n}</button>
            ))}
            <button className="btn btn-ghost" onClick={fetchData}>↻ 새로고침</button>
          </div>
        </div>

        <div className="content-area">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>로딩 중...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {/* 찍힘 현황 */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>설비별 찍힘 현황</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>총 {scratchByEq.length}개 설비</div>
                  </div>
                  <span className="badge badge-amber">{scratchByEq.reduce((s,r) => s+r.count, 0)}건</span>
                </div>
                <BarChart items={scratchSlice} color="var(--accent-amber)" max={scratchSlice[0]?.count || 1} />
              </div>

              {/* 정비 횟수 */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>설비별 정비 횟수</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>총 {maintenanceByEq.length}개 설비</div>
                  </div>
                  <span className="badge badge-teal">{maintenanceByEq.reduce((s,r) => s+r.count, 0)}건</span>
                </div>
                <BarChart items={maintenanceSlice} color="var(--accent-teal)" max={maintenanceSlice[0]?.count || 1} />
              </div>

              {/* 알람 횟수 */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>설비별 알람 횟수</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>융착+펀칭 합계 · {alarmByEq.length}개 설비</div>
                  </div>
                  <span className="badge badge-red">{alarmByEq.reduce((s,r) => s+r.count, 0)}건</span>
                </div>
                <BarChart items={alarmSlice} color="var(--accent-red)" max={alarmSlice[0]?.count || 1} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
