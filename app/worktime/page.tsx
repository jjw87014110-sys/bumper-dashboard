'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRequireAuth } from '@/lib/auth'
import { useToast } from '@/lib/useToast'
import { supabase } from '@/lib/supabase'
import { logAudit, getCurrentUserName } from '@/lib/auditLog'
import Sidebar from '@/components/Sidebar'
import { parseErpExcel, getWeekRange, predictWeeklyHours, WorktimeRecord } from '@/lib/worktimeParser'

interface Staff {
  id: number
  name: string
  team: string
  shift_pattern: string
  emp_no: string
}

// 원형 게이지 컴포넌트
function CircularGauge({ value, max, secondary, color }: { value: number; max: number; secondary?: number; color: string }) {
  const radius = 56
  const circ = 2 * Math.PI * radius
  const pct = Math.min(value / max, 1)
  const dash = circ * pct
  const secondaryAngle = secondary !== undefined ? (secondary / max) * 360 - 90 : null

  return (
    <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={radius} fill="none" stroke="var(--bg-hover)" strokeWidth="10" />
        <circle
          cx="65" cy="65" r={radius}
          fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        {secondaryAngle !== null && (
          <circle
            cx={65 + radius * Math.cos((secondaryAngle * Math.PI) / 180)}
            cy={65 + radius * Math.sin((secondaryAngle * Math.PI) / 180)}
            r="3.5"
            fill="var(--accent-amber)"
          />
        )}
      </svg>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.1 }}>{value.toFixed(1)}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>/ {max}h</div>
      </div>
    </div>
  )
}

export default function WorktimePage() {
  useRequireAuth()
  const { showToast, ToastUI } = useToast()

  const [staffList, setStaffList] = useState<Staff[]>([])
  const [allRecords, setAllRecords] = useState<WorktimeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadModal, setUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  const today = new Date()
  const { weekStart: thisWeekStart, weekEnd: thisWeekEnd } = getWeekRange(today)
  const [weekStart, setWeekStart] = useState(thisWeekStart)
  const [weekEnd, setWeekEnd] = useState(thisWeekEnd)
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [s, r] = await Promise.all([
      supabase.from('worktime_staff').select('*').order('id'),
      supabase.from('worktime_records').select('*').order('date'),
    ])
    setStaffList(s.data || [])
    setAllRecords(r.data || [])
    setLoading(false)
  }

  const weekRecords = useMemo(() =>
    allRecords.filter(r => r.date >= weekStart && r.date <= weekEnd),
    [allRecords, weekStart, weekEnd]
  )

  const staffStats = useMemo(() => {
    return staffList.map(s => {
      const recs = weekRecords.filter(r => r.staff_name === s.name)
      const pred = predictWeeklyHours(allRecords.filter(r => r.staff_name === s.name), weekStart, weekEnd)
      return { staff: s, records: recs, ...pred }
    })
  }, [staffList, weekRecords, allRecords, weekStart, weekEnd])

  function changeWeek(direction: -1 | 0 | 1) {
    setExpandedStaff(null)
    if (direction === 0) {
      setWeekStart(thisWeekStart)
      setWeekEnd(thisWeekEnd)
      return
    }
    const start = new Date(weekStart)
    start.setDate(start.getDate() + 7 * direction)
    const { weekStart: ws, weekEnd: we } = getWeekRange(start)
    setWeekStart(ws)
    setWeekEnd(we)
  }

  function handleFilesSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files || [])
    if (list.length === 0) return
    setFiles(list)
  }

  async function handleUpload() {
    if (files.length === 0) { showToast('파일을 선택해주세요', 'error'); return }
    setUploading(true)
    let totalSaved = 0
    let errors: string[] = []

    for (const file of files) {
      try {
        const records = await parseErpExcel(file, year, month)
        if (records.length === 0) {
          errors.push(`${file.name}: 데이터 없음`)
          continue
        }
        const { error } = await supabase
          .from('worktime_records')
          .upsert(records, { onConflict: 'staff_name,date' })
        if (error) {
          errors.push(`${file.name}: ${error.message}`)
        } else {
          totalSaved += records.length
        }
      } catch (e: any) {
        errors.push(`${file.name}: ${e.message}`)
      }
    }

    if (totalSaved > 0) {
      showToast(`${totalSaved}건 저장 완료${errors.length > 0 ? ' (일부 오류)' : ''}`)
      logAudit(getCurrentUserName(), 'CREATE', 'worktime_records', `근무시간 ${totalSaved}건 등록`)
      setUploadModal(false)
      setFiles([])
      fetchAll()
    }
    if (errors.length > 0) {
      alert(`처리 중 오류:\n${errors.join('\n')}`)
    }
    setUploading(false)
  }

  function getStatusInfo(status: string, currentTotal: number, predictedTotal: number) {
    if (status === 'over') {
      const alreadyOver = currentTotal >= 64
      return {
        color: 'var(--accent-red)',
        bg: 'var(--accent-red-dim)',
        label: alreadyOver ? '위험 · 초과' : '위험',
        icon: '🔥',
      }
    }
    if (status === 'warning') {
      return {
        color: 'var(--accent-amber)',
        bg: 'var(--accent-amber-dim)',
        label: '주의',
        icon: '⚠',
      }
    }
    return {
      color: 'var(--accent-green)',
      bg: 'var(--accent-green-dim, rgba(34,197,94,0.1))',
      label: '정상',
      icon: '✓',
    }
  }

  const dayLabels = ['월', '화', '수', '목', '금', '토', '일']
  const weekDates = useMemo(() => {
    const dates: string[] = []
    const d = new Date(weekStart)
    for (let i = 0; i < 7; i++) {
      const x = new Date(d)
      x.setDate(d.getDate() + i)
      dates.push(`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`)
    }
    return dates
  }, [weekStart])

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Worktime</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>보전반 근무시간 관리 · 주 52h 주의 / 64h 한도</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setUploadModal(true)}>+ ERP 파일 업로드</button>
          </div>
        </div>

        <div className="content-area">
          {/* 주차 선택 */}
          <div className="card" style={{
            padding: '14px 18px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            border: '1.5px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => changeWeek(-1)}>◀ 이전</button>
              <div style={{ padding: '6px 14px', background: 'var(--accent-blue-dim)', borderRadius: 6, fontSize: 13, fontWeight: 700, color: 'var(--accent-blue)' }}>
                {weekStart} ~ {weekEnd}
                {weekStart === thisWeekStart && <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--accent-blue)', color: 'white', padding: '1px 6px', borderRadius: 4 }}>이번 주</span>}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => changeWeek(1)}>다음 ▶</button>
              <button className="btn btn-ghost btn-sm" onClick={() => changeWeek(0)}>이번 주</button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              💡 카드 클릭 시 일별 상세 표시
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div>
          ) : (
            <>
              {/* 4명 원형 게이지 카드 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
                {staffStats.map(({ staff, currentTotal, daysWorked, daysRemaining, avgPerDay, predictedTotal, status }) => {
                  const info = getStatusInfo(status, currentTotal, predictedTotal)
                  const isExpanded = expandedStaff === staff.name
                  const recommendedHours = daysRemaining > 0 ? Math.max(0, (64 - currentTotal) / daysRemaining) : 0

                  return (
                    <div key={staff.name}>
                      <div
                        className="card"
                        style={{
                          padding: 20,
                          cursor: 'pointer',
                          border: `1.5px solid ${isExpanded ? info.color : 'var(--border)'}`,
                          borderLeft: `5px solid ${info.color}`,
                          borderRadius: 10,
                          boxShadow: isExpanded ? `0 6px 20px ${info.bg}, 0 2px 4px rgba(0,0,0,0.04)` : '0 2px 8px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s ease',
                          transform: isExpanded ? 'translateY(-1px)' : 'translateY(0)',
                          position: 'relative',
                        }}
                        onClick={() => setExpandedStaff(isExpanded ? null : staff.name)}
                        onMouseEnter={(e) => {
                          if (!isExpanded) {
                            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                            ;(e.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px ${info.bg}, 0 2px 4px rgba(0,0,0,0.04)`
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded) {
                            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                            ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
                          }
                        }}
                      >
                        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                          {/* 좌측: 원형 게이지 */}
                          <div style={{ paddingRight: 20, borderRight: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <CircularGauge value={currentTotal} max={64} secondary={52} color={info.color} />
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>
                              현재 누계 / 한도
                            </div>
                          </div>

                          {/* 우측 정보 */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                  <div style={{ fontSize: 17, fontWeight: 700 }}>{staff.name}</div>
                                  <span style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 5,
                                    background: staff.team === 'B반' ? 'var(--accent-blue)' : 'var(--accent-purple)',
                                    color: 'white',
                                    letterSpacing: 0.5,
                                  }}>
                                    {staff.team}
                                  </span>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{staff.shift_pattern}</div>
                              </div>
                              <div style={{ background: info.bg, color: info.color, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', border: `1px solid ${info.color}` }}>
                                {info.icon} {info.label}
                              </div>
                            </div>

                            {/* 주말 예상 박스 */}
                            <div style={{
                              background: info.bg,
                              padding: '11px 14px',
                              borderRadius: 8,
                              marginTop: 12, marginBottom: 10,
                              border: `1.5px solid ${info.color}`,
                            }}>
                              <div style={{ fontSize: 11, color: info.color, fontWeight: 700, marginBottom: 3 }}>📅 주말까지 예상</div>
                              <div style={{ fontSize: 22, fontWeight: 700, color: info.color }}>
                                {predictedTotal.toFixed(1)}<span style={{ fontSize: 13 }}>h</span>
                                {status === 'over' && (
                                  <span style={{ fontSize: 12, marginLeft: 8, fontWeight: 700 }}>
                                    {currentTotal >= 64 ? '· 한도 초과' : `· ↑ +${(predictedTotal - 64).toFixed(1)}h`}
                                  </span>
                                )}
                                {status === 'warning' && (
                                  <span style={{ fontSize: 12, marginLeft: 8, fontWeight: 700 }}>· 52h 초과</span>
                                )}
                                {status === 'normal' && (
                                  <span style={{ fontSize: 12, marginLeft: 8, fontWeight: 700 }}>· 정상 페이스</span>
                                )}
                              </div>
                            </div>

                            {/* 권고 / 여유 */}
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: 'var(--bg-hover)', borderRadius: 6 }}>
                              {status === 'over' && currentTotal < 64 && daysRemaining > 0 ? (
                                <>
                                  <span style={{ fontSize: 13 }}>💡</span>
                                  <span>잔여 {daysRemaining}일 · 일평균 <strong style={{ color: info.color }}>{recommendedHours.toFixed(1)}h 이하</strong> 권고</span>
                                </>
                              ) : status === 'warning' ? (
                                <>
                                  <span style={{ fontSize: 13 }}>✓</span>
                                  <span>64h 한도까지 <strong style={{ color: 'var(--accent-green)' }}>{(64 - predictedTotal).toFixed(1)}h 여유</strong></span>
                                </>
                              ) : status === 'normal' ? (
                                <>
                                  <span style={{ fontSize: 13 }}>✓</span>
                                  <span>52h까지 <strong style={{ color: 'var(--accent-green)' }}>{Math.max(0, 52 - predictedTotal).toFixed(1)}h 여유</strong></span>
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize: 13 }}>⚠</span>
                                  <span>이미 64h 한도 초과 · 즉시 조치 필요</span>
                                </>
                              )}
                            </div>

                            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                              <div style={{ padding: '6px 8px', background: 'var(--bg-hover)', borderRadius: 5, textAlign: 'center' }}>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>근무일</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {daysWorked}<span style={{ fontSize: 10, color: 'var(--text-muted)' }}>일</span>
                                </div>
                              </div>
                              <div style={{ padding: '6px 8px', background: 'var(--bg-hover)', borderRadius: 5, textAlign: 'center' }}>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>일평균</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {avgPerDay.toFixed(1)}<span style={{ fontSize: 10, color: 'var(--text-muted)' }}>h</span>
                                </div>
                              </div>
                              <div style={{ padding: '6px 8px', background: 'var(--bg-hover)', borderRadius: 5, textAlign: 'center' }}>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>잔여</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: daysRemaining > 0 ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                                  {daysRemaining}<span style={{ fontSize: 10, color: 'var(--text-muted)' }}>일</span>
                                </div>
                              </div>
                            </div>
                            <div style={{ marginTop: 8, textAlign: 'right', fontSize: 11, color: 'var(--accent-blue)', fontWeight: 600 }}>
                              {isExpanded ? '▲ 상세 닫기' : '▼ 일별 상세 보기'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 일별 상세 (펼치기) */}
                      {isExpanded && (
                        <div className="card" style={{
                          padding: 0,
                          overflow: 'hidden',
                          marginTop: 4,
                          border: `1.5px solid ${info.color}`,
                          borderLeft: `5px solid ${info.color}`,
                          borderRadius: 10,
                          boxShadow: `0 4px 12px ${info.bg}, 0 2px 4px rgba(0,0,0,0.04)`,
                        }}>
                          <div style={{
                            padding: '11px 16px',
                            borderBottom: `1px solid ${info.color}`,
                            background: info.bg,
                            fontSize: 12,
                            fontWeight: 700,
                            color: info.color,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}>
                            <span>📋 {staff.name} · 일별 출퇴근 상세</span>
                            <span style={{ fontSize: 10, opacity: 0.8 }}>{weekStart} ~ {weekEnd}</span>
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead><tr>{['날짜', '요일', '공휴일', '출근', '퇴근', '근무시간', '주/야', '잔업'].map(h => <th key={h} className="tbl-th" style={{ fontSize: 11 }}>{h}</th>)}</tr></thead>
                            <tbody>
                              {weekDates.map((d, i) => {
                                const rec = weekRecords.find(r => r.staff_name === staff.name && r.date === d)
                                const isWeekend = i === 5 || i === 6
                                return (
                                  <tr key={d} style={{ background: isWeekend ? 'var(--bg-hover)' : 'transparent', opacity: rec?.work_hours ? 1 : 0.6 }}>
                                    <td className="tbl-td">{d.slice(5)}</td>
                                    <td className="tbl-td" style={{ color: isWeekend ? 'var(--accent-red)' : 'inherit' }}>{dayLabels[i]}</td>
                                    <td className="tbl-td">{rec?.is_holiday ? <span className="badge badge-gray">공휴일</span> : ''}</td>
                                    <td className="tbl-td">{rec?.in_time || '-'}</td>
                                    <td className="tbl-td">{rec?.out_time || '-'}</td>
                                    <td className="tbl-td" style={{ fontWeight: 700, color: (rec?.work_hours || 0) >= 11 ? 'var(--accent-red)' : (rec?.work_hours || 0) >= 10 ? 'var(--accent-amber)' : 'inherit' }}>
                                      {rec?.work_hours ? `${rec.work_hours.toFixed(1)}h` : '-'}
                                    </td>
                                    <td className="tbl-td">{rec?.shift_type ? <span className={`badge ${rec.shift_type === '주간' ? 'badge-blue' : 'badge-purple'}`}>{rec.shift_type}</span> : '-'}</td>
                                    <td className="tbl-td">{rec?.is_overtime ? <span style={{ color: 'var(--accent-red)', fontSize: 12 }}>●</span> : ''}</td>
                                  </tr>
                                )
                              })}
                              {/* 합계 행 */}
                              <tr style={{ background: 'var(--bg-hover)', fontWeight: 700 }}>
                                <td className="tbl-td" colSpan={5} style={{ textAlign: 'right' }}>주간 합계</td>
                                <td className="tbl-td" style={{ fontWeight: 700, color: currentTotal >= 64 ? 'var(--accent-red)' : currentTotal >= 52 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
                                  {currentTotal.toFixed(1)}h
                                </td>
                                <td className="tbl-td" colSpan={2}>{daysWorked}일 근무</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {staffStats.every(s => s.currentTotal === 0) && (
                <div className="empty-state-pro">
                  <div className="empty-icon">📊</div>
                  <div className="empty-title">이번 주 근무 데이터가 없습니다</div>
                  <div className="empty-desc">"+ ERP 파일 업로드"로 데이터를 등록하세요</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {uploadModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !uploading && setUploadModal(false)}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div className="modal-title">ERP 파일 업로드</div>
              <button className="modal-close" onClick={() => !uploading && setUploadModal(false)}>×</button>
            </div>

            <div style={{ padding: '8px 0' }}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">연도</label>
                  <select className="form-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                    {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}년</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">월</label>
                  <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                    {Array.from({length:12}, (_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">ERP 파일 (.xls / .xlsx / .html) — 4명 한번에 선택</label>
                <input
                  type="file"
                  accept=".xls,.xlsx,.html,.htm"
                  multiple
                  onChange={handleFilesSelect}
                  style={{ fontSize: 12, padding: 8, border: '1px dashed var(--border)', borderRadius: 4, width: '100%' }}
                />
              </div>

              {files.length > 0 && (
                <div style={{ marginTop: 10, padding: 10, background: 'var(--bg-hover)', borderRadius: 6, fontSize: 11 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>선택된 파일 ({files.length}개)</div>
                  {files.map((f, i) => (
                    <div key={i} style={{ color: 'var(--text-secondary)', padding: '2px 0' }}>
                      📄 {f.name} ({(f.size/1024).toFixed(1)} KB)
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 14, padding: 10, background: 'var(--accent-blue-dim)', borderRadius: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                <div style={{ fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 4 }}>💡 처리 안내</div>
                <div>• 지원 형식: <strong>HTML (권장)</strong>, .xls, .xlsx</div>
                <div>• 같은 날짜 데이터는 덮어쓰기됩니다</div>
                <div>• 점심시간 1시간 자동 차감</div>
                <div>• 출근만 있고 퇴근 없는 경우 미입력 처리</div>
                <div>• 파일명에 이름이 포함되면 자동 인식 (예: 5월_이동주.html)</div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setUploadModal(false)} disabled={uploading}>취소</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || files.length === 0}>
                {uploading ? '처리 중...' : `${files.length}개 파일 업로드`}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastUI />
    </div>
  )
}
