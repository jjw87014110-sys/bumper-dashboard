'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function AlarmPage() {
  useAuth()
  const [equipment, setEquipment] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [eqLoading, setEqLoading] = useState(true)

  useEffect(() => {
    supabase.from('equipment').select('no,name,model,type,rr_frt').neq('type','지그').order('no')
      .then(({ data }) => { setEquipment(data || []); setEqLoading(false) })
  }, [])

  async function selectEquipment(eq: any) {
    setSelected(eq)
    setLoading(true)
    const { data } = await supabase.from('alarm').select('*').eq('equipment_no', eq.no).order('date', { ascending: false })
    setData(data || [])
    setLoading(false)
  }

  const typeColors: any = { '복합기': 'badge-blue', '융착기': 'badge-green', '펀칭기': 'badge-amber' }
  const holders = selected ? Array.from(new Set(data.map(r => r.holder_no).filter(Boolean))).sort((a: any, b: any) => String(a).localeCompare(String(b))) : []
  const hasHolder = holders.length > 1
  const dates = Array.from(new Set(data.map(r => r.date))).sort((a: any, b: any) => b.localeCompare(a))
  const totalPunch = data.reduce((s, r) => s + (r.punch_alarm || 0), 0)
  const totalWeld = data.reduce((s, r) => s + (r.weld_alarm || 0), 0)

  const td: React.CSSProperties = { fontSize: 11, padding: '7px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }
  const th: React.CSSProperties = { fontSize: 10, padding: '7px 10px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', background: 'var(--bg-card)', textAlign: 'left' }

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>알람 관리</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>설비를 선택하면 알람 데이터가 표시됩니다</div>
          </div>
        </div>

        <div className="content-area" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* 설비 목록 */}
          <div style={{ width: 220, flexShrink: 0 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                설비 목록
              </div>
              {eqLoading ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>로딩 중...</div>
              ) : (
                <div>
                  {equipment.map(eq => (
                    <div key={eq.no} onClick={() => selectEquipment(eq)}
                      style={{
                        padding: '10px 14px', cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        background: selected?.no === eq.no ? 'var(--accent-blue-dim)' : 'transparent',
                        borderLeft: `3px solid ${selected?.no === eq.no ? 'var(--accent-blue)' : 'transparent'}`,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (selected?.no !== eq.no) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { if (selected?.no !== eq.no) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>#{String(eq.no).padStart(2, '0')}</span>
                        <span className={`badge ${typeColors[eq.type] || 'badge-gray'}`} style={{ fontSize: 9 }}>{eq.type}</span>
                        <span className="badge badge-gray" style={{ fontSize: 9 }}>{eq.model}</span>
                      </div>
                      <div style={{ fontSize: 11, color: selected?.no === eq.no ? 'var(--accent-blue)' : 'var(--text-primary)', lineHeight: 1.4, fontWeight: selected?.no === eq.no ? 600 : 400 }}>
                        {eq.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 데이터 영역 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {!selected ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>←</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>설비를 선택해주세요</div>
                <div style={{ fontSize: 12 }}>왼쪽 목록에서 설비를 클릭하면 알람 데이터가 표시됩니다</div>
              </div>
            ) : (
              <>
                {/* 선택된 설비 헤더 */}
                <div className="card" style={{ marginBottom: 12, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{String(selected.no).padStart(2, '0')}</span>
                    <span className={`badge ${typeColors[selected.type] || 'badge-gray'}`}>{selected.type}</span>
                    <span className="badge badge-gray">{selected.model}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{selected.name}</span>
                  </div>
                </div>

                {/* 요약 카드 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
                  {[
                    { label: '총 알람', value: totalPunch + totalWeld, color: 'var(--accent-amber)' },
                    { label: '펀칭불량', value: totalPunch, color: 'var(--accent-blue)' },
                    { label: '융착불량', value: totalWeld, color: 'var(--accent-red)' },
                  ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* 데이터 테이블 */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
                    알람 내역 <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{data.length}건</span>
                  </div>
                  {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>로딩 중...</div>
                  ) : data.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>데이터 없음</div>
                  ) : hasHolder ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={th} rowSpan={2}>일자</th>
                            {(holders as any[]).map(h => (
                              <th key={h} style={{ ...th, textAlign: 'center' }} colSpan={2}>홀더 {h}</th>
                            ))}
                            <th style={th} rowSpan={2}>비고</th>
                          </tr>
                          <tr>
                            {(holders as any[]).map(h => (
                              <>
                                <th key={h + 'p'} style={{ ...th, color: 'var(--accent-blue)', textAlign: 'center' }}>펀칭</th>
                                <th key={h + 'w'} style={{ ...th, color: 'var(--accent-red)', textAlign: 'center' }}>융착</th>
                              </>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(dates as any[]).map(date => {
                            const dayRows = data.filter(r => r.date === date)
                            const note = dayRows.find(r => r.note && r.note !== '-')?.note || '-'
                            return (
                              <tr key={date}>
                                <td style={td}>{date}</td>
                                {(holders as any[]).map(h => {
                                  const hr = dayRows.find(r => r.holder_no === h)
                                  return (
                                    <>
                                      <td key={h + 'p'} style={{ ...td, textAlign: 'center' }}>
                                        <span className={`badge ${(hr?.punch_alarm || 0) > 0 ? 'badge-blue' : 'badge-gray'}`}>{hr?.punch_alarm || 0}</span>
                                      </td>
                                      <td key={h + 'w'} style={{ ...td, textAlign: 'center' }}>
                                        <span className={`badge ${(hr?.weld_alarm || 0) > 0 ? 'badge-red' : 'badge-gray'}`}>{hr?.weld_alarm || 0}</span>
                                      </td>
                                    </>
                                  )
                                })}
                                <td style={td}>{note}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>{['일자', '펀칭불량', '융착불량', '합계', '비고'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {data.map((r, i) => (
                          <tr key={i}>
                            <td style={td}>{r.date}</td>
                            <td style={td}><span className={`badge ${r.punch_alarm > 0 ? 'badge-blue' : 'badge-gray'}`}>{r.punch_alarm}</span></td>
                            <td style={td}><span className={`badge ${r.weld_alarm > 0 ? 'badge-red' : 'badge-gray'}`}>{r.weld_alarm}</span></td>
                            <td style={td}><span className={`badge ${(r.punch_alarm + r.weld_alarm) > 0 ? 'badge-amber' : 'badge-green'}`}>{r.punch_alarm + r.weld_alarm}</span></td>
                            <td style={td}>{r.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
