// ============================================
// ERP 엑셀 파일 파싱 (보전반 근무시간)
// .xls 파일 (구버전) 지원
// ============================================
import * as XLSX from 'xlsx'

export interface WorktimeRecord {
  staff_name: string
  date: string         // YYYY-MM-DD
  in_time: string | null   // HH:MM
  out_time: string | null  // HH:MM
  work_hours: number | null  // 점심 1h 차감 후
  shift_type: string | null  // 주간 / 야간
  is_holiday: boolean
  is_overtime: boolean
  note: string | null
}

/**
 * HHMM 형식의 시각 (예: 1830, 0650) 을 HH:MM 으로 변환
 */
function formatTime(raw: any): string | null {
  if (!raw && raw !== 0) return null
  const str = String(raw).trim()
  if (!str || str === '-' || str === ' ') return null
  // 0650 또는 650 형식
  const padded = str.padStart(4, '0')
  if (padded.length !== 4) return null
  const hh = padded.slice(0, 2)
  const mm = padded.slice(2, 4)
  if (!/^\d{2}$/.test(hh) || !/^\d{2}$/.test(mm)) return null
  if (Number(hh) > 23 || Number(mm) > 59) return null
  return `${hh}:${mm}`
}

/**
 * 근무시간 계산 (점심 1시간 차감 일률 적용)
 * 야간 근무는 자정을 넘어가므로 +24h 처리
 */
function calculateWorkHours(inTime: string | null, outTime: string | null): { hours: number | null; shiftType: string | null } {
  if (!inTime || !outTime) return { hours: null, shiftType: null }

  const [inH, inM] = inTime.split(':').map(Number)
  const [outH, outM] = outTime.split(':').map(Number)

  let inMinutes = inH * 60 + inM
  let outMinutes = outH * 60 + outM

  // 야간 근무: 퇴근이 출근보다 작으면 +24h
  if (outMinutes < inMinutes) {
    outMinutes += 24 * 60
  }

  const diffMinutes = outMinutes - inMinutes
  // 점심 1시간(60분) 일률 차감
  const workMinutes = diffMinutes - 60
  if (workMinutes <= 0) return { hours: 0, shiftType: null }

  const hours = Math.round((workMinutes / 60) * 100) / 100

  // 주간/야간 판정: 출근 시간이 12시 이전이면 주간, 이후면 야간
  const shiftType = inH < 12 ? '주간' : '야간'

  return { hours, shiftType }
}

/**
 * 잔업 여부 판정
 * 주간: 17:00 초과 퇴근
 * 야간: 05:00 초과 퇴근
 */
function isOvertime(outTime: string | null, shiftType: string | null): boolean {
  if (!outTime || !shiftType) return false
  const [outH, outM] = outTime.split(':').map(Number)
  const outMinutes = outH * 60 + outM
  if (shiftType === '주간') {
    return outMinutes > 17 * 60  // 17:00 초과
  } else {
    // 야간: 05:00 초과 (단, 야간은 자정 넘어 새벽에 끝나니 05:00 이전 시간도 의미)
    // outH가 12 미만이면 새벽 시간이므로 05:00 초과 시 잔업
    if (outH < 12) {
      return outMinutes > 5 * 60
    }
    return true
  }
}

/**
 * ERP 엑셀 파일 1개 파싱
 * @param file File 객체 (.xls)
 * @param year 연도 (예: 2026)
 * @param month 월 (1~12)
 */
export async function parseErpExcel(
  file: File,
  year: number,
  month: number
): Promise<WorktimeRecord[]> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]

  // JSON 변환 (헤더 포함)
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (rows.length < 2) return []

  // 헤더 매핑
  const headers = (rows[0] as any[]).map(h => String(h || '').toLowerCase().trim())
  const colNm = headers.indexOf('nm')
  const colYmd = headers.indexOf('ymd')
  const colHuil = headers.indexOf('huil')
  const colIntime = headers.indexOf('intime')
  const colOuttime = headers.indexOf('outtime')

  if (colNm < 0 || colYmd < 0 || colIntime < 0 || colOuttime < 0) {
    throw new Error('엑셀 형식이 올바르지 않습니다. (필수 컬럼: nm, ymd, intime, outtime)')
  }

  const results: WorktimeRecord[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as any[]
    const name = String(row[colNm] || '').trim()
    const ymdRaw = row[colYmd]
    if (!name || !ymdRaw) continue

    // 날짜 처리: DD만 있음 → year/month 결합
    const day = Number(String(ymdRaw).padStart(2, '0'))
    if (isNaN(day) || day < 1 || day > 31) continue

    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const huil = String(row[colHuil] || '').trim().toUpperCase()
    const inTime = formatTime(row[colIntime])
    const outTime = formatTime(row[colOuttime])

    const { hours, shiftType } = calculateWorkHours(inTime, outTime)
    const overtime = isOvertime(outTime, shiftType)

    results.push({
      staff_name: name,
      date,
      in_time: inTime,
      out_time: outTime,
      work_hours: hours,
      shift_type: shiftType,
      is_holiday: huil === 'Y',
      is_overtime: overtime,
      note: null,
    })
  }

  return results
}

/**
 * 주차 계산 (월요일 시작 ~ 일요일 종료)
 * 반환: { weekStart, weekEnd } in YYYY-MM-DD
 */
export function getWeekRange(date: Date): { weekStart: string; weekEnd: string } {
  const d = new Date(date)
  const day = d.getDay()
  // 월요일을 시작: 일요일(0)이면 -6, 그 외 (day - 1)
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const fmt = (x: Date) => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) }
}

/**
 * 근무시간 예측 (단순 평균)
 * @returns { currentTotal, daysWorked, daysRemaining, predicted, status }
 */
export function predictWeeklyHours(
  records: WorktimeRecord[],
  weekStart: string,
  weekEnd: string
): {
  currentTotal: number
  daysWorked: number
  daysRemaining: number
  avgPerDay: number
  predictedTotal: number
  status: 'normal' | 'warning' | 'over'
} {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  const weekRecords = records.filter(r => r.date >= weekStart && r.date <= weekEnd)
  const workedRecords = weekRecords.filter(r => r.work_hours && r.work_hours > 0 && r.date <= todayStr)

  const currentTotal = workedRecords.reduce((sum, r) => sum + (r.work_hours || 0), 0)
  const daysWorked = workedRecords.length

  // 남은 일수 계산: 오늘 이후 ~ 주말까지
  const end = new Date(weekEnd)
  let daysRemaining = 0
  if (today < end) {
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    daysRemaining = Math.ceil((end.getTime() - tomorrow.getTime()) / (86400000)) + 1
  }

  const avgPerDay = daysWorked > 0 ? currentTotal / daysWorked : 0
  const predictedTotal = currentTotal + avgPerDay * daysRemaining

  let status: 'normal' | 'warning' | 'over' = 'normal'
  if (predictedTotal >= 64 || currentTotal >= 64) status = 'over'
  else if (predictedTotal >= 52 || currentTotal >= 52) status = 'warning'

  return {
    currentTotal: Math.round(currentTotal * 100) / 100,
    daysWorked,
    daysRemaining,
    avgPerDay: Math.round(avgPerDay * 100) / 100,
    predictedTotal: Math.round(predictedTotal * 100) / 100,
    status,
  }
}
