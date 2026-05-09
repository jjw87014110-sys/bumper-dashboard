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
    while (cur < d) { if (cur.getDay()!==0&&cur.getDay()!==6) weekdayCount--; cur.setDate(cur.getDate()+1) }
  } else {
    const cur = new Date(d)
    while (cur < target) { if (cur.getDay()!==0&&cur.getDay()!==6) weekdayCount++; cur.setDate(cur.getDate()+1) }
  }
  return ((IMARKING_BASE_EQ-1+weekdayCount)%TOTAL_EQ+TOTAL_EQ)%TOTAL_EQ+1
}

const KR_HOLIDAYS: Record<string, string> = {
  '2026-01-01':'신정','2026-01-28':'설날 연휴','2026-01-29':'설날','2026-01-30':'설날 연휴',
  '2026-03-01':'삼일절','2026-05-01':'근로자의 날','2026-05-05':'어린이날',
  '2026-05-15':'부처님 오신 날','2026-06-06':'현충일','2026-08-15':'광복절',
  '2026-09-24':'추석 연휴','2026-09-25':'추석','2026-09-26':'추석 연휴',
  '2026-10-03':'개천절','2026-10-09':'한글날','2026-12-25':'크리스마스',
}

function getTomorrowInfo(): { isOff: boolean; reason: string } {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate()+1)
  const s = toLocalDate(tomorrow)
  const wd = tomorrow.getDay()
  if (wd===0) return { isOff: true, reason: '일요일' }
  if (wd===6) return { isOff: true, reason: '토요일' }
  if (KR_HOLIDAYS[s]) return { isOff: true, reason: KR_HOLIDAYS[s] }
  return { isOff: false, reason: '' }
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

  // 선택된 날짜 (TO DO 표시 기준)
  const [selectedDate, setSelectedDate] = useState(todayKey)

  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [customTodos, setCustomTodos] = useState<string[]>([])
  const [customChecked, setCustomChecked] = useState<Record<string, boolean>>({})
  const [events, setEvents] = useState<Record<string, string[]>>({})
  const [completedDates, setCompletedDates] = useState<Record<string, string[]>>({})
  const [eventModal, setEventModal] = useState(false)
  const [eventDate, setEventDate] = useState('')
  const [eventText, setEventText] = useState('')

  // 폭죽
  const [showFireworks, setShowFireworks] = useState(false)
  const tomorrowInfo = getTomorrowInfo()

  useEffect(() => {
    fetchData()
    const t = setInterval(() => {
      const now = new Date()
      setClock(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`)
    }, 1000)
    try {
      const savedEvents = JSON.parse(localStorage.getItem('cal_events') || '{}')
      setEvents(savedEvents)
      const savedCompleted = JSON.parse(localStorage.getItem('cal_completed') || '{}')
      setCompletedDates(savedCompleted)
      loadTodoForDate(todayKey)
      // DB에서 캘린더 이벤트 로드 (localStorage보다 우선)
      supabase.from('calendar_events').select('*').then(({ data }) => {
        if (data && data.length > 0) {
          const dbEvents: Record<string, string[]> = {}
          data.forEach((r: any) => {
            if (!dbEvents[r.date]) dbEvents[r.date] = []
            dbEvents[r.date].push(r.label)
          })
          setEvents(dbEvents)
          localStorage.setItem('cal_events', JSON.stringify(dbEvents))
        }
      })
    } catch {}

    // 폭죽 효과
    if (tomorrowInfo.isOff) {
      setTimeout(() => startFireworks(), 800)
    }

    return () => clearInterval(t)
  }, [])

  function loadTodoForDate(dateKey: string) {
    supabase.from('todo_checks').select('*').eq('date', dateKey).then(({ data, error }) => {
      if (!error && data && data.length > 0) {
        const newChecked: Record<string, boolean> = {}
        const newCustom: string[] = []
        const newCustomChecked: Record<string, boolean> = {}
        data.forEach((r: any) => {
          if (r.is_custom) {
            if (!newCustom.includes(r.todo_key)) newCustom.push(r.todo_key)
            if (r.checked) newCustomChecked[r.todo_key] = true
          } else {
            if (r.checked) newChecked[r.todo_key] = true
          }
        })
        setChecked(newChecked)
        setCustomTodos(newCustom)
        setCustomChecked(newCustomChecked)
      } else {
        try {
          const saved = JSON.parse(localStorage.getItem('todo_' + dateKey) || '{}')
          setChecked(saved)
          const savedCustomTodos = JSON.parse(localStorage.getItem('cal_custom_todos') || '{}')
          setCustomTodos(savedCustomTodos[dateKey] || [])
          const savedCustomChecked = JSON.parse(localStorage.getItem('custom_checked_' + dateKey) || '{}')
          setCustomChecked(savedCustomChecked)
        } catch {}
      }
    })
  }

  function handleCalendarDateClick(dateStr: string) {
    setSelectedDate(dateStr)
    loadTodoForDate(dateStr)
    // 일정 추가는 상단 버튼으로만 → 날짜 클릭 시 TO DO만 변경
  }

  async function fetchData() {
    setLoading(true)
    const [eq, al, mn, sc] = await Promise.all([
      supabase.from('equipment').select('*'),
      supabase.from('alarm').select('punch_alarm, weld_alarm, date').gte('date', `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`),
      supabase.from('maintenance').select('id'),
      supabase.from('scratch').select('id'),
    ])
    const eqData = eq.data || []
    setStats({
      equipment: eqData.length,
      alarm: (al.data||[]).filter((r:any)=>(r.punch_alarm||0)+(r.weld_alarm||0)>0).length,
      maintenance: mn.data?.length||0,
      scratch: sc.data?.length||0,
    })
    const byType: any = {}
    eqData.forEach((e:any) => { byType[e.type]=(byType[e.type]||0)+1 })
    setEquipByType(byType)
    setLoading(false)
  }

  function toggleTodo(item: typeof DAILY_TODOS[0]) {
    if (selectedDate !== todayKey) return
    const next = { ...checked, [item.key]: !checked[item.key] }
    setChecked(next)
    localStorage.setItem('todo_' + todayKey, JSON.stringify(next))
    // DB에 upsert
    supabase.from('todo_checks').upsert({ date: todayKey, todo_key: item.key, is_custom: false, checked: !checked[item.key], updated_at: new Date().toISOString() }, { onConflict: 'date,todo_key' }).then(() => {})
    updateCompleted(item.label, !checked[item.key], todayKey)
    if (item.key === '아이마킹' && !checked[item.key]) {
      const eqNo = getImarkingSchedule(today)
      if (eqNo>0) supabase.from('imarking').insert([{ equipment_no:eqNo, change_date:todayKey, category:'점검', mode:'아이마킹', unit:'점검완료', value:1, note:'Daily TO DO 체크' }]).then(()=>{})
    }
  }

  function toggleCustomTodo(label: string) {
    if (selectedDate !== todayKey) return
    const next = { ...customChecked, [label]: !customChecked[label] }
    setCustomChecked(next)
    localStorage.setItem('custom_checked_' + todayKey, JSON.stringify(next))
    supabase.from('todo_checks').upsert({ date: todayKey, todo_key: label, is_custom: true, checked: !customChecked[label], updated_at: new Date().toISOString() }, { onConflict: 'date,todo_key' }).then(() => {})
    updateCompleted(label, !customChecked[label], todayKey)
  }

  function updateCompleted(label: string, isDone: boolean, dateKey: string) {
    const savedCompleted = JSON.parse(localStorage.getItem('cal_completed') || '{}')
    const dayCompleted: string[] = [...(savedCompleted[dateKey]||[])]
    if (isDone) { if (!dayCompleted.includes(label)) dayCompleted.push(label) }
    else { const idx=dayCompleted.indexOf(label); if (idx>-1) dayCompleted.splice(idx,1) }
    const nextCompleted = { ...savedCompleted, [dateKey]: dayCompleted }
    setCompletedDates(nextCompleted)
    localStorage.setItem('cal_completed', JSON.stringify(nextCompleted))
  }

  function addEvent() {
    if (!eventDate||!eventText.trim()) return
    const trimmed = eventText.trim()
    const next = { ...events, [eventDate]: [...(events[eventDate]||[]), trimmed] }
    setEvents(next)
    localStorage.setItem('cal_events', JSON.stringify(next))
    // DB에 이벤트 저장
    supabase.from('calendar_events').insert([{ date: eventDate, label: trimmed }]).then(() => {})
    // 커스텀 TODO도 등록
    supabase.from('todo_checks').upsert({ date: eventDate, todo_key: trimmed, is_custom: true, checked: false, updated_at: new Date().toISOString() }, { onConflict: 'date,todo_key' }).then(() => {})
    const savedCustomTodos = JSON.parse(localStorage.getItem('cal_custom_todos')||'{}')
    const dayTodos: string[] = savedCustomTodos[eventDate]||[]
    if (!dayTodos.includes(trimmed)) dayTodos.push(trimmed)
    const nextCustom = { ...savedCustomTodos, [eventDate]: dayTodos }
    localStorage.setItem('cal_custom_todos', JSON.stringify(nextCustom))
    if (eventDate===selectedDate) setCustomTodos(dayTodos)
    setEventModal(false)
    setEventText('')
  }

  function removeEvent(date: string, idx: number) {
    const arr = [...(events[date]||[])]
    const removed = arr[idx]
    arr.splice(idx,1)
    const next = { ...events, [date]: arr }
    setEvents(next)
    localStorage.setItem('cal_events', JSON.stringify(next))
    const sc = JSON.parse(localStorage.getItem('cal_custom_todos')||'{}')
    const dt: string[] = sc[date]||[]
    const ti = dt.indexOf(removed)
    if (ti>-1) dt.splice(ti,1)
    localStorage.setItem('cal_custom_todos', JSON.stringify({ ...sc, [date]: dt }))
    if (date===selectedDate) setCustomTodos(dt)
    const cp = JSON.parse(localStorage.getItem('cal_completed')||'{}')
    const dc: string[] = cp[date]||[]
    const ci = dc.indexOf(removed)
    if (ci>-1) dc.splice(ci,1)
    const nc = { ...cp, [date]: dc }
    setCompletedDates(nc)
    localStorage.setItem('cal_completed', JSON.stringify(nc))
  }

  function startFireworks() {
    setShowFireworks(true)
    setTimeout(() => setShowFireworks(false), 4000)
  }

  const firstDay = new Date(calYear, calMonth, 1)
  const lastDay = new Date(calYear, calMonth+1, 0)
  const cells: (Date|null)[] = []
  for (let i=0;i<firstDay.getDay();i++) cells.push(null)
  for (let d=1;d<=lastDay.getDate();d++) cells.push(new Date(calYear,calMonth,d))

  const isToday = selectedDate === todayKey
  const selectedDateObj = new Date(selectedDate+'T12:00:00')
  const isSelectedFriday = selectedDateObj.getDay() === 5
  const fridayTodo = { key: '주간보고서', label: '주간 보고서', regular: false }
  const allTodos = isSelectedFriday ? [...DAILY_TODOS, fridayTodo] : DAILY_TODOS
  const doneCount = allTodos.filter(t=>checked[t.key]).length + customTodos.filter(t=>customChecked[t]).length
  const totalCount = allTodos.length + customTodos.length
  const selectedImarking = getImarkingSchedule(selectedDateObj)

  const kpiCards = [
    { label: '관리 설비', value: stats.equipment, unit: '대', color: 'var(--accent-blue)' },
    { label: '이번 달 알람', value: stats.alarm, unit: '건', color: 'var(--accent-amber)' },
    { label: '정비이력', value: stats.maintenance, unit: '건', color: 'var(--accent-teal)' },
    { label: '찍힘 건수', value: stats.scratch, unit: '건', color: 'var(--accent-green)' },
  ]

  return (
    <div className="page-container">
      {/* CSS 폭죽 */}
      {showFireworks && (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:9999, overflow:'hidden' }}>
          <style>{`
            @keyframes fw { 0%{transform:scale(0);opacity:1} 100%{transform:scale(1) translateY(-120px);opacity:0} }
            @keyframes fw2 { 0%{transform:scale(0);opacity:1} 100%{transform:scale(1) translate(80px,-100px);opacity:0} }
            @keyframes fw3 { 0%{transform:scale(0);opacity:1} 100%{transform:scale(1) translate(-80px,-100px);opacity:0} }
            @keyframes fw4 { 0%{transform:scale(0);opacity:1} 100%{transform:scale(1) translate(40px,-140px);opacity:0} }
          `}</style>
          {([
            {l:'20%',t:'60%',c:'#ff6b6b',a:'fw',d:'0s',s:10},
            {l:'22%',t:'58%',c:'#ffd93d',a:'fw2',d:'0.1s',s:8},
            {l:'18%',t:'62%',c:'#6bcb77',a:'fw3',d:'0.2s',s:12},
            {l:'50%',t:'55%',c:'#4d96ff',a:'fw',d:'0.4s',s:10},
            {l:'52%',t:'53%',c:'#ff922b',a:'fw2',d:'0.5s',s:8},
            {l:'48%',t:'57%',c:'#cc5de8',a:'fw4',d:'0.6s',s:11},
            {l:'80%',t:'58%',c:'#20c997',a:'fw',d:'0.8s',s:10},
            {l:'82%',t:'56%',c:'#ffd93d',a:'fw3',d:'0.9s',s:9},
            {l:'78%',t:'60%',c:'#ff6b6b',a:'fw2',d:'1.0s',s:12},
            {l:'35%',t:'40%',c:'#4d96ff',a:'fw4',d:'1.2s',s:8},
            {l:'65%',t:'42%',c:'#cc5de8',a:'fw',d:'1.4s',s:10},
            {l:'50%',t:'30%',c:'#6bcb77',a:'fw2',d:'1.6s',s:11},
          ] as any[]).map((p,i) => (
            <div key={i} style={{
              position:'absolute', left:p.l, top:p.t,
              width:p.s, height:p.s, borderRadius:'50%',
              background:p.c,
              animation:`${p.a} 1.2s ease-out forwards`,
              animationDelay:p.d,
            }} />
          ))}
        </div>
      )}

      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize:17, fontWeight:700 }}>Dashboard</div>
            <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>후가공설비 관리 현황</div>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--text-muted)', background:'var(--bg-card)', padding:'5px 10px', borderRadius:6, border:'1px solid var(--border)' }}>{clock}</div>
            <button className="btn btn-primary btn-sm" onClick={() => { setEventDate(todayKey); setEventModal(true) }}>+ 일정 추가</button>
            <button className="btn btn-ghost" onClick={fetchData}>↻</button>
          </div>
        </div>

        {/* 내일 휴일 배너 */}
        {tomorrowInfo.isOff && (
          <div style={{ background:'linear-gradient(135deg, rgba(255,180,0,0.15), rgba(59,126,248,0.1))', borderBottom:'1px solid var(--accent-amber)', padding:'12px 28px', display:'flex', alignItems:'center', gap:12, position:'relative', overflow:'hidden' }}>
            <div style={{ fontSize:22 }}>🎉</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--accent-amber)' }}>내일은 {tomorrowInfo.reason}! 쉬는 날이에요 🙌</div>
              <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>오늘 업무 마무리 잘 하고 푹 쉬세요!</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft:'auto' }} onClick={startFireworks}>🎆 폭죽!</button>
          </div>
        )}

        <div className="content-area">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
            {kpiCards.map(k => (
              <div key={k.label} className="card" style={{ padding:'16px 18px' }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8 }}>{k.label}</div>
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:28, fontWeight:700, color:k.color }}>{loading?'-':k.value}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{k.unit}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:16 }}>
            {/* TO DO */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="card" style={{ padding:0, overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700 }}>Daily TO DO</div>
                    <div style={{ fontSize:10, color: selectedDate===todayKey?'var(--accent-blue)':'var(--accent-amber)', marginTop:2 }}>
                      {selectedDate===todayKey ? '오늘' : selectedDate}
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                    <span style={{ color:doneCount===totalCount?'var(--accent-green)':'var(--accent-amber)', fontWeight:600 }}>{doneCount}</span>/{totalCount}
                  </div>
                </div>
                <div style={{ padding:'8px 0' }}>
                  {allTodos.map(item => (
                    <div key={item.key} onClick={() => toggleTodo(item)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', cursor: isToday?'pointer':'default', transition:'background 0.15s', opacity: isToday?1:0.7 }}
                      onMouseEnter={e => isToday && ((e.currentTarget as HTMLElement).style.background='var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}
                    >
                      <div style={{ width:18, height:18, borderRadius:4, flexShrink:0, border:`2px solid ${checked[item.key]?'var(--accent-green)':'var(--border-light)'}`, background:checked[item.key]?'var(--accent-green)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                        {checked[item.key] && <span style={{ color:'white', fontSize:11, fontWeight:700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize:12, color:checked[item.key]?'var(--text-muted)':'var(--text-primary)', textDecoration:checked[item.key]?'line-through':'none', transition:'all 0.15s' }}>
                        {item.label}
                        {item.key==='아이마킹' && selectedImarking>0 && (
                          <span style={{ marginLeft:8, fontSize:10, color:'var(--accent-blue)', background:'var(--accent-blue-dim)', padding:'1px 6px', borderRadius:10 }}>#{String(selectedImarking).padStart(2,'0')} 설비</span>
                        )}
                        {item.key==='주간보고서' && <span style={{ marginLeft:6, fontSize:9, color:'var(--accent-blue)', background:'var(--accent-blue-dim)', padding:'1px 5px', borderRadius:8 }}>매주 금요일</span>}
                        {item.regular && <span style={{ marginLeft:6, fontSize:9, color:'var(--text-muted)', background:'var(--bg-hover)', padding:'1px 5px', borderRadius:8 }}>정기</span>}
                      </span>
                    </div>
                  ))}
                  {customTodos.map(label => (
                    <div key={label} onClick={() => toggleCustomTodo(label)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', cursor:isToday?'pointer':'default', transition:'background 0.15s', borderTop:'1px solid var(--border)', opacity:isToday?1:0.7 }}
                      onMouseEnter={e => isToday && ((e.currentTarget as HTMLElement).style.background='var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}
                    >
                      <div style={{ width:18, height:18, borderRadius:4, flexShrink:0, border:`2px solid ${customChecked[label]?'var(--accent-amber)':'var(--border-light)'}`, background:customChecked[label]?'var(--accent-amber)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                        {customChecked[label] && <span style={{ color:'white', fontSize:11, fontWeight:700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize:12, color:customChecked[label]?'var(--text-muted)':'var(--text-primary)', textDecoration:customChecked[label]?'line-through':'none' }}>
                        {label}
                        <span style={{ marginLeft:6, fontSize:9, color:'var(--accent-amber)', background:'var(--accent-amber-dim)', padding:'1px 5px', borderRadius:8 }}>추가</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', background:'var(--bg-hover)' }}>
                  <div style={{ height:4, borderRadius:4, background:'var(--border)', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${totalCount>0?(doneCount/totalCount)*100:0}%`, background:doneCount===totalCount&&totalCount>0?'var(--accent-green)':'var(--accent-blue)', borderRadius:4, transition:'width 0.3s' }} />
                  </div>
                  {!isToday && <div style={{ fontSize:10, color:'var(--accent-amber)', marginTop:6, textAlign:'center' }}>과거 날짜 — 체크 불가 (읽기 전용)</div>}
                </div>
              </div>

              <div className="card">
                <div style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>설비 유형 분포</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {Object.entries(equipByType).map(([type,cnt]:any) => (
                    <div key={type} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:48, fontSize:11, color:'var(--text-secondary)' }}>{type}</div>
                      <div style={{ flex:1, height:10, background:'var(--bg-hover)', borderRadius:4, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${(cnt/stats.equipment)*100}%`, background:'var(--accent-blue)', borderRadius:4 }} />
                      </div>
                      <div style={{ width:20, fontSize:11, fontFamily:'JetBrains Mono, monospace', color:'var(--text-muted)', textAlign:'right' }}>{cnt}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 달력 */}
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontSize:13, fontWeight:700 }}>{calYear}년 {calMonth+1}월</div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { const d=new Date(calYear,calMonth-1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()) }}>‹</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()); setSelectedDate(todayKey); loadTodoForDate(todayKey) }}>오늘</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { const d=new Date(calYear,calMonth+1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()) }}>›</button>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--border)' }}>
                {['일','월','화','수','목','금','토'].map((d,i) => (
                  <div key={d} style={{ padding:'8px 0', textAlign:'center', fontSize:11, fontWeight:600, color:i===0?'var(--accent-red)':i===6?'var(--accent-teal)':'var(--text-muted)' }}>{d}</div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
                {cells.map((date,idx) => {
                  if (!date) return <div key={idx} style={{ minHeight:110, borderRight:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }} />
                  const dateStr = toLocalDate(date)
                  const isToday2 = dateStr===todayKey
                  const isSelected = dateStr===selectedDate
                  const isWeekend = date.getDay()===0||date.getDay()===6
                  const isFriday = date.getDay()===5
                  const imarkingEq = getImarkingSchedule(date)
                  const dayEvents = events[dateStr]||[]
                  const dayCompleted = completedDates[dateStr]||[]
                  const wd = date.getDay()
                  return (
                    <div key={idx}
                      onClick={() => handleCalendarDateClick(dateStr)}
                      style={{ minHeight:110, borderRight:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'6px', background:isSelected?'var(--accent-blue-dim)':isToday2?'rgba(59,126,248,0.05)':'transparent', cursor:'pointer', outline:isSelected?'2px solid var(--accent-blue)':'none', outlineOffset:'-2px', transition:'all 0.15s' }}
                    >
                      <div style={{ marginBottom:4 }}>
                        <span style={{ fontSize:12, fontWeight:isToday2?700:400, color:isToday2?'white':wd===0?'var(--accent-red)':wd===6?'var(--accent-teal)':'var(--text-primary)', background:isToday2?'var(--accent-blue)':'transparent', width:22, height:22, borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                          {date.getDate()}
                        </span>
                      </div>
                      {isFriday && (
                        <div style={{ fontSize:9, padding:'2px 5px', borderRadius:4, background:dayCompleted.includes('주간 보고서')?'var(--accent-green-dim)':'var(--accent-blue-dim)', color:dayCompleted.includes('주간 보고서')?'var(--accent-green)':'var(--accent-blue)', marginBottom:2, fontWeight:600 }}>
                          {dayCompleted.includes('주간 보고서')?'✓ ':''}📋 주간 보고서
                        </div>
                      )}
                      {!isWeekend && imarkingEq>0 && (
                        <div style={{ fontSize:9, padding:'2px 5px', borderRadius:4, background:dayCompleted.includes('아이마킹')?'var(--accent-green-dim)':'var(--accent-teal-dim)', color:dayCompleted.includes('아이마킹')?'var(--accent-green)':'var(--accent-teal)', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {dayCompleted.includes('아이마킹')?'✓ ':''}i-Marking #{String(imarkingEq).padStart(2,'00')}
                        </div>
                      )}
                      {!isWeekend && (
                        <div style={{ fontSize:9, padding:'2px 5px', borderRadius:4, background:REGULAR_TODOS.every(t=>dayCompleted.includes(t))?'var(--accent-green-dim)':'var(--bg-hover)', color:REGULAR_TODOS.every(t=>dayCompleted.includes(t))?'var(--accent-green)':'var(--text-muted)', marginBottom:2 }}>
                          {REGULAR_TODOS.every(t=>dayCompleted.includes(t))?'✓ 정기업무 완료':'정기업무'}
                        </div>
                      )}
                      {dayEvents.map((ev,i) => {
                        const isDone = dayCompleted.includes(ev)
                        return (
                          <div key={i} style={{ fontSize:9, padding:'2px 5px', borderRadius:4, background:isDone?'var(--accent-green-dim)':'var(--accent-amber-dim)', color:isDone?'var(--accent-green)':'var(--accent-amber)', marginBottom:2, display:'flex', alignItems:'center', justifyContent:'space-between', gap:2 }}
                            onClick={e => { e.stopPropagation(); removeEvent(dateStr,i) }}>
                            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{isDone?'✓ ':''}{ev}</span>
                            <span style={{ flexShrink:0, opacity:0.6 }}>×</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
              <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', display:'flex', gap:16, fontSize:10, color:'var(--text-muted)', flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:8, height:8, borderRadius:2, background:'var(--accent-blue)' }} />주간 보고서 (금)</div>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:8, height:8, borderRadius:2, background:'var(--accent-teal)' }} />아이마킹</div>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:8, height:8, borderRadius:2, background:'var(--bg-hover)', border:'1px solid var(--border)' }} />정기업무</div>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:8, height:8, borderRadius:2, background:'var(--accent-green)' }} />완료</div>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:8, height:8, borderRadius:2, background:'var(--accent-amber)' }} />추가 일정 (×삭제)</div>
                <div style={{ marginLeft:'auto', fontSize:10, color:'var(--accent-blue)', fontWeight:600 }}>클릭하면 TO DO 날짜 변경</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 일정 추가 모달 */}
      {eventModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setEventModal(false)}>
          <div className="modal" style={{ maxWidth:400 }}>
            <div className="modal-header">
              <div className="modal-title">일정 추가</div>
              <button className="modal-close" onClick={() => setEventModal(false)}>×</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="form-group">
                <label className="form-label">날짜</label>
                <input className="form-input" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">내용</label>
                <input className="form-input" type="text" placeholder="일정 내용 입력..." value={eventText} onChange={e => setEventText(e.target.value)} onKeyDown={e => e.key==='Enter'&&addEvent()} autoFocus />
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
