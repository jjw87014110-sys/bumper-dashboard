import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 현재 시스템의 모든 테이블 (19개)
const TABLES = [
  'equipment', 'alarm', 'condition_table', 'scratch', 'imarking',
  'maintenance', 'materials', 'memos', 'staff', 'leave_history',
  'todo_checks', 'calendar_events', 'access_logs', 'audit_logs',
  'backup_logs', 'users', 'worktime_staff', 'worktime_records',
]

// 격주 판별: ISO 주차 기준 짝수 주에만 실행
function isBiweeklyFriday(): boolean {
  const now = new Date()
  const jan1 = new Date(now.getFullYear(), 0, 1)
  const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000)
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7)
  return weekNum % 2 === 0
}

export async function GET(req: NextRequest) {
  // Vercel Cron 인증
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 격주 체크: 홀수 주면 스킵
  if (!isBiweeklyFriday()) {
    return NextResponse.json({ success: true, skipped: true, reason: '격주 주기 아님 (홀수 주)' })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const backup: Record<string, any[]> = {}
    const errors: string[] = []

    for (const table of TABLES) {
      const { data, error } = await supabase.from(table).select('*')
      if (error) {
        errors.push(`${table}: ${error.message}`)
        backup[table] = []
      } else {
        backup[table] = data || []
      }
    }

    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    const filename = `backup_${dateStr}.json`

    const result = {
      version: '1.0',
      created_at: now.toISOString(),
      type: 'auto_biweekly',
      tables: TABLES,
      row_counts: Object.fromEntries(Object.entries(backup).map(([k, v]) => [k, v.length])),
      total_rows: Object.values(backup).reduce((s, arr) => s + arr.length, 0),
      errors: errors.length > 0 ? errors : undefined,
      data: backup,
    }

    const jsonStr = JSON.stringify(result)

    // Supabase Storage에 저장
    const { error: uploadError } = await supabase.storage
      .from('backups')
      .upload(filename, jsonStr, {
        contentType: 'application/json',
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError.message)
      await supabase.from('backup_logs').insert([{
        backup_date: dateStr,
        total_rows: result.total_rows,
        row_counts: result.row_counts,
        status: 'completed_no_storage',
        note: `자동 격주 백업 (Storage 실패: ${uploadError.message})`,
      }]).then(() => {})

      return NextResponse.json({
        success: true,
        warning: 'Storage 업로드 실패 (버킷 확인 필요)',
        filename,
        total_rows: result.total_rows,
        row_counts: result.row_counts,
      })
    }

    // 성공 로그
    await supabase.from('backup_logs').insert([{
      backup_date: dateStr,
      total_rows: result.total_rows,
      row_counts: result.row_counts,
      status: 'completed',
      filename,
      note: '자동 격주 백업',
    }]).then(() => {})

    // 60일 이전 백업 자동 정리
    const sixtyDaysAgo = new Date(now)
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    const { data: files } = await supabase.storage.from('backups').list()
    if (files) {
      const oldFiles = files.filter(f => {
        const match = f.name.match(/backup_(\d{4}-\d{2}-\d{2})\.json/)
        return match && match[1] < sixtyDaysAgo.toISOString().slice(0, 10)
      })
      if (oldFiles.length > 0) {
        await supabase.storage.from('backups').remove(oldFiles.map(f => f.name))
      }
    }

    return NextResponse.json({
      success: true,
      filename,
      total_rows: result.total_rows,
      row_counts: result.row_counts,
      created_at: now.toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
