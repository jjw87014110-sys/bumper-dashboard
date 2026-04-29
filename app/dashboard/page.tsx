'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

// 아이마킹 일정: 2026-04-29 = 1번 설비 기준, 주말 제외, 31대 순환
const IMARKING_BASE_DATE = new Date('2026-04-29')
const IMARKING_BASE_EQ = 1
const TOTAL_EQ = 31

function getImarkingSchedule(date: Date): number {
  // 주말이면 null 반환 위해 0
  const day = date.getDay()
  if (day === 0 || day === 6) return 0

  // 평일만 카운트해서 몇 번째 평일인지 계산
  let weekdayCount = 0
  const d = new Date(IMARKING_BASE_DATE)
  const target = new Date(date)
  target.setHours(0,0,0,0)
  d.setHours(0,0,0,0)

  if (target < d) {
    // 과거
    let cur = new Date(target)
    while (cur < d) {
      const wd = cur.getDay()
      if (wd !== 0 && wd !== 6) weekdayCount--
      cur.setDate(cur.getDate() + 1)
    }
  } else {
    let cur = new Date(d)
    while (cur < target) {
      const wd = cur.getDay()
      if (wd !== 0 && wd !== 6) weekdayCount++
      cur.setDate(cur.getDate() + 1)
    }
  }

  let eqNo = ((IMARKING_BASE_EQ - 1 + weekdayCount) % TOTAL_EQ + TOTAL_EQ) % TOTAL_EQ + 1
  return eqNo
}

const DAILY_TODOS = ['변동점관리', '제품 융착관리', '찍힘 관리', '아이마킹', '정비이력 관리', '알람관리']

export default function DashboardPage() {
  useAuth()
  const [stats, setStats] = useState({ equipment: 0, alarm: 0, maintenance: 0, scratch: 0 })
  const [equipByType, setEquipByType] = useState<any>({})
  const [equipByModel, setEquipByModel] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [clock, setClock] = useState('')
  const [today] = useState(new Date())

  // 달력 상태
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  // TODO 체크 상태 (localStorage)
  const todayKey = today.toISOString().slice(0,10)
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  // 달력 커스텀 이벤트
  const [events, setEvents] = useState<Record<string, string[]>>({}) // { 'YYYY-MM-DD': ['이벤트명'] }
  const [eventModal, setEventModal] = useState(false)
  const [eventDate, setEventDate] = useState('')
  const [eventText, setEventText] = useState('')

  useEffect(() => {
    fetchData()
    const t = setInterval(() => {
      const now = new Date()
      setClock(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`)
    }, 1000)

    // localStorage 불러오기
    try {
      const saved = JSON.parse(localStorage.getItem('todo_' + todayKey) || '{}')
      setChecked(saved)
      const savedEvents = JSON.parse(localStorage.getItem('cal_events') || '{}')
      setEvents(savedEvents)
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
    const byModel: any = {}
    eqData.forEach((e: any) => { byModel[e.model] = (byModel[e.model]||0)+1 })
    setEquipByModel(byModel)
    setLoading(false)
  }

  function toggleTodo(item: string) {
    const next = { ...checked, [item]: !checked[item] }
    setChecked(next)
    localStorage.setItem('todo_' + todayKey, JSON.stringify(next))
  }

  // 달력 계산
  const firstDay = new Date(calYear, calMonth, 1)
  const lastDay = new Date(calYear, calMonth + 1, 0)
  const startWd = firstDay.getDay()
  const cells: (Date|null)[] = []
  for (let i = 0; i < startWd; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(calYear, calMonth, d))

  function addEvent() {
    if (!eventDate || !eventText.trim()) return
    const next = { ...events, [eventDate]: [...(events[eventDate]||[]), eventText.trim()] }
    setEvents(next)
    localStorage.setItem('cal_events', JSON.stringify(next))
    setEventModal(false)
    setEventText('')
  }

  function removeEvent(date: string, idx: number) {
    const arr = [...(events[date]||[])]
    arr.splice(idx, 1)
    const next = { ...events, [date]: arr }
    setEvents(next)
    localStorage.setItem('cal_events', JSON.stringify(next))
  }

  const kpiCards = [
    { label: '관리 설비', value: stats.equipment, unit: '대', color: 'var(--accent-blue)' },
    { label: '알람 건수', value: stats.alarm, unit: '건', color: 'var(--accent-amber)' },
    { label: '정비이력', value: stats.maintenance, unit: '건', color: 'var(--accent-teal)' },
    { label: '찍힘 건수', value: stats.scratch, unit: '건', color: 'var(--accent-green)' },
  ]

  const todayImarking = getImarkingSchedule(today)
  const doneCount = Object.values(checked).filter(Boolean).length

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>대시보드</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>후가공설비 관리 현황</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>{clock}</div>
            <button className="btn btn-ghost" onClick={fetchData}>↻ 새로고침</button>
          </div>
        </div>

        <div className="content-area">
          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            {kpiCards.map(k => (
              <div key={k.label} className="card" style={{ padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{k.label}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 700, color: k.color }}>{loading ? '-' : k.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{k.unit}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
            {/* 왼쪽: TO DO + 분포 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Daily TO DO */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Daily TO DO</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    <span style={{ color: doneCount === DAILY_TODOS.length ? 'var(--accent-green)' : 'var(--accent-amber)', fontWeight: 600 }}>{doneCount}</span>
                    /{DAILY_TODOS.length}
                  </div>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {DAILY_TODOS.map(item => (
                    <div key={item} onClick={() => toggleTodo(item)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                        border: `2px solid ${checked[item] ? 'var(--accent-green)' : 'var(--border-light)'}`,
                        background: checked[item] ? 'var(--accent-green)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {checked[item] && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 12, color: checked[item] ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: checked[item] ? 'line-through' : 'none', transition: 'all 0.15s' }}>
                        {item}
                        {item === '아이마킹' && todayImarking > 0 && (
                          <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--accent-blue)', background: 'var(--accent-blue-dim)', padding: '1px 6px', borderRadius: 10 }}>
                            #{String(todayImarking).padStart(2,'0')} 설비
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
                  <div style={{ height: 4, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(doneCount/DAILY_TODOS.length)*100}%`, background: doneCount === DAILY_TODOS.length ? 'var(--accent-green)' : 'var(--accent-blue)', borderRadius: 4, transition: 'width 0.3s' }} />
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

            {/* 오른쪽: 달력 */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* 달력 헤더 */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {calYear}년 {calMonth + 1}월
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(calYear, calMonth - 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()) }}>‹</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()) }}>오늘</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(calYear, calMonth + 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()) }}>›</button>
                  <button className="btn btn-primary btn-sm" onClick={() => { setEventDate(today.toISOString().slice(0,10)); setEventModal(true) }}>+ 일정 추가</button>
                </div>
              </div>

              {/* 요일 헤더 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--border)' }}>
                {['일','월','화','수','목','금','토'].map((d, i) => (
                  <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: i === 0 ? 'var(--accent-red)' : i === 6 ? 'var(--accent-blue)' : 'var(--text-muted)' }}>{d}</div>
                ))}
              </div>

              {/* 날짜 그리드 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
                {cells.map((date, idx) => {
                  if (!date) return <div key={idx} style={{ minHeight: 90, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }} />
                  const dateStr = date.toISOString().slice(0,10)
                  const isToday = dateStr === todayKey
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                  const imarkingEq = getImarkingSchedule(date)
                  const dayEvents = events[dateStr] || []
                  const wd = date.getDay()

                  return (
                    <div key={idx}
                      style={{ minHeight: 90, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '6px', background: isToday ? 'var(--accent-blue-dim)' : 'transparent', cursor: 'pointer' }}
                      onClick={() => { setEventDate(dateStr); setEventModal(true) }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{
                          fontSize: 12, fontWeight: isToday ? 700 : 400,
                          color: isToday ? 'var(--accent-blue)' : wd === 0 ? 'var(--accent-red)' : wd === 6 ? 'var(--accent-blue)' : 'var(--text-primary)',
                          background: isToday ? 'var(--accent-blue)' : 'transparent',
                          width: 22, height: 22, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{date.getDate()}</span>
                      </div>
                      {/* 아이마킹 일정 */}
                      {!isWeekend && imarkingEq > 0 && (
                        <div style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: 'var(--accent-teal-dim)', color: 'var(--accent-teal)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          아이마킹 #{String(imarkingEq).padStart(2,'0')}
                        </div>
                      )}
                      {/* 커스텀 이벤트 */}
                      {dayEvents.map((ev, i) => (
                        <div key={i} style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: 'var(--accent-amber-dim)', color: 'var(--accent-amber)', marginBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
                          onClick={e => { e.stopPropagation(); removeEvent(dateStr, i) }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev}</span>
                          <span style={{ flexShrink: 0, opacity: 0.6 }}>×</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>

              {/* 범례 */}
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16, fontSize: 10, color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-teal)' }} />
                  아이마킹 일정 (평일 순환)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-amber)' }} />
                  추가 일정 (클릭해서 삭제)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 일정 추가 모달 */}
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
                <input className="form-input" type="text" placeholder="일정 내용 입력..." value={eventText} onChange={e => setEventText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addEvent()} autoFocus />
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
