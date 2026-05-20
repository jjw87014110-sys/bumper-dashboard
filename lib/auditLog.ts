import { supabase } from './supabase'

/**
 * 데이터 변경 이력 기록 (Audit Log)
 */
export async function logAudit(
  userName: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  targetTable: string,
  description: string,
  options?: {
    targetId?: number
    oldData?: any
    newData?: any
  }
) {
  try {
    await supabase.from('audit_logs').insert([{
      user_name: userName || '익명',
      action,
      target_table: targetTable,
      target_id: options?.targetId || null,
      description,
      old_data: options?.oldData || null,
      new_data: options?.newData || null,
    }])
  } catch (err) {
    console.error('Audit log 기록 실패:', err)
  }
}

/**
 * 현재 사용자명 가져오기 (localStorage 기반)
 */
export function getCurrentUserName(): string {
  if (typeof window === 'undefined') return '시스템'
  return localStorage.getItem('bumper_name') || '익명'
}
