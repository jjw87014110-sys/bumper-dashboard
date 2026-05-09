// =============================================
// 공통 타입 정의
// =============================================

export interface Equipment {
  no: number
  name: string
  model: string
  type: '복합기' | '융착기' | '펀칭기' | '지그'
}

export interface AlarmRecord {
  id: number
  equipment_no: number
  date: string
  punch_alarm: number
  weld_alarm: number
  holder_no: string | null
  note: string | null
  created_at?: string
  updated_at?: string
}

export interface ConditionRecord {
  id: number
  equipment_no: number
  change_date: string
  category: string
  mode: string
  unit: string
  value: number
  holder_no: string | null
  note: string | null
  created_at?: string
  updated_at?: string
}

export interface ScratchRecord {
  id: number
  equipment_no: number
  date: string
  time_of_day: string
  model: string
  category: string
  scratch_location: string
  jig_status: string
  equipment_issue: string
  action: string
  note: string | null
  image_url: string | null
  created_at?: string
}

export interface MaintenanceRecord {
  id: number
  equipment_no: number
  maintenance_date: string
  shift: string
  worker: string
  alarm_content: string
  defect_type: string
  action_detail: string
  replaced_parts: string
  note: string | null
  created_at?: string
}

export interface MaterialRecord {
  id: number
  equipment_no: number
  item_no: string
  item_name: string
  spec: string
  maker: string
  unit: string
  quantity: number
  note: string | null
  created_at?: string
}

export interface StaffMember {
  id: number
  name: string
  department: string
  employee_no: string
  groupware_id: string
  email: string
  microsoft_id: string
  position: string
  total_leave: number
}

export interface LeaveRecord {
  id: number
  staff_id: number
  use_date: string
  days: number
  reason: string
  note: string | null
}

export interface MemoRecord {
  id: number
  title: string
  content: string
  created_at: string
  updated_at: string
}

export interface TodoCheck {
  id: number
  date: string
  todo_key: string
  is_custom: boolean
  checked: boolean
}

export interface CalendarEvent {
  id: number
  date: string
  label: string
}

export const TYPE_COLORS: Record<string, string> = {
  '복합기': 'badge-blue',
  '융착기': 'badge-green',
  '펀칭기': 'badge-amber',
  '지그': 'badge-gray',
}
