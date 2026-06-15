// ============================================
// 공통 상수 및 임계값
// 한 곳에서 관리하여 변경 시 전체 적용
// ============================================

// 알람/정비 임계값
export const THRESHOLDS = {
  MONTHLY_ALARM: 10,        // 월간 알람 임계값
  MAINTENANCE_DUE_DAYS: 7,  // 정비 예정 알림 일수
  DEFAULT_MAINTENANCE_CYCLE: 30, // 기본 정비 주기 (일)
  INACTIVITY_MINUTES: 30,   // 비활동 자동 로그아웃 (분)
  SESSION_HOURS: 8,         // 세션 만료 (시간)
  LOGIN_MAX_ATTEMPTS: 5,    // 로그인 최대 시도 횟수
  LOGIN_BLOCK_MINUTES: 10,  // 로그인 차단 시간 (분)
  PIN_MAX_ATTEMPTS: 5,      // PIN 최대 시도 횟수
} as const

// 색상 (CSS 변수 매핑)
export const COLORS = {
  BLUE: 'var(--accent-blue)',
  GREEN: 'var(--accent-green)',
  AMBER: 'var(--accent-amber)',
  RED: 'var(--accent-red)',
  TEAL: 'var(--accent-teal)',
  PURPLE: 'var(--accent-purple)',
} as const

// 상태별 색상 매핑
export const STATUS_COLORS: Record<string, string> = {
  '정상': 'var(--accent-green)',
  '주의': 'var(--accent-amber)',
  '경고': 'var(--accent-amber)',
  '위험': 'var(--accent-red)',
  '오류': 'var(--accent-red)',
  '완료': 'var(--accent-green)',
  '진행중': 'var(--accent-blue)',
  '대기': 'var(--text-muted)',
}

// 설비 유형
export const EQUIPMENT_TYPES = ['복합기', '융착기', '펀칭기', '지그'] as const
export type EquipmentType = typeof EQUIPMENT_TYPES[number]

// 설비 유형별 배지 색상 (5개 파일에서 중복 정의되던 것을 통합)
export const TYPE_COLORS: Record<string, string> = {
  '복합기': 'badge-blue',
  '융착기': 'badge-green',
  '펀칭기': 'badge-amber',
  '지그': 'badge-gray',
}

// 설비번호 포맷 (#01, #02 ...) — 35곳에서 중복 사용되던 패턴
export function formatEqNo(no: number | string): string {
  return `#${String(no).padStart(2, '0')}`
}

// 모델 종류
export const MODELS = ['OV1', 'SP3', 'NQ5', 'CN12', 'SX2', 'KA4', 'CK', 'JX', 'KB'] as const

// 시간대
export const TIME_OF_DAY = ['오전', '오후'] as const

// 날짜 헬퍼
export function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function today(): string {
  return toLocalDate(new Date())
}

export function daysFromToday(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toLocalDate(d)
}

export function diffDays(date1: string, date2: string): number {
  const d1 = new Date(date1).getTime()
  const d2 = new Date(date2).getTime()
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24))
}

export function formatDate(date: string, format: 'short' | 'long' = 'short'): string {
  if (!date) return '-'
  const d = new Date(date)
  if (format === 'long') {
    return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`
  }
  return date
}

// 숫자 포맷
export function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR')
}

// CSV 안전 처리
export function csvEscape(value: any): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
