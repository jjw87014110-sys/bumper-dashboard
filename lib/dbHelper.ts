import { supabase } from './supabase'
import type { PostgrestError } from '@supabase/supabase-js'

type DbResult<T> = { data: T | null; error: PostgrestError | null }

/**
 * Supabase 쿼리에 자동 에러 핸들링 추가
 *
 * 사용법:
 *   const data = await safeQuery(
 *     () => supabase.from('alarm').select('*'),
 *     (msg) => showToast(msg, 'error')
 *   )
 */
export async function safeQuery<T>(
  queryFn: () => PromiseLike<DbResult<T>>,
  onError?: (msg: string) => void,
  errorPrefix = '데이터 조회 실패'
): Promise<T | null> {
  try {
    const { data, error } = await queryFn()
    if (error) {
      console.error(errorPrefix, error)
      onError?.(`${errorPrefix}: ${error.message}`)
      return null
    }
    return data
  } catch (err: any) {
    console.error(errorPrefix, err)
    onError?.(`${errorPrefix}: ${err.message || '네트워크 오류'}`)
    return null
  }
}

/**
 * Supabase mutation (insert/update/delete) 에러 핸들링
 *
 * 사용법:
 *   const ok = await safeMutation(
 *     () => supabase.from('alarm').insert([row]),
 *     showToast,
 *     '등록되었습니다',
 *     '등록 실패'
 *   )
 */
export async function safeMutation(
  mutationFn: () => PromiseLike<{ error: PostgrestError | null }>,
  showToast?: (msg: string, type?: 'success' | 'error') => void,
  successMsg?: string,
  errorPrefix = '저장 실패'
): Promise<boolean> {
  try {
    const { error } = await mutationFn()
    if (error) {
      console.error(errorPrefix, error)
      showToast?.(`${errorPrefix}: ${error.message}`, 'error')
      return false
    }
    if (successMsg) showToast?.(successMsg, 'success')
    return true
  } catch (err: any) {
    console.error(errorPrefix, err)
    showToast?.(`${errorPrefix}: ${err.message || '네트워크 오류'}`, 'error')
    return false
  }
}
