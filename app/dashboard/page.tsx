'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

const IMARKING_BASE_DATE = new Date('2026-04-29')
const IMARKING_BASE_EQ = 1
const TOTAL_EQ = 31

function toLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function getImarkingSchedule(date: Date): number {
  const day = date.getDay()
  if (day === 0 || day === 6) return 0
  let weekdayCount = 0
  const d = new Date(IMARKING_BASE_DATE)
  const target = new Date(date)
  target.setHours(0,0,0,0)
  d.setHours(0,0,0,0)
  if (target < d) {
    const cur = new Date(target)
    while (cur < d) {
      if (cur.getDay() !== 0 && cur.getDay() !== 6) weekdayCount--
      cur.setDate(cur.getDate() + 1)
    }
  } else {
    const cur = new Date(d)
    while (cur < target) {
      if (cur.getDay() !== 0 && cur.getDay() !== 6) weekdayCount++
      cur.setDate(cur.getDate() + 1)
    }
  }
  return ((IMARKING_BASE_EQ - 1 + weekdayCount) % TOTAL_EQ + TOTAL_EQ) % TOTAL_EQ + 1
}

const DAILY_TODOS = [
  { key: '변동점관리', label: '변동점관리', regular: true },
  { key: '제품융착관리', label: '제품 융착관리', regular: true },
  { key: '찍힘관리', label: '찍힘 관리', regular: true },
  { key: '아이마킹', label: '아이마킹', regular: false },
  { key: '정비이력관리', label: '정비이력 관리', regular: true },
  { key: '알람관리', label: '알람관리', regular: true },
]
const REGULAR_TODOS = DAILY_TODOS.filter(t => t.regular).map(t => t.label)

export default function DashboardPage() {
  useAuth()
  const [stats, setStats] = useState({ equipment: 0, alarm: 0, maintenance: 0, scratch: 0 })
  const [equipByType, setEquipByType] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [clock, setClock] = useState('')
  const [today] = useState(new Date())
  const todayKey = toLocalDate(today)

  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  // 오늘 날짜 기준 checked 상태만 관리
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [customTodos, setCustomTodos] = useState<string[]>([]) // 오늘 달력에서 추가된 할일
  const [customChecked, setCustomChecked] = useState<Record<string, boolean>>({})

  const [events, setEvents] = useState<Record<string, string[]>>({})
  const [completedDates, setCompletedDates] = useState<Record<string, string[]>>({})

  const [eventModal, setEventModal] = useState(false)
  const [eventDate, setEventDate] = useState('')
  const [eventText, setEventText] = useState('')

  useEffect(() => {
    fetchData()
    const t = setInterval(() => {
      const now = new Date()
      setClock(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`)
    }, 1000)
    try {
      // 오늘 날짜 키로만 불러오기
      const saved = JSON.parse(localStorage.getItem('todo_' + todayKey) || '{}')
      setChecked(saved)
      const savedEvents = JSON.parse(localStorage.getItem('cal_events') || '{}')
      setEvents(savedEvents)
      const savedCompleted = JSON.parse(localStorage.getItem('cal_completed') || '{}')
      setCompletedDates(savedCompleted)
      // 오늘의 커스텀 할일
      const savedCustomTodos = JSON.parse(localStorage.getItem('cal_custom_todos') || '{}')
      setCustomTodos(savedCustomTodos[todayKey] || [])
      const savedCustomChecked = JSON.parse(localStorage.getItem('custom_checked_' + todayKey) || '{}')
      setCustomChecked(savedCustomChecked)
    } catch {}
    return () => clearInterval(t)
  }, [])

  async function fetchData() {
    setLoading(true)
    const [eq, al, mn, sc] = await Promise.all([
      supabase.from('equipment').select('*'),
      supabase.from('alarm').select('punch_alarm, weld_alarm'),
      supabase.from('maintenance').select('id'),
      supabase.from('scratch').select('id'),
    ])
    const eqData = eq.data || []
    setStats({
      equipment: eqData.length,
      alarm: (al.data || []).reduce((s: number, r: any) => s + (r.punch_alarm||0) + (r.weld_alarm||0), 0),
      maintenance: mn.data?.length || 0,
      scratch: sc.data?.length || 0,
    })
    const byType: any = {}
    eqData.forEach((e: any) => { byType[e.type] = (byType[e.type]||0)+1 })
    setEquipByType(byType)
    setLoading(false)
  }

  function toggleTodo(item: typeof DAILY_TODOS[0]) {
    const next = { ...checked, [item.key]: !checked[item.key] }
    setChecked(next)
    localStorage.setItem('todo_' + todayKey, JSON.stringify(next))
    updateCompleted(item.label, !checked[item.key])

    // 아이마킹 체크 시 imarking DB에 자동 등록
    if (item.key === '아이마킹' && !checked[item.key]) {
      const eqNo = getImarkingSchedule(today)
      if (eqNo > 0) {
        supabase.from('imarking').insert([{
          equipment_no: eqNo,
          change_date: todayKey,
          category: '점검',
          mode: '아이마킹',
          unit: '점검완료',
          value: 1,
          note: 'Daily TO DO 체크로 자동 등록',
        }]).then(() => {})
      }
    }
  }

  function toggleCustomTodo(label: string) {
    const next = { ...customChecked, [label]: !customChecked[label] }
    setCustomChecked(next)
    localStorage.setItem('custom_checked_' + todayKey, JSON.stringify(next))
    updateCompleted(label, !customChecked[label])
  }

  function updateCompleted(label: string, isDone: boolean) {
    const savedCompleted = JSON.parse(localStorage.getItem('cal_completed') || '{}')
    const todayCompleted: string[] = [...(savedCompleted[todayKey] || [])]
    if (isDone) {
      if (!todayCompleted.includes(label)) todayCompleted.push(label)
    } else {
      const idx = todayCompleted.indexOf(label)
      if (idx > -1) todayCompleted.splice(idx, 1)
    }
    const nextCompleted = { ...savedCompleted, [todayKey]: todayCompleted }
    setCompletedDates(nextCompleted)
    localStorage.setItem('cal_completed', JSON.stringify(nextCompleted))
  }

  function addEvent() {
    if (!eventDate || !eventText.trim()) return
    const trimmed = eventText.trim()
    const next = { ...events, [eventDate]: [...(events[eventDate]||[]), trimmed] }
    setEvents(next)
    localStorage.setItem('cal_events', JSON.stringify(next))
    // 해당 날짜 customTodos에 추가
    const savedCustomTodos = JSON.parse(localStorage.getItem('cal_custom_todos') || '{}')
    const dayTodos: string[] = savedCustomTodos[eventDate] || []
    if (!dayTodos.includes(trimmed)) dayTodos.push(trimmed)
    const nextCustom = { ...savedCustomTodos, [eventDate]: dayTodos }
    localStorage.setItem('cal_custom_todos', JSON.stringify(nextCustom))
    // 오늘 날짜면 customTodos 상태 업데이트
    if (eventDate === todayKey) setCustomTodos(dayTodos)
    setEventModal(false)
    setEventText('')
  }

  function removeEvent(date: string, idx: number) {
    const arr = [...(events[date]||[])]
    const removed = arr[idx]
    arr.splice(idx, 1)
    const next = { ...events, [date]: arr }
    setEvents(next)
    localStorage.setItem('cal_events', JSON.stringify(next))
    // customTodos에서도 제거
    const savedCustomTodos = JSON.parse(localStorage.getItem('cal_custom_todos') || '{}')
    const dayTodos: string[] = savedCustomTodos[date] || []
    const tidx = dayTodos.indexOf(removed)
    if (tidx > -1) dayTodos.splice(tidx, 1)
    const nextCustom = { ...savedCustomTodos, [date]: dayTodos }
    localStorage.setItem('cal_custom_todos', JSON.stringify(nextCustom))
    if (date === todayKey) setCustomTodos(dayTodos)
    // completed에서도 제거
    const savedCompleted = JSON.parse(localStorage.getItem('cal_completed') || '{}')
    const dayCompleted: string[] = savedCompleted[date] || []
    const cidx = dayCompleted.indexOf(removed)
    if (cidx > -1) dayCompleted.splice(cidx, 1)
    const nextCompleted = { ...savedCompleted, [date]: dayCompleted }
    setCompletedDates(nextCompleted)
    localStorage.setItem('cal_completed', JSON.stringify(nextCompleted))
  }

  const firstDay = new Date(calYear, calMonth, 1)
  const lastDay = new Date(calYear, calMonth + 1, 0)
  const startWd = firstDay.getDay()
  const cells: (Date|null)[] = []
  for (let i = 0; i < startWd; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(calYear, calMonth, d))

  // 오늘 기준 checked만 카운트
  const doneCount = DAILY_TODOS.filter(t => checked[t.key]).length
    + customTodos.filter(t => customChecked[t]).length
  const totalCount = DAILY_TODOS.length + customTodos.length
  const todayImarking = getImarkingSchedule(today)

  const kpiCards = [
    { label: '관리 설비', value: stats.equipment, unit: '대', color: 'var(--accent-blue)' },
    { label: '알람 건수', value: stats.alarm, unit: '건', color: 'var(--accent-amber)' },
    { label: '정비이력', value: stats.maintenance, unit: '건', color: 'var(--accent-teal)' },
    { label: '찍힘 건수', value: stats.scratch, unit: '건', color: 'var(--accent-green)' },
  ]

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Dashboard</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>후가공설비 관리 현황</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>{clock}</div>
            <button className="btn btn-ghost" onClick={fetchData}>↻ 새로고침</button>
          </div>
        </div>

        <div className="content-area">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            {kpiCards.map(k => (
              <div key={k.label} className="card" style={{ padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{k.label}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 700, color: k.color }}>{loading ? '-' : k.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{k.unit}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Daily TO DO */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Daily TO DO</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    <span style={{ color: doneCount === totalCount ? 'var(--accent-green)' : 'var(--accent-amber)', fontWeight: 600 }}>{doneCount}</span>/{totalCount}
                  </div>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {DAILY_TODOS.map(item => (
                    <div key={item.key} onClick={() => toggleTodo(item)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, border: `2px solid ${checked[item.key] ? 'var(--accent-green)' : 'var(--border-light)'}`, background: checked[item.key] ? 'var(--accent-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        {checked[item.key] && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 12, color: checked[item.key] ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: checked[item.key] ? 'line-through' : 'none', transition: 'all 0.15s' }}>
                        {item.label}
                        {item.key === '아이마킹' && todayImarking > 0 && (
                          <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--accent-blue)', background: 'var(--accent-blue-dim)', padding: '1px 6px', borderRadius: 10 }}>
                            #{String(todayImarking).padStart(2,'0')} 설비
                          </span>
                        )}
                        {item.regular && <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: 8 }}>정기</span>}
                      </span>
                    </div>
                  ))}
                  {/* 오늘 달력에서 추가된 할일 */}
                  {customTodos.map(label => (
                    <div key={label} onClick={() => toggleCustomTodo(label)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', transition: 'background 0.15s', borderTop: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, border: `2px solid ${customChecked[label] ? 'var(--accent-amber)' : 'var(--border-light)'}`, background: customChecked[label] ? 'var(--accent-amber)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        {customChecked[label] && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 12, color: customChecked[label] ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: customChecked[label] ? 'line-through' : 'none' }}>
                        {label}
                        <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--accent-amber)', background: 'var(--accent-amber-dim)', padding: '1px 5px', borderRadius: 8 }}>추가</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
                  <div style={{ height: 4, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${totalCount > 0 ? (doneCount/totalCount)*100 : 0}%`, background: doneCount === totalCount && totalCount > 0 ? 'var(--accent-green)' : 'var(--accent-blue)', borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>

              {/* 설비 유형 분포 */}
              <div className="card">
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>설비 유형 분포</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(equipByType).map(([type, cnt]: any) => (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 48, fontSize: 11, color: 'var(--text-secondary)' }}>{type}</div>
                      <div style={{ flex: 1, height: 10, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(cnt/stats.equipment)*100}%`, background: 'var(--accent-blue)', borderRadius: 4 }} />
                      </div>
                      <div style={{ width: 20, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', textAlign: 'right' }}>{cnt}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 달력 */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{calYear}년 {calMonth + 1}월</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(calYear, calMonth - 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()) }}>‹</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()) }}>오늘</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(calYear, calMonth + 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()) }}>›</button>
                  <button className="btn btn-primary btn-sm" onClick={() => { setEventDate(todayKey); setEventModal(true) }}>+ 일정 추가</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--border)' }}>
                {['일','월','화','수','목','금','토'].map((d, i) => (
                  <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: i === 0 ? 'var(--accent-red)' : i === 6 ? 'var(--accent-teal)' : 'var(--text-muted)' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
                {cells.map((date, idx) => {
                  if (!date) return <div key={idx} style={{ minHeight: 100, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }} />
                  const dateStr = toLocalDate(date)
                  const isToday = dateStr === todayKey
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                  const imarkingEq = getImarkingSchedule(date)
                  const dayEvents = events[dateStr] || []
                  const dayCompleted = completedDates[dateStr] || []
                  const wd = date.getDay()

                  return (
                    <div key={idx}
                      style={{ minHeight: 100, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '6px', background: isToday ? 'var(--accent-blue-dim)' : 'transparent', cursor: 'pointer' }}
                      onClick={() => { setEventDate(dateStr); setEventModal(true) }}
                    >
                      <div style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? 'white' : wd === 0 ? 'var(--accent-red)' : wd === 6 ? 'var(--accent-teal)' : 'var(--text-primary)', background: isToday ? 'var(--accent-blue)' : 'transparent', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          {date.getDate()}
                        </span>
                      </div>
                      {/* 아이마킹 */}
                      {!isWeekend && imarkingEq > 0 && (
                        <div style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: dayCompleted.includes('아이마킹') ? 'var(--accent-green-dim)' : 'var(--accent-teal-dim)', color: dayCompleted.includes('아이마킹') ? 'var(--accent-green)' : 'var(--accent-teal)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {dayCompleted.includes('아이마킹') ? '✓ ' : ''}i-Marking #{String(imarkingEq).padStart(2,'0')}
                        </div>
                      )}
                      {/* 정기업무 */}
                      {!isWeekend && (
                        <div style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: REGULAR_TODOS.every(t => dayCompleted.includes(t)) ? 'var(--accent-green-dim)' : 'var(--bg-hover)', color: REGULAR_TODOS.every(t => dayCompleted.includes(t)) ? 'var(--accent-green)' : 'var(--text-muted)', marginBottom: 2 }}>
                          {REGULAR_TODOS.every(t => dayCompleted.includes(t)) ? '✓ 정기업무 완료' : '정기업무'}
                        </div>
                      )}
                      {/* 커스텀 이벤트 */}
                      {dayEvents.map((ev, i) => {
                        const isDone = dayCompleted.includes(ev)
                        return (
                          <div key={i} style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: isDone ? 'var(--accent-green-dim)' : 'var(--accent-amber-dim)', color: isDone ? 'var(--accent-green)' : 'var(--accent-amber)', marginBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
                            onClick={e => { e.stopPropagation(); removeEvent(dateStr, i) }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isDone ? '✓ ' : ''}{ev}</span>
                            <span style={{ flexShrink: 0, opacity: 0.6 }}>×</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16, fontSize: 10, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-teal)' }} />아이마킹 일정</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--bg-hover)', border: '1px solid var(--border)' }} />정기업무</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-green)' }} />완료</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-amber)' }} />추가 일정 (×클릭 삭제)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {eventModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEventModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">일정 추가</div>
              <button className="modal-close" onClick={() => setEventModal(false)}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">날짜</label>
                <input className="form-input" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">내용</label>
                <input className="form-input" type="text" placeholder="일정 내용 입력..." value={eventText} onChange={e => setEventText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEvent()} autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEventModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={addEvent}>추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
