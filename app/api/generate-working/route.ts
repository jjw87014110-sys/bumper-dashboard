import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { date, author, todos, note } = await req.json()

    const prompt = `당신은 자동차 범퍼 후가공설비를 관리하는 생산기술 담당자의 업무일지를 작성해주는 AI입니다.

아래 정보를 바탕으로 업무일지를 작성해주세요:
- 날짜: ${date}
- 작성자: ${author} / 생산기술팀
- 완료한 업무: ${todos}
${note ? `- 특이사항: ${note}` : ''}

업무일지 작성 규칙:
1. 한국어로 작성
2. 각 업무별로 구체적인 수행 내용을 추론해서 작성
3. 형식: [날짜], [작성자/팀], [업무내용 번호 목록], [특이사항], [비고] 순서로
4. 전문적이고 간결하게 작성
5. 업무일지 내용만 출력 (설명 없이)

업무별 기본 내용 가이드:
- 변동점관리: 생산 변동점(재료, 금형, 설비 등) 발생 여부 확인 및 기록
- 제품 융착관리: 후가공설비 융착 조건 확인 및 불량 모니터링
- 찍힘 관리: 범퍼 찍힘 발생 여부 전수 점검 및 원인 파악
- 아이마킹: 담당 설비 아이마킹 조건 점검 및 기록
- 정비이력 관리: 설비 정비 이력 확인 및 데이터 업데이트
- 알람관리: 후가공설비 알람 발생 현황 점검 및 조치`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || '생성 실패'
    return NextResponse.json({ text })
  } catch (error) {
    return NextResponse.json({ error: '생성 실패' }, { status: 500 })
  }
}
