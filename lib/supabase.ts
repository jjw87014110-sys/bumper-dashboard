import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rdpkmwtwmfjprylzxboe.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkcGttd3R3bWZqcHJ5bHp4Ym9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNTk0MDksImV4cCI6MjA5MjkzNTQwOX0.0EXeB-X-0SHRMZWY1ahG8lmjV1Fv1FsjU7T4OqNyfug'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
