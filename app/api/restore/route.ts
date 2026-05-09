import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 복원 순서 (외래키 의존성 순서)
const RESTORE_ORDER = [
  'equipment',
  'staff',
  'alarm',
  'condition_table',
  'scratch',
  'imarking',
  'maintenance',
  'materials',
  'memos',
  'leave_history',
  'worklogs',
  'todo_checks',
  'calendar_events',
  'access_logs',
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const backupData = body.data

    if (!backupData || typeof backupData !== 'object') {
      return NextResponse.json({ error: '유효하지 않은 백업 파일입니다' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const results: Record<string, { deleted: number; inserted: number; error?: string }> = {}

    for (const table of RESTORE_ORDER) {
      const rows = backupData[table]
      if (!rows || !Array.isArray(rows)) {
        results[table] = { deleted: 0, inserted: 0, error: '데이터 없음' }
        continue
      }

      // 기존 데이터 삭제
      const { error: delError } = await supabase.from(table).delete().gte('id', 0)
      
      if (rows.length === 0) {
        results[table] = { deleted: 0, inserted: 0 }
        continue
      }

      // 50개씩 배치 INSERT
      let inserted = 0
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50)
        const { error: insError } = await supabase.from(table).insert(batch)
        if (insError) {
          results[table] = { deleted: 0, inserted, error: insError.message }
          break
        }
        inserted += batch.length
      }
      if (!results[table]) {
        results[table] = { deleted: rows.length, inserted }
      }
    }

    return NextResponse.json({
      success: true,
      restored_at: new Date().toISOString(),
      results,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
