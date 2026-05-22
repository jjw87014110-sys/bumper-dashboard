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
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)

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

  function getStatusInfo(status: string, currentTotal: number) {
    if (status === 'over') {
      const isAlreadyOver = currentTotal >= 64
      return { color: 'var(--accent-red)', bg: 'var(--accent-red-dim)', label: isAlreadyOver ? '한도 초과' : '초과 예상', icon: '⚠' }
    }
    if (status === 'warning') {
      return { color: 'var(--accent-amber)', bg: 'var(--accent-amber-dim)', label: currentTotal >= 52 ? '주의' : '주의 예상', icon: '⚡' }
    }
    return { color: 'var(--accent-green)', bg: 'var(--bg-card)', label: '정상', icon: '✓' }
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
          <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => changeWeek(-1)}>◀ 이전</button>
              <div style={{ padding: '6px 14px', background: 'var(--accent-blue-dim)', borderRadius: 6, fontFamily: 'Pretendard, sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--accent-blue)' }}>
                {weekStart} ~ {weekEnd}
                {weekStart === thisWeekStart && <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--accent-blue)', color: 'white', padding: '1px 6px', borderRadius: 4 }}>이번 주</span>}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => changeWeek(1)}>다음 ▶</button>
              <button className="btn btn-ghost btn-sm" onClick={() => changeWeek(0)}>이번 주</button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              💡 점심 1시간 일률 차감 / 야간 근무 자동 보정
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
                {staffStats.map(({ staff, currentTotal, daysWorked, daysRemaining, avgPerDay, predictedTotal, status }) => {
                  const info = getStatusInfo(status, currentTotal)
                  const progressPct = Math.min((currentTotal / 64) * 100, 100)
                  return (
                    <div
                      key={staff.name}
                      className="card"
                      style={{
                        padding: 16, cursor: 'pointer',
                        borderLeft: `4px solid ${info.color}`,
                        background: selectedStaff === staff.name ? 'var(--bg-hover)' : info.bg,
                      }}
                      onClick={() => setSelectedStaff(selectedStaff === staff.name ? null : staff.name)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700 }}>{staff.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{staff.team} · {staff.shift_pattern}</div>
                        </div>
                        <div style={{ fontSize: 11, color: info.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>{info.icon}</span>{info.label}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>현재 누계</div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: info.color, fontFamily: 'Pretendard, sans-serif' }}>
                            {currentTotal}<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>h</span>
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{daysWorked}일 근무</div>
                        </div>
                        {daysRemaining > 0 && (
                          <div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>주말 예상</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: predictedTotal >= 64 ? 'var(--accent-red)' : predictedTotal >= 52 ? 'var(--accent-amber)' : 'var(--text-primary)', fontFamily: 'Pretendard, sans-serif' }}>
                              {predictedTotal}<span style={{ fontSize: 10, color: 'var(--text-muted)' }}>h</span>
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>일평균 {avgPerDay}h × {daysRemaining}일</div>
                          </div>
                        )}
                      </div>

                      <div style={{ position: 'relative', height: 8, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', left: `${(52/64)*100}%`, top: 0, bottom: 0, width: 1, background: 'var(--accent-amber)', opacity: 0.5, zIndex: 2 }} />
                        <div style={{ height: '100%', width: `${progressPct}%`, background: info.color, transition: 'width 0.3s' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>
                        <span>0h</span>
                        <span style={{ color: 'var(--accent-amber)' }}>52h 주의</span>
                        <span style={{ color: 'var(--accent-red)' }}>64h 한도</span>
                      </div>

                      {status === 'over' && daysRemaining > 0 && currentTotal < 64 && (
                        <div style={{ marginTop: 10, padding: '6px 10px', background: 'var(--bg-card)', borderRadius: 4, fontSize: 10, color: 'var(--accent-red)' }}>
                          🚨 권고: 잔여 {daysRemaining}일 동안 일평균 {Math.max(0, ((64 - currentTotal) / daysRemaining)).toFixed(1)}h 이하 근무
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {selectedStaff && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{selectedStaff} 일별 상세</div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedStaff(null)}>닫기</button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['날짜', '요일', '공휴일', '출근', '퇴근', '근무시간', '주/야', '잔업'].map(h => <th key={h} className="tbl-th">{h}</th>)}</tr></thead>
                    <tbody>
                      {weekDates.map((d, i) => {
                        const rec = weekRecords.find(r => r.staff_name === selectedStaff && r.date === d)
                        return (
                          <tr key={d}>
                            <td className="tbl-td" style={{ fontFamily: 'Pretendard, sans-serif' }}>{d.slice(5)}</td>
                            <td className="tbl-td">{dayLabels[i]}</td>
                            <td className="tbl-td">{rec?.is_holiday ? <span className="badge badge-gray">공휴일</span> : ''}</td>
                            <td className="tbl-td" style={{ fontFamily: 'Pretendard, sans-serif' }}>{rec?.in_time || '-'}</td>
                            <td className="tbl-td" style={{ fontFamily: 'Pretendard, sans-serif' }}>{rec?.out_time || '-'}</td>
                            <td className="tbl-td" style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700 }}>
                              {rec?.work_hours ? `${rec.work_hours}h` : '-'}
                            </td>
                            <td className="tbl-td">{rec?.shift_type ? <span className={`badge ${rec.shift_type === '주간' ? 'badge-blue' : 'badge-purple'}`}>{rec.shift_type}</span> : '-'}</td>
                            <td className="tbl-td">{rec?.is_overtime ? <span style={{ color: 'var(--accent-red)' }}>●</span> : ''}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

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
