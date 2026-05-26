'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRequireAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Favorites from '@/components/Favorites'

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

// 월급날 체크 (10일, 25일 - 주말/공휴일이면 전날로 앞당겨짐)
function isPayday(date: Date): boolean {
  const ds = toLocalDate(date)
  const month = date.getMonth(), year = date.getFullYear()
  for (const payday of [10, 25]) {
    // 해당 월의 10/25일부터 거꾸로 평일 찾기
    let d = new Date(year, month, payday)
    while (d.getDay() === 0 || d.getDay() === 6 || KR_HOLIDAYS[toLocalDate(d)]) {
      d.setDate(d.getDate() - 1)
    }
    if (toLocalDate(d) === ds) return true
  }
  return false
}

type VibeType = 'weekend' | 'holiday' | 'payday' | 'payday_weekend' | 'weekday'
interface DashboardVibe {
  type: VibeType
  emoji: string
  title: string
  subtitle: string
  gradient: string
  borderColor: string
  titleColor: string
  showFireworks: boolean
  fireworkType: 'celebration' | 'money' | 'none'
}

function getDashboardVibe(): DashboardVibe {
  const today = new Date()
  const todayWd = today.getDay() // 0=일 ~ 6=토
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate()+1)
  const tomorrowWd = tomorrow.getDay()
  const tomorrowStr = toLocalDate(tomorrow)
  const tomorrowIsOff = tomorrowWd === 0 || tomorrowWd === 6 || !!KR_HOLIDAYS[tomorrowStr]
  const tomorrowReason = tomorrowWd === 0 ? '일요일' : tomorrowWd === 6 ? '토요일' : KR_HOLIDAYS[tomorrowStr] || ''
  const todayIsPayday = isPayday(today)

  // 월급날 + 내일 쉬는 날 (대박 콤보)
  if (todayIsPayday && tomorrowIsOff) {
    return {
      type: 'payday_weekend', emoji: '🤑', fireworkType: 'money', showFireworks: true,
      title: '월급날인데 내일 쉰다고?? 인생 뭐 있어 💸🎉',
      subtitle: '통장 잔고 확인하고 퇴근 후 자축하세요 ㅋㅋ',
      gradient: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,107,107,0.15))',
      borderColor: 'var(--accent-amber)', titleColor: '#f59f00',
    }
  }

  // 월급날
  if (todayIsPayday) {
    const paydayMsgs = [
      { title: '월급 들어왔다 💰 잠깐만 행복하자', subtitle: '통장을 스쳐가는 월급… 그래도 오늘만큼은 부자' },
      { title: '드디어 월급날 🤑 텅장이 잠깐 통장으로', subtitle: '카드값 빠지기 전이 제일 행복한 순간' },
      { title: '월급이 들어왔습니다 💸 잔고 확인 금지', subtitle: '오늘 하루만 부자인 척 하기 ㅋㅋ' },
    ]
    const msg = paydayMsgs[today.getDate() % paydayMsgs.length]
    return {
      type: 'payday', emoji: '💰', fireworkType: 'money', showFireworks: true,
      ...msg,
      gradient: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,180,0,0.1))',
      borderColor: '#f59f00', titleColor: '#f59f00',
    }
  }

  // 내일 주말
  if (tomorrowIsOff && (tomorrowWd === 0 || tomorrowWd === 6)) {
    const weekendMsgs = [
      { title: '내일 주말이다!! 칼퇴 준비 완료 🏃‍♂️💨', subtitle: '오늘 하루만 버티면 자유다' },
      { title: '내일부터 주말 🎮 오늘만 참자', subtitle: '퇴근 카운트다운 시작 3... 2... 1...' },
      { title: '주말이 코앞 🎉 오늘의 나 수고했다', subtitle: '내일은 알람 없는 아침이 기다리고 있음' },
    ]
    const msg = weekendMsgs[today.getDate() % weekendMsgs.length]
    return {
      type: 'weekend', emoji: '🎉', fireworkType: 'none', showFireworks: false,
      ...msg,
      gradient: 'linear-gradient(135deg, rgba(107,203,119,0.15), rgba(59,126,248,0.1))',
      borderColor: 'var(--accent-green)', titleColor: 'var(--accent-green)',
    }
  }

  // 내일 공휴일
  if (tomorrowIsOff) {
    return {
      type: 'holiday', emoji: '🎊', fireworkType: 'none', showFireworks: false,
      title: `내일 ${tomorrowReason}! 쉬는 날 get 🙌`,
      subtitle: '갑자기 찾아온 행복... 오늘 업무 빠르게 정리하고 칼퇴!',
      gradient: 'linear-gradient(135deg, rgba(255,180,0,0.15), rgba(204,93,232,0.1))',
      borderColor: 'var(--accent-amber)', titleColor: 'var(--accent-amber)',
    }
  }

  // 평일 (월~목 조언)
  const weekdayMsgs: Record<number, { emoji: string; title: string; subtitle: string }> = {
    1: { emoji: '💪', title: '월요일은 시작이 반 🔥 가볍게 워밍업!', subtitle: '커피 한 잔 하고 오늘 할 일 정리부터 하죠' },
    2: { emoji: '🏃', title: '화요일, 슬슬 페이스 올려봅시다 🚀', subtitle: '어제보다 오늘이 더 낫다는 마인드로' },
    3: { emoji: '🐫', title: '수요일 = 낙타의 날 🐪 이미 반 왔다', subtitle: '주간의 고비를 넘기면 내리막길만 남았음' },
    4: { emoji: '⚡', title: '목요일, 내일이면 금요일이다!!', subtitle: '라스트 스퍼트 🏁 조금만 더 화이팅' },
    5: { emoji: '🎉', title: '불금이다!! 오늘만 버티면 주말 🎊', subtitle: '이미 마음은 퇴근... 하지만 마무리는 깔끔하게' },
  }
  const msg = weekdayMsgs[todayWd] || { emoji: '☀️', title: '오늘도 화이팅!', subtitle: '좋은 하루 보내세요' }
  return {
    type: 'weekday', emoji: msg.emoji, fireworkType: 'none', showFireworks: false,
    title: msg.title, subtitle: msg.subtitle,
    gradient: 'linear-gradient(135deg, rgba(59,126,248,0.08), rgba(32,201,151,0.06))',
    borderColor: 'var(--border)', titleColor: 'var(--text-primary)',
  }
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
  useRequireAuth()
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

  // 분위기
  const [showFireworks, setShowFireworks] = useState(false)
  const vibe = getDashboardVibe()

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

    // 폭죽/돈 효과
    if (vibe.showFireworks) {
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

  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  const [maintenanceDue, setMaintenanceDue] = useState<any[]>([])
  const [alarmAlerts, setAlarmAlerts] = useState<any[]>([])
  const ALARM_THRESHOLD = 10 // 월 알람 임계값

  async function fetchData() {
    setLoading(true)
    const monthStart = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`
    const [eq, al, mn, sc, mat] = await Promise.all([
      supabase.from('equipment').select('*'),
      supabase.from('alarm').select('equipment_no, punch_alarm, weld_alarm, date').gte('date', monthStart),
      supabase.from('maintenance').select('equipment_no, date'),
      supabase.from('scratch').select('id'),
      supabase.from('materials').select('*'),
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
    // 자재 부족
    const lowStock = (mat.data||[]).filter((r:any) => (r.min_quantity||0) > 0 && r.quantity <= r.min_quantity)
    setLowStockItems(lowStock)

    // 정비 주기 분석: 마지막 정비일 + 주기 = 다음 예정일
    const maintByEq: Record<number, string> = {}
    ;(mn.data||[]).forEach((m: any) => {
      if (!maintByEq[m.equipment_no] || m.date > maintByEq[m.equipment_no]) {
        maintByEq[m.equipment_no] = m.date
      }
    })
    const dueList: any[] = []
    eqData.forEach((eq: any) => {
      const cycle = eq.maintenance_cycle_days || 30
      const lastMaint = maintByEq[eq.no]
      if (!lastMaint) return // 정비 이력 없으면 스킵
      const lastDate = new Date(lastMaint)
      const nextDate = new Date(lastDate)
      nextDate.setDate(nextDate.getDate() + cycle)
      const daysLeft = Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (daysLeft <= 7) { // 7일 이내 또는 지난 것
        dueList.push({
          equipment_no: eq.no,
          equipment_name: eq.name,
          last_maintenance: lastMaint,
          next_due: nextDate.toISOString().slice(0, 10),
          days_left: daysLeft,
          cycle,
        })
      }
    })
    dueList.sort((a, b) => a.days_left - b.days_left)
    setMaintenanceDue(dueList)

    // 알람 임계값: 설비별 월간 알람 합계
    const alarmByEq: Record<number, number> = {}
    ;(al.data||[]).forEach((a: any) => {
      const total = (a.punch_alarm||0) + (a.weld_alarm||0)
      alarmByEq[a.equipment_no] = (alarmByEq[a.equipment_no]||0) + total
    })
    const alerts = Object.entries(alarmByEq)
      .filter(([_, count]) => (count as number) >= ALARM_THRESHOLD)
      .map(([eqNo, count]) => {
        const eq = eqData.find((e:any) => e.no === Number(eqNo))
        return { equipment_no: Number(eqNo), equipment_name: eq?.name || '', count: count as number }
      })
      .sort((a, b) => b.count - a.count)
    setAlarmAlerts(alerts)

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

  // 드래그 앤 드롭: 일정을 다른 날짜로 이동
  const [dragItem, setDragItem] = useState<{date:string,idx:number,label:string}|null>(null)
  const [dragOverDate, setDragOverDate] = useState<string|null>(null)
  const [editEvent, setEditEvent] = useState<{date:string,idx:number,label:string}|null>(null)
  const [editEventText, setEditEventText] = useState('')

  function openEditEvent(date: string, idx: number, label: string) {
    setEditEvent({ date, idx, label })
    setEditEventText(label)
  }

  function saveEditEvent() {
    if (!editEvent || !editEventText.trim()) return
    const { date, idx, label: oldLabel } = editEvent
    const newLabel = editEventText.trim()
    if (newLabel === oldLabel) { setEditEvent(null); return }

    // events 업데이트
    const arr = [...(events[date]||[])]
    arr[idx] = newLabel
    const next = { ...events, [date]: arr }
    setEvents(next)
    localStorage.setItem('cal_events', JSON.stringify(next))

    // custom_todos 업데이트
    const sc = JSON.parse(localStorage.getItem('cal_custom_todos')||'{}')
    const dt: string[] = sc[date]||[]
    const ti = dt.indexOf(oldLabel)
    if (ti>-1) dt[ti] = newLabel
    localStorage.setItem('cal_custom_todos', JSON.stringify({ ...sc, [date]: dt }))
    if (date===selectedDate) setCustomTodos(dt)

    // completed 업데이트
    const cp = JSON.parse(localStorage.getItem('cal_completed')||'{}')
    const dc: string[] = cp[date]||[]
    const ci = dc.indexOf(oldLabel)
    if (ci>-1) dc[ci] = newLabel
    setCompletedDates({ ...cp, [date]: dc })
    localStorage.setItem('cal_completed', JSON.stringify({ ...cp, [date]: dc }))

    // DB 동기화
    supabase.from('calendar_events').update({ label: newLabel }).eq('date', date).eq('label', oldLabel).then(() => {})
    supabase.from('todo_checks').update({ todo_key: newLabel, updated_at: new Date().toISOString() }).eq('date', date).eq('todo_key', oldLabel).then(() => {})

    setEditEvent(null)
  }

  function moveEvent(fromDate: string, idx: number, toDate: string) {
    if (fromDate === toDate) return
    const fromArr = [...(events[fromDate]||[])]
    const label = fromArr[idx]
    if (!label) return
    fromArr.splice(idx, 1)
    const toArr = [...(events[toDate]||[]), label]
    const next = { ...events, [fromDate]: fromArr, [toDate]: toArr }
    setEvents(next)
    localStorage.setItem('cal_events', JSON.stringify(next))

    // custom_todos도 이동
    const sc = JSON.parse(localStorage.getItem('cal_custom_todos')||'{}')
    const fromTodos: string[] = sc[fromDate]||[]
    const fi = fromTodos.indexOf(label)
    if (fi>-1) fromTodos.splice(fi,1)
    const toTodos: string[] = sc[toDate]||[]
    if (!toTodos.includes(label)) toTodos.push(label)
    localStorage.setItem('cal_custom_todos', JSON.stringify({ ...sc, [fromDate]: fromTodos, [toDate]: toTodos }))

    // completed도 이동
    const cp = JSON.parse(localStorage.getItem('cal_completed')||'{}')
    const fromComp: string[] = cp[fromDate]||[]
    const ci = fromComp.indexOf(label)
    if (ci>-1) {
      fromComp.splice(ci,1)
      const toComp: string[] = cp[toDate]||[]
      if (!toComp.includes(label)) toComp.push(label)
      const nc = { ...cp, [fromDate]: fromComp, [toDate]: toComp }
      setCompletedDates(nc)
      localStorage.setItem('cal_completed', JSON.stringify(nc))
    }

    // DB 동기화
    supabase.from('calendar_events').delete().eq('date', fromDate).eq('label', label).then(() => {
      supabase.from('calendar_events').insert([{ date: toDate, label }]).then(() => {})
    })
    supabase.from('todo_checks').delete().eq('date', fromDate).eq('todo_key', label).then(() => {
      supabase.from('todo_checks').upsert({ date: toDate, todo_key: label, is_custom: true, checked: false, updated_at: new Date().toISOString() }, { onConflict: 'date,todo_key' }).then(() => {})
    })

    if (selectedDate === fromDate) setCustomTodos(fromTodos)
    if (selectedDate === toDate) setCustomTodos(toTodos)
  }

  function startFireworks() {
    setShowFireworks(true)
    setTimeout(() => setShowFireworks(false), 4000)
  }

  const calendarData = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1)
    const lastDay = new Date(calYear, calMonth+1, 0)
    const cells: Array<{ date: Date|null; dateStr?: string; isToday?: boolean; isWeekend?: boolean; isFriday?: boolean; wd?: number; imarkingEq?: number } | null> = []
    for (let i=0;i<firstDay.getDay();i++) cells.push(null)
    for (let d=1;d<=lastDay.getDate();d++) {
      const date = new Date(calYear, calMonth, d)
      const dateStr = toLocalDate(date)
      const wd = date.getDay()
      cells.push({
        date,
        dateStr,
        isToday: dateStr === todayKey,
        isWeekend: wd === 0 || wd === 6,
        isFriday: wd === 5,
        wd,
        imarkingEq: getImarkingSchedule(date),
      })
    }
    return cells
  }, [calYear, calMonth, todayKey])

  const cells = calendarData

  const isToday = selectedDate === todayKey
  const selectedDateObj = new Date(selectedDate+'T12:00:00')
  const isSelectedFriday = selectedDateObj.getDay() === 5
  const isSelectedWedThuFri = [3, 4, 5].includes(selectedDateObj.getDay()) // 수(3), 목(4), 금(5)
  // 격주 금요일 판별: ISO 주차 기준 짝수 주
  const isBiweekFriday = (() => {
    if (!isSelectedFriday) return false
    const jan1 = new Date(selectedDateObj.getFullYear(), 0, 1)
    const days = Math.floor((selectedDateObj.getTime() - jan1.getTime()) / 86400000)
    const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7)
    return weekNum % 2 === 0
  })()
  const fridayTodo = { key: '주간보고서', label: '주간 보고서', regular: false }
  const worktimeTodo = { key: 'worktime갱신', label: 'Worktime 갱신 (ERP 업로드)', regular: true }
  const backupTodo = { key: '격주백업', label: '데이터 백업 확인 (자동 격주)', regular: true }
  const allTodos = [
    ...DAILY_TODOS,
    ...(isSelectedWedThuFri ? [worktimeTodo] : []),
    ...(isSelectedFriday ? [fridayTodo] : []),
    ...(isBiweekFriday ? [backupTodo] : []),
  ]
  const doneCount = allTodos.filter(t=>checked[t.key]).length + customTodos.filter(t=>customChecked[t]).length
  const totalCount = allTodos.length + customTodos.length
  const selectedImarking = getImarkingSchedule(selectedDateObj)

  const kpiCards = [
    { label: '관리 설비', value: stats.equipment, unit: '대', color: 'var(--accent-blue)', icon: '🏭' },
    { label: '이번 달 알람', value: stats.alarm, unit: '건', color: 'var(--accent-amber)', icon: '🔔', warn: stats.alarm >= 20 },
    { label: '정비이력', value: stats.maintenance, unit: '건', color: 'var(--accent-teal)', icon: '🔧' },
    { label: '찍힘 건수', value: stats.scratch, unit: '건', color: 'var(--accent-green)', icon: '🔍' },
  ]

  return (
    <div className="page-container">
      {/* Canvas 이펙트 (축하 폭죽 or 돈 폭죽) */}
      {showFireworks && (
        <canvas
          ref={(canvas) => {
            if (!canvas) return
            const ctx = canvas.getContext('2d')
            if (!ctx) return
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            const W = canvas.width, H = canvas.height
            const particles: any[] = []
            const rockets: any[] = []
            const isMoney = vibe.fireworkType === 'money'
            const celebrationColors = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff922b','#cc5de8','#20c997','#f06595','#fcc419','#74c0fc','#a9e34b','#e599f7']
            const moneyColors = ['#ffd700','#ffec3d','#f59f00','#fab005','#ffe066','#fff3bf','#82c91e','#69db7c']
            const colors = isMoney ? moneyColors : celebrationColors
            const emojis = isMoney ? ['💰','💵','💸','🤑','💳','🪙'] : ['🎉','✨','🎊','⭐','🌟','💫']
            let frame = 0
            const textParticles: any[] = []
            const launches = [
              {x:W*0.2,t:0},{x:W*0.5,t:15},{x:W*0.8,t:30},
              {x:W*0.35,t:50},{x:W*0.65,t:65},{x:W*0.45,t:85},
              {x:W*0.25,t:105},{x:W*0.75,t:120},{x:W*0.5,t:140},
            ]
            function explode(x: number, y: number) {
              const count = 70 + Math.floor(Math.random()*30)
              const baseColor = colors[Math.floor(Math.random()*colors.length)]
              for (let i=0;i<count;i++) {
                const angle = (Math.PI*2/count)*i + (Math.random()-0.5)*0.3
                const speed = 2 + Math.random()*5
                const life = 50 + Math.floor(Math.random()*30)
                const size = 1.5 + Math.random()*2.5
                const c = Math.random()>0.3 ? baseColor : colors[Math.floor(Math.random()*colors.length)]
                particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life,maxLife:life,size,color:c,trail:[] as {x:number,y:number}[]})
              }
              // 이모지 파티클
              for (let i=0;i<6;i++) {
                const angle = Math.random()*Math.PI*2
                const speed = 1.5+Math.random()*3
                textParticles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-2,life:80,maxLife:80,emoji:emojis[Math.floor(Math.random()*emojis.length)],size:14+Math.random()*10})
              }
            }
            function loop() {
              ctx!.globalCompositeOperation = 'source-over'
              ctx!.fillStyle = 'rgba(0,0,0,0.12)'
              ctx!.fillRect(0,0,W,H)
              ctx!.globalCompositeOperation = 'lighter'
              launches.forEach(l => {
                if (frame === l.t) rockets.push({x:l.x,y:H,vy:-11-Math.random()*4,targetY:H*0.15+Math.random()*H*0.3})
              })
              for (let i=rockets.length-1;i>=0;i--) {
                const r = rockets[i]
                r.y += r.vy
                ctx!.beginPath(); ctx!.arc(r.x,r.y,2,0,Math.PI*2)
                ctx!.fillStyle = isMoney ? '#ffd700' : '#ffd93d'; ctx!.fill()
                for (let t=0;t<3;t++) { ctx!.beginPath(); ctx!.arc(r.x+(Math.random()-0.5)*3,r.y+t*7,1.5-t*0.4,0,Math.PI*2); ctx!.fillStyle=`rgba(255,217,61,${0.5-t*0.15})`; ctx!.fill() }
                if (r.y<=r.targetY) { explode(r.x,r.y); rockets.splice(i,1) }
              }
              for (let i=particles.length-1;i>=0;i--) {
                const p = particles[i]
                p.trail.push({x:p.x,y:p.y}); if (p.trail.length>5) p.trail.shift()
                p.vx*=0.98; p.vy*=0.98; p.vy+=0.04; p.x+=p.vx; p.y+=p.vy; p.life--
                const alpha = p.life/p.maxLife
                p.trail.forEach((t:{x:number,y:number},ti:number) => { const ta=(ti/p.trail.length)*alpha*0.4; ctx!.beginPath(); ctx!.arc(t.x,t.y,p.size*0.5,0,Math.PI*2); ctx!.fillStyle=p.color+Math.floor(ta*255).toString(16).padStart(2,'0'); ctx!.fill() })
                ctx!.beginPath(); ctx!.arc(p.x,p.y,p.size*alpha,0,Math.PI*2); ctx!.fillStyle=p.color+Math.floor(alpha*255).toString(16).padStart(2,'0'); ctx!.fill()
                if (alpha>0.5) { ctx!.beginPath(); ctx!.arc(p.x,p.y,p.size*3*alpha,0,Math.PI*2); ctx!.fillStyle=p.color+'15'; ctx!.fill() }
                if (p.life<=0) particles.splice(i,1)
              }
              // 이모지 파티클 렌더링
              ctx!.globalCompositeOperation = 'source-over'
              for (let i=textParticles.length-1;i>=0;i--) {
                const tp = textParticles[i]
                tp.vy+=0.06; tp.x+=tp.vx; tp.y+=tp.vy; tp.life--
                const alpha = tp.life/tp.maxLife
                ctx!.globalAlpha = alpha
                ctx!.font = `${tp.size}px sans-serif`
                ctx!.fillText(tp.emoji, tp.x-tp.size/2, tp.y+tp.size/2)
                if (tp.life<=0) textParticles.splice(i,1)
              }
              ctx!.globalAlpha = 1
              frame++
              if (frame < 260) requestAnimationFrame(loop)
            }
            ctx.fillStyle = 'rgba(0,0,0,0.01)'; ctx.fillRect(0,0,W,H); loop()
          }}
          style={{ position:'fixed',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:9999 }}
        />
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

        {/* MZ 바이브 배너 (항상 표시) */}
        <div style={{ background:vibe.gradient, borderBottom:`1px solid ${vibe.borderColor}`, padding:'12px 28px', display:'flex', alignItems:'center', gap:12, position:'relative', overflow:'hidden' }}>
          <div style={{ fontSize:24 }}>{vibe.emoji}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:vibe.titleColor }}>{vibe.title}</div>
            <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>{vibe.subtitle}</div>
          </div>
          {vibe.showFireworks && (
            <button className="btn btn-ghost btn-sm" onClick={startFireworks}>
              {vibe.fireworkType === 'money' ? '💸 돈 터뜨리기!' : '🎆 축하!'}
            </button>
          )}
        </div>

        <div className="content-area">
          <div className="kpi-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
            {kpiCards.map((k: any) => (
              <div key={k.label} className="card kpi-card" style={{ padding:'16px 18px', ['--accent-color' as any]: k.color, position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontSize:12, color:'var(--text-muted)', fontWeight: 600 }}>{k.label}</div>
                  <span style={{ fontSize: 20, opacity: 0.8 }}>{k.icon}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: k.color }}>{loading?'-':k.value}</span>
                  <span style={{ fontSize: 12, color:'var(--text-muted)' }}>{k.unit}</span>
                  {k.warn && <span style={{ fontSize: 10, color: 'var(--accent-red)', marginLeft: 'auto', fontWeight: 700 }}>● 주의</span>}
                </div>
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
              <Favorites />
              {alarmAlerts.length > 0 && (
                <div className="card" style={{ padding: 14, background: 'var(--accent-amber-dim)', border: '1px solid var(--accent-amber)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-amber)' }}>📊 알람 임계 초과</div>
                    <span style={{ fontSize: 10, color: 'var(--accent-amber)', background: 'var(--bg-card)', padding: '1px 6px', borderRadius: 10 }}>{ALARM_THRESHOLD}건↑ : {alarmAlerts.length}대</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                    {alarmAlerts.slice(0, 8).map((a: any) => (
                      <div key={a.equipment_no} style={{ fontSize: 11, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--bg-card)', borderRadius: 4 }}>
                        <span>#{String(a.equipment_no).padStart(2,'0')} · {a.equipment_name}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-amber)', fontWeight: 700 }}>{a.count}건</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {maintenanceDue.length > 0 && (
                <div className="card" style={{
                  padding: 16,
                  border: '0.5px solid var(--accent-blue)',
                  borderLeft: '4px solid var(--accent-blue)',
                  borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-blue)' }}>● 정비 예정 알림</div>
                    <span style={{ fontSize: 11, color: 'white', background: 'var(--accent-blue)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>7일 이내 {maintenanceDue.length}건</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                    {maintenanceDue.slice(0, 8).map((m: any) => (
                      <div key={m.equipment_no} style={{ fontSize: 12, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-hover)', borderRadius: 6 }}>
                        <span>#{String(m.equipment_no).padStart(2,'0')} · {m.equipment_name}</span>
                        <span style={{ color: m.days_left < 0 ? 'var(--accent-red)' : 'var(--accent-blue)', fontWeight: 700 }}>
                          {m.days_left < 0 ? `${Math.abs(m.days_left)}일 경과` : m.days_left === 0 ? '오늘' : `D-${m.days_left}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {lowStockItems.length > 0 && (
                <div className="card" style={{
                  padding: 16,
                  border: '0.5px solid var(--accent-red)',
                  borderLeft: '4px solid var(--accent-red)',
                  borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-red)' }}>● 자재 부족 알림</div>
                    <span style={{ fontSize: 11, color: 'white', background: 'var(--accent-red)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>{lowStockItems.length}건</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                    {lowStockItems.slice(0, 8).map((m: any) => (
                      <div key={m.id} style={{ fontSize: 12, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-hover)', borderRadius: 6 }}>
                        <span>#{String(m.equipment_no).padStart(2,'0')} · {m.item_name}</span>
                        <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>{m.quantity}/{m.min_quantity}</span>
                      </div>
                    ))}
                    {lowStockItems.length > 8 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>외 {lowStockItems.length - 8}건</div>
                    )}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ width: '100%', marginTop: 10, fontSize: 12 }}
                    onClick={() => {
                      const memo = `[자재 부족 발주 요청]\n${lowStockItems.map((m: any) =>
                        `- #${String(m.equipment_no).padStart(2,'0')} ${m.item_name}${m.spec ? ` (${m.spec})` : ''}${m.maker ? ` · ${m.maker}` : ''} : 현재 ${m.quantity}개 / 최소 ${m.min_quantity}개 → 부족 ${m.min_quantity - m.quantity}개`
                      ).join('\n')}\n\n총 ${lowStockItems.length}건`
                      navigator.clipboard.writeText(memo)
                      alert('발주 메모가 클립보드에 복사되었습니다')
                    }}
                  >📋 발주 메모 복사</button>
                </div>
              )}
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
                {cells.map((cell,idx) => {
                  if (!cell) return <div key={idx} style={{ minHeight:110, borderRight:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }} />
                  const date = cell.date!
                  const dateStr = cell.dateStr!
                  const isToday2 = cell.isToday!
                  const isSelected = dateStr===selectedDate
                  const isWeekend = cell.isWeekend!
                  const isFriday = cell.isFriday!
                  const imarkingEq = cell.imarkingEq!
                  const dayEvents = events[dateStr]||[]
                  const dayCompleted = completedDates[dateStr]||[]
                  const wd = cell.wd!
                  return (
                    <div key={idx}
                      onClick={() => handleCalendarDateClick(dateStr)}
                      onDragOver={e => { e.preventDefault(); setDragOverDate(dateStr) }}
                      onDragLeave={() => setDragOverDate(null)}
                      onDrop={e => { e.preventDefault(); setDragOverDate(null); if (dragItem) { moveEvent(dragItem.date, dragItem.idx, dateStr); setDragItem(null) } }}
                      style={{ minHeight:110, borderRight:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'6px', background:dragOverDate===dateStr?'var(--accent-blue-dim)':isSelected?'var(--accent-blue-dim)':isToday2?'rgba(59,126,248,0.05)':'transparent', cursor:'pointer', outline:dragOverDate===dateStr?'2px dashed var(--accent-blue)':isSelected?'2px solid var(--accent-blue)':'none', outlineOffset:'-2px', transition:'all 0.15s' }}
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
                          <div key={i}
                            draggable
                            onDragStart={e => { setDragItem({date:dateStr,idx:i,label:ev}); e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',ev) }}
                            onDragEnd={() => setDragItem(null)}
                            style={{ fontSize:9, padding:'2px 5px', borderRadius:4, background:isDone?'var(--accent-green-dim)':'var(--accent-amber-dim)', color:isDone?'var(--accent-green)':'var(--accent-amber)', marginBottom:2, display:'flex', alignItems:'center', justifyContent:'space-between', gap:2, cursor:'grab' }}>
                            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer', flex:1 }}
                              onClick={e => { e.stopPropagation(); openEditEvent(dateStr,i,ev) }}>
                              {isDone?'✓ ':''}{ev}
                            </span>
                            <span style={{ flexShrink:0, opacity:0.6, cursor:'pointer', padding:'0 2px' }}
                              onClick={e => { e.stopPropagation(); removeEvent(dateStr,i) }}>×</span>
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
                <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:8, height:8, borderRadius:2, background:'var(--accent-amber)' }} />추가 일정 (클릭=수정 · ×=삭제)</div>
                <div style={{ marginLeft:'auto', fontSize:10, color:'var(--accent-blue)', fontWeight:600 }}>드래그=일정 이동</div>
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

      {/* 일정 수정 모달 */}
      {editEvent && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setEditEvent(null)}>
          <div className="modal" style={{ maxWidth:400 }}>
            <div className="modal-header">
              <div className="modal-title">일정 수정</div>
              <button className="modal-close" onClick={() => setEditEvent(null)}>×</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="form-group">
                <label className="form-label">날짜</label>
                <div style={{ fontSize:12, color:'var(--text-secondary)', padding:'8px 12px', background:'var(--bg-hover)', borderRadius:6 }}>{editEvent.date}</div>
              </div>
              <div className="form-group">
                <label className="form-label">내용</label>
                <input className="form-input" type="text" value={editEventText} onChange={e => setEditEventText(e.target.value)} onKeyDown={e => e.key==='Enter'&&saveEditEvent()} autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditEvent(null)}>취소</button>
              <button className="btn btn-danger" onClick={() => { removeEvent(editEvent.date, editEvent.idx); setEditEvent(null) }}>삭제</button>
              <button className="btn btn-primary" onClick={saveEditEvent}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
