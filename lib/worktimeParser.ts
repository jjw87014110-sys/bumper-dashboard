// ============================================
// ERP 엑셀 파일 파싱 (.xls / .xlsx 모두 지원)
// 한글 인코딩 자동 처리
// ============================================
import * as XLSX from 'xlsx'

export interface WorktimeRecord {
  staff_name: string
  date: string
  in_time: string | null
  out_time: string | null
  work_hours: number | null
  shift_type: string | null
  is_holiday: boolean
  is_overtime: boolean
  note: string | null
}

// 파일명에서 이름 추출 (보전반 4명 화이트리스트)
const KNOWN_STAFF = ['이동주', '이수열', '정수연', '차상정']

function extractStaffNameFromFilename(filename: string): string | null {
  for (const name of KNOWN_STAFF) {
    if (filename.includes(name)) return name
  }
  return null
}

function formatTime(raw: any): string | null {
  if (!raw && raw !== 0) return null
  const str = String(raw).trim()
  if (!str || str === '-' || str === ' ') return null
  const padded = str.padStart(4, '0')
  if (padded.length !== 4) return null
  const hh = padded.slice(0, 2)
  const mm = padded.slice(2, 4)
  if (!/^\d{2}$/.test(hh) || !/^\d{2}$/.test(mm)) return null
  if (Number(hh) > 23 || Number(mm) > 59) return null
  return `${hh}:${mm}`
}

function calculateWorkHours(inTime: string | null, outTime: string | null): { hours: number | null; shiftType: string | null } {
  if (!inTime || !outTime) return { hours: null, shiftType: null }
  const [inH, inM] = inTime.split(':').map(Number)
  const [outH, outM] = outTime.split(':').map(Number)
  let inMinutes = inH * 60 + inM
  let outMinutes = outH * 60 + outM
  if (outMinutes < inMinutes) outMinutes += 24 * 60
  const diffMinutes = outMinutes - inMinutes
  const workMinutes = diffMinutes - 60
  if (workMinutes <= 0) return { hours: 0, shiftType: null }
  const hours = Math.round((workMinutes / 60) * 100) / 100
  const shiftType = inH < 12 ? '주간' : '야간'
  return { hours, shiftType }
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

export async function parseErpExcel(
  file: File,
  year: number,
  month: number
): Promise<WorktimeRecord[]> {
  const buffer = await file.arrayBuffer()
  // codepage 949: EUC-KR(CP949) - 한국 ERP 시스템 호환
  const wb = XLSX.read(buffer, { type: 'array', codepage: 949 })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]

  const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (rows.length < 2) return []

  // 헤더 매핑 (대소문자 무시)
  const headers = (rows[0] as any[]).map(h => String(h || '').toLowerCase().trim())
  const colNm = headers.indexOf('nm')
  const colYmd = headers.indexOf('ymd')
  const colHuil = headers.indexOf('huil')
  const colIntime = headers.indexOf('intime')
  const colOuttime = headers.indexOf('outtime')

  if (colYmd < 0 || colIntime < 0 || colOuttime < 0) {
    throw new Error('엑셀 형식이 올바르지 않습니다. 필수 컬럼: ymd, intime, outtime')
  }

  // 이름은 파일명에서 추출 (인코딩 안전)
  const staffNameFromFile = extractStaffNameFromFilename(file.name)

  const results: WorktimeRecord[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as any[]
    
    // 이름: 1) 파일명에서 우선, 2) 엑셀 nm 컬럼, 3) 둘 다 없으면 스킵
    let name = staffNameFromFile
    if (!name && colNm >= 0) {
      const nmValue = String(row[colNm] || '').trim()
      // 알려진 이름 중 매칭되는 게 있으면 사용
      for (const known of KNOWN_STAFF) {
        if (nmValue.includes(known) || known.includes(nmValue)) {
          name = known
          break
        }
      }
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
      shift_type: shiftType,
      is_holiday: huil === 'Y',
      is_overtime: overtime,
      note: null,
    })
  }

  return results
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
  const workedRecords = weekRecords.filter(r => r.work_hours && r.work_hours > 0 && r.date <= todayStr)

  const currentTotal = workedRecords.reduce((sum, r) => sum + (r.work_hours || 0), 0)
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
