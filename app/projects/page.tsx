'use client'
import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/auth'
import { useToast } from '@/lib/useToast'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

type HistoryItem = { date: string; content: string }
type Project = {
  id: number
  title: string
  category: string | null
  car_model: string | null
  equipment_type: string | null
  status: string
  history: HistoryItem[]
  next_plan: HistoryItem[]
  start_date: string | null
  deadline: string | null
  completed_date: string | null
  updated_at: string
}

const CATEGORIES = ['후가공설비 개선', '신차 양산성 점검', '설비 이관/반출', '정기 점검', '전장검사', '기타']
const CAR_MODELS = ['SP3', 'SP2', 'OV1', 'AX', 'NQ', 'SK3', 'CK', '공통']
const EQ_TYPES = ['펀칭기', '융착기', '복합기', '지그', '대차', '기타']
const STATUSES = ['진행중', '완료', '보류']

const STATUS_COLORS: Record<string, string> = {
  '진행중': 'badge-blue',
  '완료': 'badge-green',
  '보류': 'badge-gray',
}

function getDday(deadline: string | null): { label: string; color: string } | null {
  if (!deadline) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const due = new Date(deadline); due.setHours(0,0,0,0)
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return { label: `D+${Math.abs(diff)}`, color: 'var(--accent-red)' }
  if (diff === 0) return { label: 'D-day', color: 'var(--accent-red)' }
  if (diff <= 7) return { label: `D-${diff}`, color: 'var(--accent-amber)' }
  return { label: `D-${diff}`, color: 'var(--text-muted)' }
}

// "6/7", "2026-06-07" 등 다양한 날짜 표기를 Date로 파싱
function parseFlexibleDate(s: string): Date | null {
  if (!s) return null
  const trimmed = s.trim()
  const now = new Date()
  let m = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  m = trimmed.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (m) {
    const month = Number(m[1]); const dayNum = Number(m[2])
    let year = now.getFullYear()
    if (now.getMonth() >= 10 && month <= 2) year++
    else if (now.getMonth() <= 1 && month >= 11) year--
    return new Date(year, month - 1, dayNum)
  }
  return null
}

// 날짜를 "N월 K주차" 라벨로 변환 (해당 월에서 몇 번째 주인지)
// 주의 기준: 월~일 (ISO 방식과 유사). 그 날짜가 속한 주의 월요일을 기준으로 월/주차 결정.
function getWeekLabel(s: string): string {
  const d = parseFlexibleDate(s)
  if (!d) return ''
  // 해당 날짜가 속한 주의 월요일 구하기
  const day = d.getDay() // 0=일, 1=월
  const diffToMon = day === 0 ? -6 : 1 - day
  const mon = new Date(d); mon.setDate(d.getDate() + diffToMon); mon.setHours(0,0,0,0)
  // "이 주의 월요일이 속한 달"을 기준으로 주차 계산
  const yyyy = mon.getFullYear()
  const mm = mon.getMonth()
  // 이 달의 1일이 속한 주의 월요일
  const firstOfMonth = new Date(yyyy, mm, 1)
  const firstDay = firstOfMonth.getDay()
  const firstDiffToMon = firstDay === 0 ? -6 : 1 - firstDay
  const firstMon = new Date(firstOfMonth); firstMon.setDate(firstOfMonth.getDate() + firstDiffToMon)
  const weekNum = Math.round((mon.getTime() - firstMon.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
  return `${mm + 1}월 ${weekNum}주차`
}

export default function ProjectsPage() {
  useRequireAuth()
  const { showToast, ToastUI } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('진행중')
  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState<Project | null>(null)
  const [undoItem, setUndoItem] = useState<Project | null>(null)
  const [showDoneArchive, setShowDoneArchive] = useState(false)
  const [form, setForm] = useState<any>({
    title: '', category: '', car_model: '', equipment_type: '',
    status: '진행중', history: [] as HistoryItem[], next_plan: [] as HistoryItem[],
    start_date: '', deadline: '', completed_date: '',
  })
  const [newHistDate, setNewHistDate] = useState('')
  const [newHistContent, setNewHistContent] = useState('')
  const [newPlanDate, setNewPlanDate] = useState('')
  const [newPlanContent, setNewPlanContent] = useState('')

  useEffect(() => { reload() }, [])

  async function reload() {
    setLoading(true)
    const { data } = await supabase.from('projects').select('*').order('updated_at', { ascending: false })
    setProjects((data as Project[]) || [])
    setLoading(false)
  }

  function openAdd() {
    setEditItem(null)
    setForm({
      title: '', category: '', car_model: '', equipment_type: '',
      status: '진행중', history: [], next_plan: [],
      start_date: new Date().toISOString().slice(0, 10), deadline: '', completed_date: '',
    })
    setNewHistDate(''); setNewHistContent('')
    setNewPlanDate(''); setNewPlanContent('')
    setModal(true)
  }

  function openEdit(p: Project) {
    setEditItem(p)
    setForm({
      title: p.title,
      category: p.category || '',
      car_model: p.car_model || '',
      equipment_type: p.equipment_type || '',
      status: p.status,
      history: Array.isArray(p.history) ? p.history : [],
      next_plan: Array.isArray(p.next_plan) ? p.next_plan : [],
      start_date: p.start_date || '',
      deadline: p.deadline || '',
      completed_date: p.completed_date || '',
    })
    setNewHistDate(''); setNewHistContent('')
    setNewPlanDate(''); setNewPlanContent('')
    setModal(true)
  }

  function addHistory() {
    if (!newHistDate.trim() || !newHistContent.trim()) return
    setForm({ ...form, history: [...form.history, { date: newHistDate.trim(), content: newHistContent.trim() }] })
    setNewHistDate(''); setNewHistContent('')
  }
  function removeHistory(idx: number) {
    setForm({ ...form, history: form.history.filter((_: any, i: number) => i !== idx) })
  }
  function addPlan() {
    if (!newPlanDate.trim() || !newPlanContent.trim()) return
    setForm({ ...form, next_plan: [...form.next_plan, { date: newPlanDate.trim(), content: newPlanContent.trim() }] })
    setNewPlanDate(''); setNewPlanContent('')
  }
  function removePlan(idx: number) {
    setForm({ ...form, next_plan: form.next_plan.filter((_: any, i: number) => i !== idx) })
  }

  async function handleSave() {
    if (!form.title.trim()) {
      showToast('프로젝트명을 입력하세요', 'error')
      return
    }
    const payload = {
      title: form.title.trim(),
      category: form.category || null,
      car_model: form.car_model || null,
      equipment_type: form.equipment_type || null,
      status: form.status,
      history: form.history,
      next_plan: form.next_plan,
      start_date: form.start_date || null,
      deadline: form.deadline || null,
      completed_date: form.completed_date || null,
      updated_at: new Date().toISOString(),
    }
    if (editItem) {
      const { error } = await supabase.from('projects').update(payload).eq('id', editItem.id)
      if (error) { showToast('수정 실패', 'error'); return }
      showToast('수정되었습니다')
    } else {
      const { error } = await supabase.from('projects').insert([payload])
      if (error) { showToast('등록 실패', 'error'); return }
      showToast('등록되었습니다')
    }
    setModal(false); reload()
  }

  async function handleDelete(p: Project) {
    // 즉시 화면에서 제거 (낙관적 업데이트)
    setProjects(prev => prev.filter(x => x.id !== p.id))
    setUndoItem(p)
    // 3초 후 실제 DB 삭제 (Undo 안 하면)
    const timer = setTimeout(async () => {
      await supabase.from('projects').delete().eq('id', p.id)
      setUndoItem(null)
    }, 5000)
    // Undo 함수를 토스트에 붙이기 위해 window에 임시 저장
    ;(window as any).__undoTimer = timer
    showToast('삭제되었습니다 — 5초 내 되돌리기 가능')
  }

  function handleUndo() {
    if (!undoItem) return
    clearTimeout((window as any).__undoTimer)
    setProjects(prev => [undoItem, ...prev].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()))
    setUndoItem(null)
    showToast('삭제가 취소되었습니다')
  }

  async function markCompleted(p: Project) {
    if (!confirm(`"${p.title}" 프로젝트를 완료 처리하시겠습니까?`)) return
    await supabase.from('projects').update({
      status: '완료',
      completed_date: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    }).eq('id', p.id)
    showToast('완료 처리되었습니다')
    reload()
  }

  // 완료 건은 최신 5개만 기본 표시, 아카이브 토글로 전체 보기
  const doneProjects = projects.filter(p => p.status === '완료')
  const filtered = filter === '전체' ? projects :
    filter === '완료' ? (showDoneArchive ? doneProjects : doneProjects.slice(0, 5)) :
    projects.filter(p => p.status === filter)
  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === '진행중').length,
    done: projects.filter(p => p.status === '완료').length,
    hold: projects.filter(p => p.status === '보류').length,
  }

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Projects</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>BPR 후가공설비 진행 중인 프로젝트 관리 (주간보고서 자동 생성용)</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>+ 신규 프로젝트</button>
          </div>
        </div>

        <div className="content-area">
          {/* 통계 카드 */}
          <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>전체</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{stats.total}</div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>진행중</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: 'var(--accent-blue)' }}>{stats.inProgress}</div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>완료</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: 'var(--accent-green)' }}>{stats.done}</div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>보류</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: 'var(--text-muted)' }}>{stats.hold}</div>
            </div>
          </div>

          {/* 필터 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {['진행중', '완료', '보류', '전체'].map(s => (
              <button
                key={s}
                className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(s)}
              >{s}</button>
            ))}
          </div>

          {/* 프로젝트 카드 리스트 */}
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>로딩 중...</div>
          ) : filtered.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>등록된 프로젝트가 없습니다</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>"+ 신규 프로젝트" 버튼으로 추가하세요</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
              {filtered.map(p => (
                <div key={p.id} className="card" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className={`badge ${STATUS_COLORS[p.status] || 'badge-gray'}`}>{p.status}</span>
                        {p.car_model && <span className="badge badge-gray" style={{ fontSize: 9 }}>{p.car_model}</span>}
                        {p.equipment_type && <span className="badge badge-amber" style={{ fontSize: 9 }}>{p.equipment_type}</span>}
                        {p.category && <span className="badge badge-purple" style={{ fontSize: 9 }}>{p.category}</span>}
                        {(() => { const dd = getDday(p.deadline); return dd ? <span style={{ fontSize: 10, fontWeight: 700, color: dd.color, marginLeft: 2 }}>{dd.label}</span> : null })()}
                      </div>
                      {p.deadline && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>📅 마감 {p.deadline}</div>}
                    </div>
                  </div>

                  {/* 진행 이력 */}
                  {p.history && p.history.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>📋 진행 이력</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                        {p.history.map((h, i) => {
                          const wk = getWeekLabel(h.date)
                          return (
                            <div key={i}>
                              <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{h.date}</span>
                              {wk && <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 4 }}>({wk})</span>}
                              <span style={{ color: 'var(--text-secondary)' }}> : {h.content}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 금주 계획 */}
                  {p.next_plan && p.next_plan.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>📅 금주 계획</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                        {p.next_plan.map((h, i) => {
                          const wk = getWeekLabel(h.date)
                          return (
                            <div key={i}>
                              <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{h.date}</span>
                              {wk && <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 4 }}>({wk})</span>}
                              <span style={{ color: 'var(--text-secondary)' }}> : {h.content}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 4, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => openEdit(p)} style={{ flex: 1 }}>수정</button>
                    {p.status !== '완료' && (
                      <button className="btn btn-sm btn-ghost" onClick={() => markCompleted(p)} style={{ flex: 1 }}>완료</button>
                    )}
                    <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(p)} style={{ color: 'var(--accent-red)' }}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 완료 탭에서 5개 이상이면 아카이브 더보기 버튼 */}
          {filter === '완료' && doneProjects.length > 5 && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDoneArchive(!showDoneArchive)}>
                {showDoneArchive ? `▲ 접기` : `▼ 완료 전체 보기 (${doneProjects.length}건)`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Undo 버튼 (삭제 후 5초간 표시) */}
      {undoItem && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, fontSize: 13,
        }}>
          <span>"{undoItem.title}" 삭제됨</span>
          <button className="btn btn-sm btn-primary" onClick={handleUndo}>되돌리기</button>
        </div>
      )}

      {/* 추가/수정 모달 */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ width: '90%', maxWidth: 720, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
              {editItem ? '프로젝트 수정' : '신규 프로젝트'}
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>프로젝트명 *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="예: SP3 RR L/PLATE 펀칭기 안착 개선" />
              </div>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>분류</label>
                  <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="">선택</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>차종</label>
                  <select className="form-input" value={form.car_model} onChange={e => setForm({ ...form, car_model: e.target.value })}>
                    <option value="">선택</option>
                    {CAR_MODELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>설비 유형</label>
                  <select className="form-input" value={form.equipment_type} onChange={e => setForm({ ...form, equipment_type: e.target.value })}>
                    <option value="">선택</option>
                    {EQ_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>상태</label>
                  <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>시작일</label>
                  <input type="date" className="form-input" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>마감일 (D-day 기준)</label>
                  <input type="date" className="form-input" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>완료일</label>
                  <input type="date" className="form-input" value={form.completed_date} onChange={e => setForm({ ...form, completed_date: e.target.value })} />
                </div>
              </div>

              {/* 진행 이력 입력 */}
              <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>📋 진행 이력</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <input className="form-input" placeholder="날짜 (예: 3/16)" style={{ width: 120 }} value={newHistDate} onChange={e => setNewHistDate(e.target.value)} />
                  <input className="form-input" placeholder="내용" style={{ flex: 1 }} value={newHistContent} onChange={e => setNewHistContent(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHistory()} />
                  <button className="btn btn-sm btn-primary" onClick={addHistory}>추가</button>
                </div>
                {form.history.length > 0 && (
                  <div style={{ marginTop: 6, padding: 8, background: 'var(--bg-card)', borderRadius: 6, fontSize: 11 }}>
                    {form.history.map((h: HistoryItem, i: number) => {
                      const wk = getWeekLabel(h.date)
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span>
                            <b style={{ color: 'var(--accent-blue)' }}>{h.date}</b>
                            {wk && <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 4 }}>({wk})</span>}
                            <span> : {h.content}</span>
                          </span>
                          <button onClick={() => removeHistory(i)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 11 }}>삭제</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 금주 계획 입력 */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>📅 금주 계획</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <input className="form-input" placeholder="날짜 (예: 5/28)" style={{ width: 120 }} value={newPlanDate} onChange={e => setNewPlanDate(e.target.value)} />
                  <input className="form-input" placeholder="내용" style={{ flex: 1 }} value={newPlanContent} onChange={e => setNewPlanContent(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPlan()} />
                  <button className="btn btn-sm btn-primary" onClick={addPlan}>추가</button>
                </div>
                {form.next_plan.length > 0 && (
                  <div style={{ marginTop: 6, padding: 8, background: 'var(--bg-card)', borderRadius: 6, fontSize: 11 }}>
                    {form.next_plan.map((h: HistoryItem, i: number) => {
                      const wk = getWeekLabel(h.date)
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span>
                            <b style={{ color: 'var(--accent-green)' }}>{h.date}</b>
                            {wk && <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 4 }}>({wk})</span>}
                            <span> : {h.content}</span>
                          </span>
                          <button onClick={() => removePlan(i)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 11 }}>삭제</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>취소</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>저장</button>
            </div>
          </div>
        </div>
      )}

      {ToastUI && <ToastUI />}
    </div>
  )
}
