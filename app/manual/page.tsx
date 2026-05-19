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

  const active = MANUALS.find(m => m.id === activeId) || MANUALS[0]

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>업무 매뉴얼</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>후가공설비 관리 업무 표준 절차서</div>
          </div>
        </div>

        <div className="content-area">
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
        </div>
      </div>
    </div>
  )
}
