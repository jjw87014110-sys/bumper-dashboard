import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const TABLES = [
  'equipment',
  'alarm',
  'condition_table',
  'scratch',
  'imarking',
  'maintenance',
  'materials',
  'memos',
  'staff',
  'leave_history',
  'worklogs',
  'todo_checks',
  'calendar_events',
  'access_logs',
]

export async function GET() {
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

    const result = {
      version: '1.0',
      created_at: new Date().toISOString(),
      tables: TABLES,
      row_counts: Object.fromEntries(Object.entries(backup).map(([k, v]) => [k, v.length])),
      total_rows: Object.values(backup).reduce((s, arr) => s + arr.length, 0),
      errors: errors.length > 0 ? errors : undefined,
      data: backup,
    }

    return new NextResponse(JSON.stringify(result, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup_${new Date().toISOString().slice(0,10)}.json"`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
