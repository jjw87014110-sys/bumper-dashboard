'use client'
import { useState } from 'react'
import { useRequireAuth } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'

interface ManualSection {
  id: string
  icon: string
  title: string
  category: string
  description: string
  steps: { num: number; text: string; subSteps?: string[] }[]
  tips?: string[]
}

// FAQ
const FAQS = [
  { q: '알람을 입력했는데 어떻게 수정하나요?', a: 'Alarm 페이지에서 해당 알람 행 클릭 → 수정 버튼 클릭 → 내용 변경 후 저장' },
  { q: '캘린더에 일정을 추가했는데 다른 날짜로 옮기고 싶어요', a: 'Dashboard 캘린더에서 일정을 마우스로 잡고 원하는 날짜로 드래그하면 이동됩니다' },
  { q: '실수로 데이터를 삭제했어요', a: 'Security 페이지 > 데이터 변경 이력에서 누가 언제 삭제했는지 확인 가능. 복구는 Backup 페이지에서 백업 파일로 복원 가능' },
  { q: '비밀번호를 잊어버렸어요', a: '관리자에게 문의하세요. Security 페이지에서 관리자가 비밀번호 초기화 가능' },
  { q: '핸드폰에서도 사용 가능한가요?', a: '네, 모바일 반응형으로 제작되어 휴대폰 브라우저에서 정상 작동합니다' },
  { q: '자재 부족 알림이 왜 안 떠요?', a: 'Materials 페이지에서 각 자재에 "최소 재고" 값을 0보다 큰 숫자로 설정해야 알림이 작동합니다' },
  { q: '정비 예정 알림은 어떻게 작동하나요?', a: 'Equipment에서 설정한 "정비 주기"와 Maintenance의 마지막 정비일을 비교하여 7일 이내 도래 시 자동 표시' },
  { q: '데이터를 엑셀로 받을 수 있나요?', a: '각 페이지 상단에 CSV 내보내기 버튼이 있습니다. Reports 페이지에서도 다운로드 가능' },
  { q: 'Ctrl+K가 뭐예요?', a: '어디서든 Ctrl+K를 누르면 빠른 검색창이 열립니다. 페이지명/기능명 입력으로 빠르게 이동' },
]

// 용어 사전
const GLOSSARY = [
  { term: '융착', def: '플라스틱을 열로 녹여 붙이는 공정. 융착 에너지/시간/압력 등의 파라미터로 제어' },
  { term: '펀칭', def: '제품에 구멍을 뚫는 공정. 펀치 핀의 마모도가 불량률에 직결' },
  { term: '아이마킹 (i-Marking)', def: '주요 볼트나 클램프 위치에 잉크로 표시. 풀림이나 이동 여부를 시각적으로 확인하기 위함' },
  { term: '홀더 (Holder)', def: '제품을 고정하는 부품. LH(좌측), RH(우측)로 구분' },
  { term: '클램프 (Clamp)', def: '제품을 단단히 고정하는 장치' },
  { term: '스토퍼 (Stopper)', def: '제품의 위치를 멈추게 하는 장치' },
  { term: '융착혼 (Welding Horn)', def: '초음파 융착에서 진동을 전달하는 금속 부품' },
  { term: '에어압', def: '실린더 등을 작동시키는 공기 압력 (단위: bar 또는 kgf/cm²)' },
  { term: '찍힘 (Scratch)', def: '제품 표면의 흠집. 설비에 의한 것과 작업자/취급에 의한 것 구분' },
  { term: '미융착', def: '융착이 제대로 되지 않은 상태. 실제 분리 시도로 판정' },
  { term: '미펀칭', def: '구멍이 제대로 뚫리지 않은 상태' },
  { term: 'LH / RH', def: 'Left Hand(좌측) / Right Hand(우측)' },
  { term: 'FRT / RR', def: 'Front(앞) / Rear(뒤)' },
]

const MANUALS: ManualSection[] = [
  {
    id: 'alarm',
    icon: '🔔',
    title: '알람',
    category: 'Alarm Management',
    description: '전 설비의 융착 · 펀칭 관련 알람 기록을 관리합니다.',
    steps: [
      {
        num: 1,
        text: '오전 8시, 오후 4시에 전 설비의 융착 · 펀칭 관련 알람 발생 여부를 점검합니다.',
      },
      {
        num: 2,
        text: '설비에 알람이 있을 경우 다음 절차에 따라 처리합니다.',
        subSteps: [
          '후가공설비 일지 기입',
          '실제 미융착 / 미펀칭 여부 판정',
          '미융착 · 미펀칭일 경우 보전반 작업 이력 확인',
          '정비 내역 및 추가 자재 구입 필요 여부, 설비 파라미터 조정, 기구적 조정 여부 점검',
          '작업자 실수로 판단되는 경우 별도 조치 없이 종료',
        ],
      },
    ],
    tips: ['정기 점검 시간: 매일 08:00, 16:00'],
  },
  {
    id: 'scratch',
    icon: '🔍',
    title: '스크라치',
    category: 'Scratch Management',
    description: '오전 7시 30분, 오후 3시 30분 1라인 공정회의에서 나온 불량품 중 설비에 의한 스크라치를 판단하여 기록합니다.',
    steps: [
      {
        num: 1,
        text: '오전 7시 30분, 오후 3시 30분 1라인 공정회의에 참여하여 설비에 의한 스크라치 발생 여부를 점검합니다.',
      },
      {
        num: 2,
        text: '설비에 의한 스크라치가 확인되면, 후가공설비 시스템 > 스크라치 목록에 추가합니다.',
      },
      {
        num: 3,
        text: '설비에 의한 스크라치가 없으면 별도 등록 없이 종료합니다.',
      },
    ],
    tips: ['공정회의 참여 시간: 매일 07:30, 15:30'],
  },
  {
    id: 'imarking',
    icon: '📊',
    title: '아이마킹',
    category: 'i-Marking Inspection',
    description: '매일 1일 1설비씩 담당하여 후가공설비 아이마킹을 실시합니다.',
    steps: [
      {
        num: 1,
        text: '오전 7시 30분 조례 후, 해당 일자의 담당 설비로 이동합니다.',
      },
      {
        num: 2,
        text: '클램프, 스토퍼, 융착혼 등 설비 관련 모든 볼트를 점검하여 아이마킹을 실시합니다.',
      },
    ],
    tips: [
      '예외: 주말, 공휴일, 휴가, 함평 출근일 제외',
      '점검 시작 시간: 매일 07:30 조례 후',
    ],
  },
  {
    id: 'condition',
    icon: '⚙️',
    title: '조건표',
    category: 'Condition Table',
    description: '전 설비의 설비 파라미터를 관리합니다. 융착 에너지/출력/시간, 에어압, 펀칭 에너지/출력/시간 등을 관리합니다.',
    steps: [
      {
        num: 1,
        text: '전 설비 정비 또는 설비 파라미터 조정 시, 후가공설비 시스템에 변경된 데이터를 즉시 수정합니다.',
      },
    ],
    tips: [
      '관리 항목: 융착 에너지 / 출력 / 융착시간 / 에어압 / 펀칭 에너지 / 출력 / 융착시간',
      '파라미터 변경 시 반드시 즉시 기록',
    ],
  },
  {
    id: 'maintenance',
    icon: '🔧',
    title: '정비표',
    category: 'Maintenance Record',
    description: '전 설비의 정비이력을 관리합니다.',
    steps: [
      {
        num: 1,
        text: 'ERP 접속 → 자산/설비관리 → 조업일보목록 → 보전조업일보 → 조회출력',
      },
      {
        num: 2,
        text: '일자를 작일자로 설정하여 작일 조업일보 내용을 시스템에 기입합니다.',
      },
    ],
    tips: [
      '월요일에는 반드시 주말작업 이력까지 함께 확인',
      'ERP 경로: 자산/설비관리 > 조업일보목록 > 보전조업일보',
    ],
  },
  {
    id: 'materials',
    icon: '📦',
    title: '자재관리',
    category: 'Materials Management',
    description: '정비 시 사용한 자재를 스페어로 주문 · 관리합니다.',
    steps: [
      {
        num: 1,
        text: '작일 조업일보를 통해 사용된 자재를 조사하고 구매합니다.',
      },
    ],
    tips: ['스페어 자재 부족 시 즉시 구매 진행'],
  },
]

export default function ManualPage() {
  useRequireAuth()
  const [activeId, setActiveId] = useState<string>('alarm')
  const [tab, setTab] = useState<'manual' | 'faq' | 'glossary'>('manual')

  const active = MANUALS.find(m => m.id === activeId) || MANUALS[0]

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Manual</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>후가공설비 관리 업무 표준 절차서</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`btn btn-sm ${tab === 'manual' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('manual')}>📋 업무 매뉴얼</button>
            <button className={`btn btn-sm ${tab === 'faq' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('faq')}>❓ FAQ</button>
            <button className={`btn btn-sm ${tab === 'glossary' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('glossary')}>📚 용어사전</button>
          </div>
        </div>

        <div className="content-area">
          {tab === 'faq' ? (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>자주 묻는 질문 (FAQ)</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>총 {FAQS.length}건</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {FAQS.map((f, i) => (
                  <details key={i} style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <summary style={{ padding: '12px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: 'var(--accent-blue)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>Q{i+1}.</span>
                      <span>{f.q}</span>
                    </summary>
                    <div style={{ padding: '12px 16px 16px 42px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, background: 'var(--bg-hover)', borderTop: '1px solid var(--border)' }}>
                      {f.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ) : tab === 'glossary' ? (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>용어 사전</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>업무 관련 전문 용어 {GLOSSARY.length}개</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {GLOSSARY.map((g, i) => (
                  <div key={i} style={{ padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, borderLeft: '3px solid var(--accent-blue)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 6 }}>{g.term}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{g.def}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>

            {/* 좌측 매뉴얼 목록 */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'sticky', top: 80, alignSelf: 'flex-start' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 1 }}>
                목록
              </div>
              {MANUALS.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setActiveId(m.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    border: 'none',
                    background: activeId === m.id ? 'var(--accent-blue-dim)' : 'transparent',
                    borderLeft: `3px solid ${activeId === m.id ? 'var(--accent-blue)' : 'transparent'}`,
                    color: activeId === m.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: activeId === m.id ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'Pretendard, sans-serif',
                    transition: 'all 0.15s',
                    borderBottom: i < MANUALS.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                  onMouseEnter={e => { if (activeId !== m.id) { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' } }}
                  onMouseLeave={e => { if (activeId !== m.id) { (e.currentTarget as HTMLElement).style.background = 'transparent' } }}
                >
                  <span style={{ fontSize: 16 }}>{m.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div>{m.title}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1, fontFamily: 'JetBrains Mono, monospace' }}>{m.category}</div>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{i + 1}</span>
                </button>
              ))}
            </div>

            {/* 우측 매뉴얼 내용 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* 헤더 카드 */}
              <div className="card" style={{
                padding: '24px 28px',
                background: 'linear-gradient(135deg, var(--accent-blue-dim), transparent)',
                borderLeft: '4px solid var(--accent-blue)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                  <div style={{
                    width: 48, height: 48,
                    borderRadius: 12,
                    background: 'var(--accent-blue-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28,
                  }}>
                    {active.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--accent-blue)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1, marginBottom: 2 }}>
                      {active.category}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {active.title}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 8 }}>
                  {active.description}
                </div>
              </div>

              {/* 절차 카드 */}
              <div className="card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <div style={{ width: 4, height: 18, background: 'var(--accent-blue)', borderRadius: 2 }} />
                  <div style={{ fontSize: 14, fontWeight: 700 }}>업무 방법</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {active.steps.map(step => (
                    <div key={step.num} style={{ display: 'flex', gap: 14 }}>
                      {/* 단계 번호 */}
                      <div style={{
                        flexShrink: 0,
                        width: 28, height: 28,
                        borderRadius: '50%',
                        background: 'var(--accent-blue)',
                        color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}>
                        {step.num}
                      </div>
                      {/* 내용 */}
                      <div style={{ flex: 1, paddingTop: 4 }}>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7 }}>
                          {step.text}
                        </div>
                        {step.subSteps && (
                          <div style={{
                            marginTop: 12,
                            padding: '12px 16px',
                            background: 'var(--bg-hover)',
                            borderRadius: 8,
                            borderLeft: '2px solid var(--accent-blue)',
                          }}>
                            {step.subSteps.map((sub, i) => (
                              <div key={i} style={{
                                display: 'flex',
                                gap: 10,
                                fontSize: 12,
                                color: 'var(--text-secondary)',
                                lineHeight: 1.7,
                                padding: '4px 0',
                              }}>
                                <span style={{
                                  flexShrink: 0,
                                  width: 18, height: 18,
                                  borderRadius: '50%',
                                  background: 'var(--bg-surface)',
                                  border: '1px solid var(--accent-blue)',
                                  color: 'var(--accent-blue)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 9, fontWeight: 700,
                                  fontFamily: 'JetBrains Mono, monospace',
                                }}>
                                  {i + 1}
                                </span>
                                <span>{sub}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 핵심 포인트 */}
              {active.tips && active.tips.length > 0 && (
                <div className="card" style={{
                  padding: '18px 24px',
                  background: 'var(--accent-amber-dim)',
                  border: '1px solid var(--accent-amber)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 16 }}>💡</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-amber)' }}>
                      핵심 포인트
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {active.tips.map((tip, i) => (
                      <div key={i} style={{
                        fontSize: 12,
                        color: 'var(--text-primary)',
                        lineHeight: 1.7,
                        display: 'flex',
                        gap: 8,
                      }}>
                        <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>·</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 하단 네비게이션 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
                {(() => {
                  const idx = MANUALS.findIndex(m => m.id === activeId)
                  const prev = idx > 0 ? MANUALS[idx - 1] : null
                  const next = idx < MANUALS.length - 1 ? MANUALS[idx + 1] : null
                  return (
                    <>
                      {prev ? (
                        <button className="btn btn-ghost" onClick={() => setActiveId(prev.id)} style={{ flex: 1, justifyContent: 'flex-start' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>← 이전</span>
                          <span style={{ marginLeft: 8, fontSize: 12 }}>{prev.icon} {prev.title}</span>
                        </button>
                      ) : <div style={{ flex: 1 }} />}
                      {next ? (
                        <button className="btn btn-ghost" onClick={() => setActiveId(next.id)} style={{ flex: 1, justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: 12 }}>{next.icon} {next.title}</span>
                          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>다음 →</span>
                        </button>
                      ) : <div style={{ flex: 1 }} />}
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
