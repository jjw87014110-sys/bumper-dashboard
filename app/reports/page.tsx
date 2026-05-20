'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRequireAuth } from '@/lib/auth'
import { useToast } from '@/lib/useToast'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

type ReportPeriod = 'week' | 'month'

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function ReportsPage() {
  useRequireAuth()
  const { showToast, ToastUI } = useToast()
  const today = new Date()
  const [period, setPeriod] = useState<ReportPeriod>('week')
  const [reportDate, setReportDate] = useState(toLocalDate(today))
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)

  // 히트맵용 데이터 (1년)
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({})
  const [heatmapLoading, setHeatmapLoading] = useState(true)
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<string|null>(null)

  useEffect(() => {
    fetchHeatmap()
  }, [])

  async function fetchHeatmap() {
    setHeatmapLoading(true)
    const oneYearAgo = new Date()
    oneYearAgo.setDate(oneYearAgo.getDate() - 365)
    const { data } = await supabase
      .from('alarm')
      .select('date, punch_alarm, weld_alarm')
      .gte('date', toLocalDate(oneYearAgo))
    const map: Record<string, number> = {}
    ;(data||[]).forEach((r: any) => {
      const total = (r.punch_alarm||0) + (r.weld_alarm||0)
      map[r.date] = (map[r.date]||0) + total
    })
    setHeatmapData(map)
    setHeatmapLoading(false)
  }

  async function generateReport() {
    setLoading(true)
    const endDate = new Date(reportDate)
    const startDate = new Date(endDate)
    if (period === 'week') startDate.setDate(startDate.getDate() - 6)
    else startDate.setDate(1)

    const startStr = toLocalDate(startDate)
    const endStr = toLocalDate(endDate)

    const [alarm, maint, scratch, equipment] = await Promise.all([
      supabase.from('alarm').select('*').gte('date', startStr).lte('date', endStr),
      supabase.from('maintenance').select('*').gte('date', startStr).lte('date', endStr),
      supabase.from('scratch').select('*').gte('date', startStr).lte('date', endStr),
      supabase.from('equipment').select('*'),
    ])

    const alarmData = alarm.data || []
    const maintData = maint.data || []
    const scratchData = scratch.data || []
    const eqData = equipment.data || []

    // 통계 계산
    const totalPunch = alarmData.reduce((s, r:any) => s + (r.punch_alarm||0), 0)
    const totalWeld = alarmData.reduce((s, r:any) => s + (r.weld_alarm||0), 0)

    // 설비별 알람 집계
    const alarmByEq: Record<number, { punch: number; weld: number; total: number }> = {}
    alarmData.forEach((r:any) => {
      if (!alarmByEq[r.equipment_no]) alarmByEq[r.equipment_no] = { punch: 0, weld: 0, total: 0 }
      alarmByEq[r.equipment_no].punch += r.punch_alarm||0
      alarmByEq[r.equipment_no].weld += r.weld_alarm||0
      alarmByEq[r.equipment_no].total += (r.punch_alarm||0) + (r.weld_alarm||0)
    })
    const topAlarms = Object.entries(alarmByEq)
      .map(([no, v]) => ({ no: Number(no), ...v, name: eqData.find((e:any)=>e.no===Number(no))?.name || '' }))
      .filter(e => e.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    // 정비 집계
    const maintByEq: Record<number, number> = {}
    maintData.forEach((r:any) => { maintByEq[r.equipment_no] = (maintByEq[r.equipment_no]||0) + 1 })

    setReportData({
      period,
      startDate: startStr,
      endDate: endStr,
      summary: {
        totalAlarms: totalPunch + totalWeld,
        totalPunch,
        totalWeld,
        totalMaintenance: maintData.length,
        totalScratch: scratchData.length,
        affectedEquipment: Object.keys(alarmByEq).length,
      },
      topAlarms,
      maintByEq,
      maintData,
      scratchData,
    })
    setLoading(false)
    showToast('보고서가 생성되었습니다')
  }

  function downloadReport() {
    if (!reportData) return
    const r = reportData
    let csv = `${period === 'week' ? '주간' : '월간'} 보고서\n`
    csv += `기간: ${r.startDate} ~ ${r.endDate}\n\n`
    csv += `[요약]\n`
    csv += `총 알람,${r.summary.totalAlarms}\n`
    csv += `펀칭 불량,${r.summary.totalPunch}\n`
    csv += `융착 불량,${r.summary.totalWeld}\n`
    csv += `정비 건수,${r.summary.totalMaintenance}\n`
    csv += `찍힘 건수,${r.summary.totalScratch}\n`
    csv += `영향 설비,${r.summary.affectedEquipment}대\n\n`
    csv += `[알람 TOP 10]\n`
    csv += `설비번호,설비명,펀칭,융착,합계\n`
    r.topAlarms.forEach((e: any) => {
      csv += `#${String(e.no).padStart(2,'0')},${e.name},${e.punch},${e.weld},${e.total}\n`
    })

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${period === 'week' ? 'weekly' : 'monthly'}_report_${r.endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('CSV가 다운로드되었습니다')
  }

  // 히트맵 데이터 (53주 x 7일)
  const heatmapCells = useMemo(() => {
    const cells: { date: string; count: number; col: number; row: number }[] = []
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 364)
    // 시작 요일에 맞춰 빈 셀
    const startWeekDay = start.getDay()
    let col = 0
    let row = startWeekDay
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = toLocalDate(d)
      cells.push({
        date: dateStr,
        count: heatmapData[dateStr] || 0,
        col,
        row,
      })
      row++
      if (row > 6) { row = 0; col++ }
    }
    return cells
  }, [heatmapData])

  const maxCount = Math.max(...Object.values(heatmapData), 1)
  function getHeatColor(count: number): string {
    if (count === 0) return 'var(--bg-hover)'
    const intensity = Math.min(count / maxCount, 1)
    if (intensity < 0.25) return 'rgba(59, 130, 246, 0.25)'
    if (intensity < 0.5) return 'rgba(59, 130, 246, 0.5)'
    if (intensity < 0.75) return 'rgba(59, 130, 246, 0.75)'
    return 'rgba(59, 130, 246, 1)'
  }

  // 월 라벨
  const monthLabels = useMemo(() => {
    const labels: { col: number; month: string }[] = []
    const seen = new Set<string>()
    heatmapCells.forEach(c => {
      const month = c.date.slice(0, 7)
      if (!seen.has(month) && c.row === 0) {
        seen.add(month)
        labels.push({ col: c.col, month: Number(month.slice(5)) + '월' })
      }
    })
    return labels
  }, [heatmapCells])

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Reports</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>주간/월간 보고서 및 데이터 히트맵</div>
          </div>
        </div>

        <div className="content-area">

          {/* 히트맵 캘린더 */}
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>📅 알람 히트맵 (최근 1년)</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>일별 알람 발생 강도 · 진할수록 알람 많음</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                적음
                <div style={{ width: 12, height: 12, background: 'var(--bg-hover)', borderRadius: 2 }} />
                <div style={{ width: 12, height: 12, background: 'rgba(59, 130, 246, 0.25)', borderRadius: 2 }} />
                <div style={{ width: 12, height: 12, background: 'rgba(59, 130, 246, 0.5)', borderRadius: 2 }} />
                <div style={{ width: 12, height: 12, background: 'rgba(59, 130, 246, 0.75)', borderRadius: 2 }} />
                <div style={{ width: 12, height: 12, background: 'rgba(59, 130, 246, 1)', borderRadius: 2 }} />
                많음
              </div>
            </div>
            {heatmapLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div>
            ) : (
              <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
                <svg width="780" height="120" style={{ display: 'block' }}>
                  {/* 월 라벨 */}
                  {monthLabels.map((m, i) => (
                    <text key={i} x={m.col * 13 + 30} y="12" fontSize="9" fill="var(--text-muted)">{m.month}</text>
                  ))}
                  {/* 요일 라벨 */}
                  {['일','','화','','목','','토'].map((d, i) => (
                    <text key={i} x="10" y={i * 13 + 28} fontSize="8" fill="var(--text-muted)">{d}</text>
                  ))}
                  {/* 셀들 */}
                  {heatmapCells.map((c, i) => (
                    <rect key={i}
                      x={c.col * 13 + 30}
                      y={c.row * 13 + 20}
                      width="11" height="11"
                      rx="2"
                      fill={getHeatColor(c.count)}
                      stroke={selectedHeatmapDay === c.date ? 'var(--accent-blue)' : 'none'}
                      strokeWidth="2"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedHeatmapDay(c.date)}
                    >
                      <title>{c.date}: {c.count}건</title>
                    </rect>
                  ))}
                </svg>
              </div>
            )}
            {selectedHeatmapDay && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><strong>{selectedHeatmapDay}</strong> · 알람 <strong style={{ color: 'var(--accent-blue)' }}>{heatmapData[selectedHeatmapDay] || 0}건</strong></span>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedHeatmapDay(null)}>닫기</button>
              </div>
            )}
          </div>

          {/* 보고서 생성 */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>📑 보고서 자동 생성</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>기간을 선택하면 자동으로 통계 생성</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className={`btn btn-sm ${period === 'week' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPeriod('week')}>주간 (7일)</button>
                  <button className={`btn btn-sm ${period === 'month' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPeriod('month')}>월간</button>
                </div>
                <input type="date" className="form-input" style={{ width: 140 }} value={reportDate} onChange={e => setReportDate(e.target.value)} />
                <button className="btn btn-primary btn-sm" onClick={generateReport} disabled={loading}>{loading ? '생성 중...' : '보고서 생성'}</button>
                {reportData && <button className="btn btn-ghost btn-sm" onClick={downloadReport}>📥 CSV</button>}
                {reportData && <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨️ 인쇄</button>}
              </div>
            </div>

            {reportData ? (
              <div>
                {/* 보고서 헤더 */}
                <div style={{ padding: '16px 20px', background: 'var(--accent-blue-dim)', borderRadius: 8, marginBottom: 16, borderLeft: '4px solid var(--accent-blue)' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {reportData.period === 'week' ? '주간' : '월간'} 보고서
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    기간: {reportData.startDate} ~ {reportData.endDate}
                  </div>
                </div>

                {/* 요약 KPI */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: '총 알람', value: reportData.summary.totalAlarms, color: 'var(--accent-amber)' },
                    { label: '펀칭불량', value: reportData.summary.totalPunch, color: 'var(--accent-red)' },
                    { label: '융착불량', value: reportData.summary.totalWeld, color: 'var(--accent-red)' },
                    { label: '정비건수', value: reportData.summary.totalMaintenance, color: 'var(--accent-blue)' },
                    { label: '찍힘건수', value: reportData.summary.totalScratch, color: 'var(--accent-purple)' },
                    { label: '영향설비', value: reportData.summary.affectedEquipment + '대', color: 'var(--accent-green)' },
                  ].map((kpi, i) => (
                    <div key={i} className="card" style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{kpi.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color, fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>{kpi.value}</div>
                    </div>
                  ))}
                </div>

                {/* 알람 TOP 10 */}
                {reportData.topAlarms.length > 0 ? (
                  <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>알람 발생 TOP 10</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>{['순위','설비번호','설비명','펀칭','융착','합계'].map(h => <th key={h} className="tbl-th">{h}</th>)}</tr></thead>
                      <tbody>
                        {reportData.topAlarms.map((e: any, i: number) => (
                          <tr key={e.no}>
                            <td className="tbl-td">{i+1}</td>
                            <td className="tbl-td">#{String(e.no).padStart(2,'0')}</td>
                            <td className="tbl-td">{e.name}</td>
                            <td className="tbl-td">{e.punch}</td>
                            <td className="tbl-td">{e.weld}</td>
                            <td className="tbl-td"><strong style={{ color: 'var(--accent-amber)' }}>{e.total}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state-pro">
                    <div className="empty-icon">📊</div>
                    <div className="empty-title">선택 기간에 알람이 없습니다</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state-pro">
                <div className="empty-icon">📋</div>
                <div className="empty-title">기간을 선택하고 "보고서 생성"을 클릭하세요</div>
                <div className="empty-desc">주간 또는 월간 통계가 자동으로 만들어집니다</div>
              </div>
            )}
          </div>

        </div>
      </div>
      <ToastUI />
    </div>
  )
}
