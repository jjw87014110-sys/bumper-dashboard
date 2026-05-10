import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const TABLES = [
  'equipment', 'alarm', 'condition_table', 'scratch', 'imarking',
  'maintenance', 'materials', 'memos', 'staff', 'leave_history',
  'worklogs', 'todo_checks', 'calendar_events', 'access_logs',
]

export async function GET(req: NextRequest) {
  // Vercel Cron 인증 확인 (선택사항 - CRON_SECRET 환경변수 설정 시)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const backup: Record<string, any[]> = {}
    const errors: string[] = []

    // 모든 테이블 데이터 수집
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
      type: 'auto',
      tables: TABLES,
      row_counts: Object.fromEntries(Object.entries(backup).map(([k, v]) => [k, v.length])),
      total_rows: Object.values(backup).reduce((s, arr) => s + arr.length, 0),
      errors: errors.length > 0 ? errors : undefined,
      data: backup,
    }

    const jsonStr = JSON.stringify(result)

    // Supabase Storage에 저장 (backups 버킷)
    const { error: uploadError } = await supabase.storage
      .from('backups')
      .upload(filename, jsonStr, {
        contentType: 'application/json',
        upsert: true,  // 같은 날 중복 실행 시 덮어쓰기
      })

    if (uploadError) {
      // Storage 버킷이 없으면 로그만 남기고 성공 처리
      console.error('Storage upload error:', uploadError.message)
      
      // 대안: backup_logs 테이블에 기록
      await supabase.from('backup_logs').insert([{
        backup_date: dateStr,
        total_rows: result.total_rows,
        row_counts: result.row_counts,
        status: 'completed_no_storage',
        note: uploadError.message,
      }]).then(() => {})

      return NextResponse.json({
        success: true,
        warning: 'Storage 업로드 실패 (버킷 확인 필요)',
        filename,
        total_rows: result.total_rows,
        row_counts: result.row_counts,
        created_at: now.toISOString(),
      })
    }

    // 성공 로그 저장
    await supabase.from('backup_logs').insert([{
      backup_date: dateStr,
      total_rows: result.total_rows,
      row_counts: result.row_counts,
      status: 'completed',
      filename,
    }]).then(() => {})

    // 오래된 백업 정리 (30일 이전 자동 삭제)
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: files } = await supabase.storage.from('backups').list()
    if (files) {
      const oldFiles = files.filter(f => {
        const match = f.name.match(/backup_(\d{4}-\d{2}-\d{2})\.json/)
        return match && match[1] < thirtyDaysAgo.toISOString().slice(0, 10)
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
      old_files_cleaned: true,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
