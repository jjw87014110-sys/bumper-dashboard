'use client'
import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { toLocalDate } from '@/lib/constants'

function BarChart({ items, color, max }: { items: any[], color: string, max: number }) {

  if (items.length === 0) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>데이터 없음</div>

  return (
    <div>
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
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th className="tbl-th">순위</th>
          <th className="tbl-th">No</th>
          <th className="tbl-th">설비명</th>
          <th className="tbl-th" style={{ textAlign: 'right' as const }}>건수</th>
        </tr></thead>
        <tbody>{items.map((item: any, i: number) => (
          <tr key={item.no}>
            <td className="tbl-td"><span className="badge badge-gray">{i+1}</span></td>
            <td className="tbl-td" style={{ fontFamily: 'JetBrains Mono, monospace' }}>#{String(item.no).padStart(2,'0')}</td>
            <td className="tbl-td">{item.name}</td>
            <td className="tbl-td" style={{ textAlign: 'right', fontWeight: 700, color }}>{item.count}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export default function AnalysisPage() {
  useRequireAuth()
  const [loading, setLoading] = useState(true)
  const [scratchByEq, setScratchByEq] = useState<any[]>([])
  const [maintenanceByEq, setMaintenanceByEq] = useState<any[]>([])
  const [alarmByEq, setAlarmByEq] = useState<any[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([])
  const [punchVsWeld, setPunchVsWeld] = useState({ punch: 0, weld: 0 })
  const [holderRanking, setHolderRanking] = useState<any[]>([])
  const [weekdayStats, setWeekdayStats] = useState<any[]>([])
  const [topN, setTopN] = useState(10)

  // 기간 설정 - 기본값: 최근 3개월
  const today = new Date()
  const threeMonthsAgo = new Date(today)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const [dateFrom, setDateFrom] = useState(toLocalDate(threeMonthsAgo))
  const [dateTo, setDateTo] = useState(toLocalDate(today))
  const [activePreset, setActivePreset] = useState('3개월')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
    const [eqRes, alRes, mnRes, scRes] = await Promise.all([
      supabase.from('equipment').select('no, name'),
      supabase.from('alarm').select('equipment_no, punch_alarm, weld_alarm, date, holder_no')
        .gte('date', dateFrom).lte('date', dateTo),
      supabase.from('maintenance').select('equipment_no, maintenance_date')
        .gte('maintenance_date', dateFrom).lte('maintenance_date', dateTo + 'T23:59:59'),
      supabase.from('scratch').select('equipment_no, date')
        .gte('date', dateFrom).lte('date', dateTo),
    ])
    const eqData = eqRes.data || []

    const alarmData = alRes.data || []
    const alarmMap: any = {}
    let totalPunch = 0, totalWeld = 0
    const monthMap: Record<string, { punch: number; weld: number }> = {}
    const holderMap: Record<string, number> = {}
    alarmData.forEach((r: any) => {
      alarmMap[r.equipment_no] = (alarmMap[r.equipment_no] || 0) + (r.punch_alarm||0) + (r.weld_alarm||0)
      totalPunch += (r.punch_alarm||0)
      totalWeld += (r.weld_alarm||0)
      // 월별 추이
      const month = (r.date||'').slice(0,7) // YYYY-MM
      if (month) {
        if (!monthMap[month]) monthMap[month] = { punch: 0, weld: 0 }
        monthMap[month].punch += (r.punch_alarm||0)
        monthMap[month].weld += (r.weld_alarm||0)
      }
      // 홀더별 불량
      if (r.holder_no && ((r.punch_alarm||0) + (r.weld_alarm||0) > 0)) {
        const key = `#${String(r.equipment_no).padStart(2,'0')} ${r.holder_no}`
        holderMap[key] = (holderMap[key]||0) + (r.punch_alarm||0) + (r.weld_alarm||0)
      }
    })
    setPunchVsWeld({ punch: totalPunch, weld: totalWeld })
    setMonthlyTrend(Object.entries(monthMap).sort((a,b) => a[0].localeCompare(b[0])).map(([month, v]) => ({ month, ...v, total: v.punch + v.weld })))
    setHolderRanking(Object.entries(holderMap).sort((a,b) => b[1] - a[1]).slice(0, 10).map(([label, count]) => ({ label, count })))
    // 요일별 불량
    const wdWeld: number[] = [0,0,0,0,0,0,0]
    const wdPunch: number[] = [0,0,0,0,0,0,0]
    const wdDays: number[] = [0,0,0,0,0,0,0]
    const allDatesSet = new Set<string>()
    alarmData.forEach((r: any) => { if (r.date) allDatesSet.add(r.date) })
    allDatesSet.forEach(d => { const wd = new Date(d+'T12:00:00').getDay(); const idx = wd===0?6:wd-1; wdDays[idx]++ })
    alarmData.forEach((r: any) => {
      if (!r.date) return
      const wd = new Date(r.date+'T12:00:00').getDay(); const idx = wd===0?6:wd-1
      if ((r.punch_alarm||0)<=50) wdPunch[idx]+=(r.punch_alarm||0)
      if ((r.weld_alarm||0)<=50) wdWeld[idx]+=(r.weld_alarm||0)
    })
    const wdNames = ['월','화','수','목','금','토','일']
    setWeekdayStats(wdNames.map((name,i) => ({ name, weld: wdDays[i]>0 ? Math.round(wdWeld[i]/wdDays[i]*10)/10 : 0, punch: wdDays[i]>0 ? Math.round(wdPunch[i]/wdDays[i]*10)/10 : 0 })))
    setAlarmByEq(eqData.filter((e: any) => alarmMap[e.no] > 0)
      .map((e: any) => ({ no: e.no, name: e.name, count: alarmMap[e.no] }))
      .sort((a: any, b: any) => b.count - a.count))

    const mnMap: any = {}
    ;(mnRes.data || []).forEach((r: any) => { mnMap[r.equipment_no] = (mnMap[r.equipment_no]||0)+1 })
    setMaintenanceByEq(eqData.filter((e: any) => mnMap[e.no] > 0)
      .map((e: any) => ({ no: e.no, name: e.name, count: mnMap[e.no] }))
      .sort((a: any, b: any) => b.count - a.count))

    const scMap: any = {}
    ;(scRes.data || []).forEach((r: any) => { scMap[r.equipment_no] = (scMap[r.equipment_no]||0)+1 })
    setScratchByEq(eqData.filter((e: any) => scMap[e.no] > 0)
      .map((e: any) => ({ no: e.no, name: e.name, count: scMap[e.no] }))
      .sort((a: any, b: any) => b.count - a.count))

    } catch { /* fetch 실패 시 무시 */ }
    setLoading(false)
  }

  function applyPreset(preset: string) {
    const now = new Date()
    const from = new Date(now)
    setActivePreset(preset)
    if (preset === '1주') from.setDate(from.getDate() - 7)
    else if (preset === '1개월') from.setMonth(from.getMonth() - 1)
    else if (preset === '3개월') from.setMonth(from.getMonth() - 3)
    else if (preset === '6개월') from.setMonth(from.getMonth() - 6)
    else if (preset === '1년') from.setFullYear(from.getFullYear() - 1)
    setDateFrom(toLocalDate(from))
    setDateTo(toLocalDate(now))
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
            <button className="btn btn-ghost" onClick={fetchData}>↻ 조회</button>
          </div>
        </div>

        <div className="content-area">
          {/* 기간 설정 */}
          <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>기간 설정</div>
              {/* 프리셋 */}
              <div style={{ display: 'flex', gap: 4 }}>
                {['1주','1개월','3개월','6개월','1년'].map(p => (
                  <button key={p} className={`btn btn-sm ${activePreset===p?'btn-primary':'btn-ghost'}`}
                    onClick={() => applyPreset(p)}>{p}</button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="date" className="form-input" style={{ padding: '5px 10px', fontSize: 12, width: 140 }}
                  value={dateFrom} onChange={e => { setDateFrom(e.target.value); setActivePreset('') }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>~</span>
                <input type="date" className="form-input" style={{ padding: '5px 10px', fontSize: 12, width: 140 }}
                  value={dateTo} onChange={e => { setDateTo(e.target.value); setActivePreset('') }} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={fetchData}>조회</button>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {dateFrom} ~ {dateTo}
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>로딩 중...</div>
          ) : (
            <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
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

            {/* 2행: 월별 추이 + 펀칭 vs 융착 + 홀더별 불량 TOP 10 */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginTop: 16 }}>
              {/* 월별 추이 차트 */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>월별 알람 추이</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>펀칭/융착 월별 발생 건수</div>
                </div>
                <div style={{ padding: 16 }}>
                  {monthlyTrend.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>데이터 없음</div>
                  ) : (
                    <div>
                      {/* 간단 바 차트 */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, marginBottom: 8 }}>
                        {monthlyTrend.map(m => {
                          const maxVal = Math.max(...monthlyTrend.map(t => t.total)) || 1
                          const punchH = (m.punch / maxVal) * 100
                          const weldH = (m.weld / maxVal) * 100
                          return (
                            <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{m.total}</div>
                              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <div style={{ height: Math.max(punchH, 2), background: 'var(--accent-blue)', borderRadius: '2px 2px 0 0', transition: 'height 0.3s' }} />
                                <div style={{ height: Math.max(weldH, 2), background: 'var(--accent-red)', borderRadius: '0 0 2px 2px', transition: 'height 0.3s' }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {monthlyTrend.map(m => (
                          <div key={m.month} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'var(--text-muted)' }}>{m.month.slice(5)}월</div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                          <div style={{ width: 10, height: 10, background: 'var(--accent-blue)', borderRadius: 2 }} />
                          <span style={{ color: 'var(--text-muted)' }}>펀칭</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                          <div style={{ width: 10, height: 10, background: 'var(--accent-red)', borderRadius: 2 }} />
                          <span style={{ color: 'var(--text-muted)' }}>융착</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 펀칭 vs 융착 비교 */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>펀칭 vs 융착</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>불량 유형 비교</div>
                </div>
                <div style={{ padding: 24, textAlign: 'center' }}>
                  {punchVsWeld.punch + punchVsWeld.weld === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>데이터 없음</div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                        <div style={{ width: `${(punchVsWeld.punch / (punchVsWeld.punch + punchVsWeld.weld)) * 100}%`, background: 'var(--accent-blue)', transition: 'width 0.5s' }} />
                        <div style={{ flex: 1, background: 'var(--accent-red)' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>펀칭불량</div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-blue)' }}>{punchVsWeld.punch}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{punchVsWeld.punch + punchVsWeld.weld > 0 ? Math.round((punchVsWeld.punch / (punchVsWeld.punch + punchVsWeld.weld)) * 100) : 0}%</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>융착불량</div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-red)' }}>{punchVsWeld.weld}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{punchVsWeld.punch + punchVsWeld.weld > 0 ? Math.round((punchVsWeld.weld / (punchVsWeld.punch + punchVsWeld.weld)) * 100) : 0}%</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 홀더별 불량 TOP 10 */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>홀더별 불량 TOP 10</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>어떤 홀더에서 불량이 많은지</div>
                </div>
                <div style={{ padding: '12px 16px' }}>
                  {holderRanking.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>데이터 없음</div>
                  ) : holderRanking.map((item, i) => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className="badge badge-gray" style={{ width: 20, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, height: 18, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ height: '100%', width: `${(item.count / holderRanking[0].count) * 100}%`, background: 'var(--accent-amber)', borderRadius: 4 }} />
                        <div style={{ position: 'absolute', left: 6, top: 0, height: '100%', display: 'flex', alignItems: 'center', fontSize: 9, color: 'var(--text-primary)' }}>{item.label}</div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-amber)', fontFamily: 'JetBrains Mono, monospace', width: 24, textAlign: 'right' }}>{item.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3행: 요일별 불량 + 인사이트 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
              {/* 요일별 불량 */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>📊 요일별 불량 (일평균)</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>어떤 요일에 불량이 많은지</div>
                </div>
                <div style={{ padding: 16 }}>
                  {weekdayStats.length === 0 ? (
                    <div className="empty-state">데이터 없음</div>
                  ) : (() => {
                    const maxWd = Math.max(...weekdayStats.map((d: any) => Math.max(d.weld, d.punch)), 1)
                    const peak = weekdayStats.reduce((a: any, b: any) => (a.weld + a.punch) > (b.weld + b.punch) ? a : b)
                    return weekdayStats.map((d: any) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ width: 16, fontSize: 11, color: d.name === peak.name ? 'var(--accent-red)' : 'var(--text-muted)', fontWeight: d.name === peak.name ? 700 : 400, textAlign: 'right' }}>{d.name}</span>
                        <div style={{ flex: 1, display: 'flex', gap: 2 }}>
                          <div style={{ height: 16, width: `${(d.weld/maxWd)*100}%`, background: 'var(--accent-red)', borderRadius: '3px 0 0 3px', minWidth: d.weld > 0 ? 4 : 0, display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
                            {d.weld > 0 && <span style={{ fontSize: 8, color: 'white', fontFamily: 'JetBrains Mono, monospace' }}>{d.weld}</span>}
                          </div>
                          <div style={{ height: 16, width: `${(d.punch/maxWd)*100}%`, background: 'var(--accent-blue)', borderRadius: '0 3px 3px 0', minWidth: d.punch > 0 ? 4 : 0, display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
                            {d.punch > 0 && <span style={{ fontSize: 8, color: 'white', fontFamily: 'JetBrains Mono, monospace' }}>{d.punch}</span>}
                          </div>
                        </div>
                        {d.name === peak.name && <span style={{ fontSize: 9 }}>🔥</span>}
                      </div>
                    ))
                  })()}
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, fontSize: 10, color: 'var(--text-muted)' }}>
                    <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--accent-red)', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />융착</span>
                    <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--accent-blue)', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />펀칭</span>
                  </div>
                </div>
              </div>

              {/* 인사이트 */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>🔍 AI 분석 인사이트</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>데이터 기반 자동 분석 결과</div>
                </div>
                <div style={{ padding: 16 }}>
                  {alarmByEq.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: 'var(--accent-red-dim)', color: 'var(--accent-red)', fontWeight: 600 }}>집중 관리</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        <strong style={{ color: 'var(--accent-amber)' }}>#{String(alarmByEq[0]?.no).padStart(2,'0')} 설비</strong>가 전체 알람의 <strong style={{ color: 'var(--accent-amber)' }}>{punchVsWeld.punch + punchVsWeld.weld > 0 ? Math.round(alarmByEq[0]?.count / (punchVsWeld.punch + punchVsWeld.weld) * 100) : 0}%</strong> 차지. 예방정비 주기 단축 검토 필요.
                      </div>
                    </div>
                  )}
                  {weekdayStats.length > 0 && (() => {
                    const peak = weekdayStats.reduce((a: any, b: any) => (a.weld + a.punch) > (b.weld + b.punch) ? a : b)
                    const avg = weekdayStats.reduce((s: number, d: any) => s + d.weld + d.punch, 0) / 7
                    return peak.weld + peak.punch > avg * 1.5 ? (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: 'var(--accent-amber-dim)', color: 'var(--accent-amber)', fontWeight: 600 }}>요일 패턴</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                          <strong style={{ color: 'var(--accent-amber)' }}>{peak.name}요일</strong> 불량이 다른 요일 대비 높음. 주간 피로 누적 또는 특정 생산 스케줄 확인 필요.
                        </div>
                      </div>
                    ) : null
                  })()}
                  {monthlyTrend.length >= 2 && (() => {
                    const first = monthlyTrend[0]
                    const last = monthlyTrend[monthlyTrend.length - 1]
                    const peak = monthlyTrend.reduce((a: any, b: any) => a.total > b.total ? a : b)
                    return (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)', fontWeight: 600 }}>월별 추이</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                          <strong style={{ color: 'var(--accent-amber)' }}>{peak.month.slice(5)}월</strong>이 가장 높음 ({peak.total}건). {last.total < peak.total ? '이후 감소 추세로 개선 중.' : '주의 관찰 필요.'}
                        </div>
                      </div>
                    )
                  })()}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: 'var(--accent-teal-dim)', color: 'var(--accent-teal)', fontWeight: 600 }}>환절기 주의</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      환절기(3~4월)는 일교차가 커 융착 품질에 영향. 공장 내부 온습도 관리와 설비 워밍업 시간 확보 권장.
                    </div>
                  </div>
                  {punchVsWeld.punch + punchVsWeld.weld > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: 'var(--accent-green-dim)', color: 'var(--accent-green)', fontWeight: 600 }}>불량 유형</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        융착 <strong style={{ color: 'var(--accent-red)' }}>{Math.round(punchVsWeld.weld / (punchVsWeld.punch + punchVsWeld.weld) * 100)}%</strong> vs 펀칭 <strong style={{ color: 'var(--accent-blue)' }}>{Math.round(punchVsWeld.punch / (punchVsWeld.punch + punchVsWeld.weld) * 100)}%</strong>. {punchVsWeld.weld > punchVsWeld.punch ? '융착 공정 개선이 전체 불량 감소에 효과적.' : '펀칭 공정 점검 우선.'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
