// ============================================
// ERP 파일 파싱 (.xls / .xlsx / .html 지원)
// 한글 인코딩 자동 처리
// ============================================
import * as XLSX from 'xlsx'

export interface WorktimeRecord {
  staff_name: string
  date: string
  in_time: string | null
  out_time: string | null
  work_hours: number | null
  overtime_minutes: number
  shift_type: string | null
  is_holiday: boolean
  is_overtime: boolean
  note: string | null
}

// 분 → "X시간 Y분" 표시 헬퍼
export function formatMinutes(min: number): string {
  if (!min || min <= 0) return '0분'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h > 0 && m > 0) return `${h}시간 ${m}분`
  if (h > 0) return `${h}시간`
  return `${m}분`
}

const KNOWN_STAFF = ['이동주', '이수열', '정수연', '차상정']

function extractStaffNameFromFilename(filename: string): string | null {
  for (const name of KNOWN_STAFF) {
    if (filename.includes(name)) return name
  }
  return null
}

function matchKnownStaff(name: string): string | null {
  if (!name) return null
  for (const known of KNOWN_STAFF) {
    if (name.includes(known) || known.includes(name)) return known
  }
  return null
}

function formatTime(raw: any): string | null {
  if (!raw && raw !== 0) return null
  const str = String(raw).trim()
  if (!str || str === '-' || str === ':' || str === ' ') return null

  // HH:MM 형식 처리
  if (str.includes(':')) {
    const parts = str.split(':')
    if (parts.length !== 2) return null
    const hh = parts[0].padStart(2, '0')
    const mm = parts[1].padStart(2, '0')
    if (!/^\d{2}$/.test(hh) || !/^\d{2}$/.test(mm)) return null
    if (Number(hh) > 23 || Number(mm) > 59) return null
    return `${hh}:${mm}`
  }

  // HHMM 형식 처리
  const padded = str.padStart(4, '0')
  if (padded.length !== 4) return null
  const hh = padded.slice(0, 2)
  const mm = padded.slice(2, 4)
  if (!/^\d{2}$/.test(hh) || !/^\d{2}$/.test(mm)) return null
  if (Number(hh) > 23 || Number(mm) > 59) return null
  return `${hh}:${mm}`
}

function calculateWorkHours(inTime: string | null, outTime: string | null): { hours: number | null; shiftType: string | null } {
  // 개선 로직: 출근 기록이 있으면 기본 근무 8시간 고정 (주/야간 무관)
  //           출근 기록이 없으면 0시간 (결근/미출근)
  //           잔업은 별도로 관리자가 입력 (overtime_minutes)
  if (!inTime) return { hours: 0, shiftType: null }

  const [inH] = inTime.split(':').map(Number)
  // 출근 12시 이전이면 주간, 이후면 야간 (보전반 교대 기준: 주간 08시 / 야간 20시)
  const shiftType = inH < 12 ? '주간' : '야간'
  // 기본 근무시간은 8시간 고정
  return { hours: 8, shiftType }
}

function isOvertime(outTime: string | null, shiftType: string | null): boolean {
  if (!outTime || !shiftType) return false
  const [outH, outM] = outTime.split(':').map(Number)
  const outMinutes = outH * 60 + outM
  if (shiftType === '주간') {
    return outMinutes > 17 * 60
  } else {
    if (outH < 12) {
      return outMinutes > 5 * 60
    }
    return true
  }
}

/**
 * HTML 파일 파싱 (ERP 출퇴근현황 다운로드)
 */
async function parseErpHtml(file: File, year: number, month: number): Promise<WorktimeRecord[]> {
  const buffer = await file.arrayBuffer()
  
  // EUC-KR 디코딩 시도, 실패 시 UTF-8
  // ERP 시스템이 EUC-KR로 HTML 출력하므로 먼저 euc-kr 디코딩 시도
  let text: string
  try {
    text = new TextDecoder('euc-kr').decode(buffer)
  } catch {
    text = new TextDecoder('utf-8').decode(buffer)
  }

  // 브라우저에서 HTML 파싱
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/html')
  const rows = doc.querySelectorAll('tr')

  const records: WorktimeRecord[] = []
  const staffNameFromFile = extractStaffNameFromFilename(file.name)

  rows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent?.trim() || '')
    if (cells.length < 12) return

    // ERP HTML 구조 (개선보전반 출퇴근현황):
    // [0]부서코드, [1]부서명(공백/병합), [2]성명, [3]사번,
    // [4]일자(DD), [5]요일, [6]휴일(Y), [7]휴가, [8]초과신청, [9]초과시간,
    // [10]출근시간(HH:MM), [11]퇴근시간(HH:MM), [12...] 출입내역
    
    const nameRaw = cells[2] || ''
    const ymdRaw = cells[4] || ''
    const huil = (cells[6] || '').toUpperCase()
    let inTimeRaw = cells[10] || ''
    let outTimeRaw = cells[11] || ''

    // 일자 검증 (DD 숫자만)
    const day = Number(ymdRaw)
    if (isNaN(day) || day < 1 || day > 31) return

    // 이름 결정
    let name = matchKnownStaff(nameRaw) || staffNameFromFile
    if (!name) return

    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const inTime = formatTime(inTimeRaw)
    const outTime = formatTime(outTimeRaw)
    const { hours, shiftType } = calculateWorkHours(inTime, outTime)
    const overtime = isOvertime(outTime, shiftType)

    records.push({
      staff_name: name,
      date,
      in_time: inTime,
      out_time: outTime,
      work_hours: hours,
      overtime_minutes: 0,
      shift_type: shiftType,
      is_holiday: huil === 'Y',
      is_overtime: overtime,
      note: null,
    })
  })

  return records
}

/**
 * Excel 파일 파싱 (.xls / .xlsx)
 */
async function parseErpExcelFile(file: File, year: number, month: number): Promise<WorktimeRecord[]> {
  const buffer = await file.arrayBuffer()
  // codepage 949: ERP .xls 파일이 CP949(EUC-KR) 인코딩
  const wb = XLSX.read(buffer, { type: 'array', codepage: 949 })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]

  const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (rows.length < 2) return []

  const headers = (rows[0] as any[]).map(h => String(h || '').toLowerCase().trim())
  const colNm = headers.indexOf('nm')
  const colYmd = headers.indexOf('ymd')
  const colHuil = headers.indexOf('huil')
  const colIntime = headers.indexOf('intime')
  const colOuttime = headers.indexOf('outtime')

  if (colYmd < 0 || colIntime < 0 || colOuttime < 0) {
    throw new Error('엑셀 형식 오류: 필수 컬럼(ymd, intime, outtime) 누락')
  }

  const staffNameFromFile = extractStaffNameFromFilename(file.name)
  const results: WorktimeRecord[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as any[]

    let name = staffNameFromFile
    if (!name && colNm >= 0) {
      const nmValue = String(row[colNm] || '').trim()
      name = matchKnownStaff(nmValue)
    }
    if (!name) continue

    const ymdRaw = row[colYmd]
    if (!ymdRaw) continue

    const day = Number(String(ymdRaw).padStart(2, '0'))
    if (isNaN(day) || day < 1 || day > 31) continue

    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const huil = colHuil >= 0 ? String(row[colHuil] || '').trim().toUpperCase() : ''
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
      overtime_minutes: 0,
      shift_type: shiftType,
      is_holiday: huil === 'Y',
      is_overtime: overtime,
      note: null,
    })
  }

  return results
}

/**
 * 통합 파서: 파일 확장자에 따라 자동 라우팅
 */
export async function parseErpExcel(
  file: File,
  year: number,
  month: number
): Promise<WorktimeRecord[]> {
  const filename = file.name.toLowerCase()
  
  if (filename.endsWith('.html') || filename.endsWith('.htm')) {
    return parseErpHtml(file, year, month)
  }
  
  return parseErpExcelFile(file, year, month)
}

export function getWeekRange(date: Date): { weekStart: string; weekEnd: string } {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (x: Date) => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) }
}

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
  // 출근 기록이 있으면 근무시간이 비어있어도(공휴일/과거 데이터) 기본 8시간으로 간주
  const eff = (r: WorktimeRecord) => (r.work_hours && r.work_hours > 0) ? r.work_hours : (r.in_time ? 8 : 0)
  const workedRecords = weekRecords.filter(r => eff(r) > 0 && r.date <= todayStr)

  // 기본 근무시간(8h 고정) 합계 + 잔업(분→시간) 합계
  const baseTotal = workedRecords.reduce((sum, r) => sum + eff(r), 0)
  const overtimeTotal = workedRecords.reduce((sum, r) => sum + ((r.overtime_minutes || 0) / 60), 0)
  const currentTotal = baseTotal + overtimeTotal
  const daysWorked = workedRecords.length

  const end = new Date(weekEnd)
  let daysRemaining = 0
  if (today < end) {
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    daysRemaining = Math.ceil((end.getTime() - tomorrow.getTime()) / (86400000)) + 1
  }

  const avgPerDay = daysWorked > 0 ? currentTotal / daysWorked : 0
  const predictedTotal = currentTotal + avgPerDay * daysRemaining

  // 근로기준법 제53조: 주 52시간 주의선, 64시간 법정 한도
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
