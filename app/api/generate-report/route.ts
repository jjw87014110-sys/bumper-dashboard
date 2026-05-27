import { NextRequest, NextResponse } from 'next/server'

// Vercel Edge Runtime 대신 Node 런타임 사용 (Anthropic SDK 호환성)
export const runtime = 'nodejs'
export const maxDuration = 30

type HistoryItem = { date: string; content: string }
type Project = {
  title: string
  category: string | null
  car_model: string | null
  equipment_type: string | null
  status: string
  history: HistoryItem[]
  next_plan: HistoryItem[]
}
type Maintenance = {
  maintenance_date: string
  equipment_no?: number
  defect_type?: string | null
  action_detail?: string | null
  note?: string | null
}
type CalendarEvent = { date: string; label: string }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      projects = [],
      maintenance = [],
      calendarEvents = [],
      weekStart = '',
      weekEnd = '',
      nextWeekStart = '',
      nextWeekEnd = '',
    }: {
      projects: Project[]
      maintenance: Maintenance[]
      calendarEvents: CalendarEvent[]
      weekStart: string
      weekEnd: string
      nextWeekStart: string
      nextWeekEnd: string
    } = body

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      // API 키 없으면 DB 데이터만으로 텍스트 생성 (폴백)
      const fallback = buildFallbackText({ projects, maintenance, calendarEvents, weekStart, weekEnd, nextWeekStart, nextWeekEnd })
      return NextResponse.json({ text: fallback, aiUsed: false })
    }

    // Claude API 프롬프트 구성
    const prompt = buildPrompt({ projects, maintenance, calendarEvents, weekStart, weekEnd, nextWeekStart, nextWeekEnd })

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      console.error('Claude API error:', errText)
      // 실패하면 폴백
      const fallback = buildFallbackText({ projects, maintenance, calendarEvents, weekStart, weekEnd, nextWeekStart, nextWeekEnd })
      return NextResponse.json({ text: fallback, aiUsed: false, error: 'AI 호출 실패, DB 데이터로 생성됨' })
    }

    const data = await aiResponse.json()
    const text = (data.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')

    return NextResponse.json({ text, aiUsed: true })
  } catch (e: any) {
    console.error('generate-report error:', e)
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}

function buildPrompt(p: {
  projects: Project[]
  maintenance: Maintenance[]
  calendarEvents: CalendarEvent[]
  weekStart: string
  weekEnd: string
  nextWeekStart: string
  nextWeekEnd: string
}): string {
  const projectsText = p.projects.length === 0
    ? '(없음)'
    : p.projects.map(pr => {
        const tags = [pr.car_model, pr.equipment_type, pr.category].filter(Boolean).join(' / ')
        const hist = (pr.history || []).map(h => `  - ${h.date}: ${h.content}`).join('\n')
        const plan = (pr.next_plan || []).map(h => `  - ${h.date}: ${h.content}`).join('\n')
        return `【${pr.title}】 ${tags ? `(${tags})` : ''}\n진행 이력:\n${hist || '  (없음)'}\n금주 계획:\n${plan || '  (없음)'}`
      }).join('\n\n')

  const maintText = p.maintenance.length === 0
    ? '(없음)'
    : p.maintenance.map(m => `- ${m.maintenance_date?.slice(5, 10) || ''}: 설비${m.equipment_no || ''} | ${m.defect_type || ''} | ${m.action_detail || m.note || ''}`).join('\n')

  const calText = p.calendarEvents.length === 0
    ? '(없음)'
    : p.calendarEvents.map(c => `- ${c.date.slice(5)}: ${c.label}`).join('\n')

  return `당신은 생산기술팀 조립/UT 담당의 주간 보고서 작성을 돕는 어시스턴트입니다.
아래 데이터를 바탕으로 BPR 후가공설비 관련 주간 보고서를 작성해 주세요.

# 보고서 양식 (이 구조 그대로 따라 작성)

## 추진 업무 (조립/UT)
- 진행 중인 주요 프로젝트를 번호 매겨서 정리
- 각 항목은 "프로젝트명 : 상세 내용 → 다음 단계" 형식
- 일정은 (3/16), (4/E), (~5/28) 형식으로 표기
- "→" 화살표로 단계 전개 표시

## 주간 업무 현황 (조립/UT)

### 전주 실적 (${p.weekStart} ~ ${p.weekEnd})
- 번호 매겨서 작성
- 각 항목: "1. [설비/프로젝트명] 작업 내용 ▷ 세부 설명"
- 날짜는 별도 컬럼처럼 우측에 표시 (예: 5/22)

### 금주 계획 (${p.nextWeekStart} ~ ${p.nextWeekEnd})
- 번호 매겨서 작성
- 같은 형식으로 작성

# 작성 스타일 가이드
- 자주 쓰는 키워드: 점검, 개선, 검토, 협의, 셋업, 양산, 수평전개, 이관, 반출
- 일정 표현: 5/16, 5/22, ~5/28, 5/E, 연중~
- 완료 표시: "완" 또는 "양호"
- 단계 표시: → ▷ ①②③
- 예시 문장:
  * "SP3 RR L/PLATE 펀칭기 안착 개선 : 안착 지그 개선(3/16) → 센서 및 인터록 추가(3/30~31)"
  * "BPR 후가공설비 점검 1) PLC 개선 작업(장비 원위치 미작동, 종료음 미출력) - 대상: SP3 FRT STD/GT H/L 융착기, LWR 복합기"

# 입력 데이터

## 진행 중인 프로젝트 (추진 업무 트래커)
${projectsText}

## 정비 이력 (전주 ${p.weekStart} ~ ${p.weekEnd})
${maintText}

## 캘린더 일정 (전주~금주)
${calText}

# 출력 요구사항
1. 위 양식 그대로 따라 작성 (마크다운 ## 제목 유지)
2. 빈 섹션이라도 "(없음)"으로 표시하지 말고, 데이터가 없으면 합리적으로 비워두기
3. 정비이력이 후가공설비와 관련 없으면 제외 가능
4. 복사해서 PPT에 바로 붙일 수 있는 깔끔한 텍스트로
5. 추측이나 가공된 내용 금지, 입력 데이터만 사용`
}

function buildFallbackText(p: {
  projects: Project[]
  maintenance: Maintenance[]
  calendarEvents: CalendarEvent[]
  weekStart: string
  weekEnd: string
  nextWeekStart: string
  nextWeekEnd: string
}): string {
  const lines: string[] = []
  lines.push('## 추진 업무 (조립/UT)')
  lines.push('')
  if (p.projects.length === 0) {
    lines.push('(등록된 진행 프로젝트 없음 — 추진 업무 트래커에서 추가해주세요)')
  } else {
    p.projects.forEach((pr, i) => {
      const tags = [pr.car_model, pr.equipment_type].filter(Boolean).join(' ')
      lines.push(`${i + 1}. ${pr.title}${tags ? ` (${tags})` : ''}`)
      ;(pr.history || []).forEach(h => lines.push(`   ▷ ${h.date}: ${h.content}`))
      if ((pr.next_plan || []).length > 0) {
        lines.push(`   → 금주 계획:`)
        ;(pr.next_plan || []).forEach(h => lines.push(`      • ${h.date}: ${h.content}`))
      }
      lines.push('')
    })
  }

  lines.push('')
  lines.push(`## 주간 업무 현황 (조립/UT)`)
  lines.push('')
  lines.push(`### 전주 실적 (${p.weekStart} ~ ${p.weekEnd})`)
  lines.push('')

  // 진행중 프로젝트의 history에서 이번 주에 해당하는 것 추출
  const histLines: string[] = []
  p.projects.forEach(pr => {
    (pr.history || []).forEach(h => {
      histLines.push(`- [${pr.title}] ${h.date}: ${h.content}`)
    })
  })
  if (histLines.length === 0 && p.maintenance.length === 0) {
    lines.push('(데이터 없음)')
  } else {
    histLines.forEach(l => lines.push(l))
    if (p.maintenance.length > 0) {
      lines.push('')
      lines.push('정비 이력:')
      p.maintenance.forEach(m => {
        lines.push(`- ${m.maintenance_date?.slice(5, 10) || ''}: 설비${m.equipment_no || ''} ${m.defect_type || ''} ${m.action_detail || m.note || ''}`)
      })
    }
  }

  lines.push('')
  lines.push(`### 금주 계획 (${p.nextWeekStart} ~ ${p.nextWeekEnd})`)
  lines.push('')
  const planLines: string[] = []
  p.projects.forEach(pr => {
    (pr.next_plan || []).forEach(h => {
      planLines.push(`- [${pr.title}] ${h.date}: ${h.content}`)
    })
  })
  if (planLines.length === 0 && p.calendarEvents.length === 0) {
    lines.push('(데이터 없음)')
  } else {
    planLines.forEach(l => lines.push(l))
    if (p.calendarEvents.length > 0) {
      lines.push('')
      lines.push('캘린더 일정:')
      p.calendarEvents.forEach(c => lines.push(`- ${c.date.slice(5)}: ${c.label}`))
    }
  }

  return lines.join('\n')
}
