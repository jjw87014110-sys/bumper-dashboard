'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function ImarkingPage() {
  useAuth()
  const [equipment, setEquipment] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [eqLoading, setEqLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [deleteId, setDeleteId] = useState<number|null>(null)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const [inspectDate, setInspectDate] = useState(new Date().toISOString().slice(0,10))
  const [inspectNote, setInspectNote] = useState('')

  const typeColors: any = { '복합기': 'badge-blue', '융착기': 'badge-green', '펀칭기': 'badge-amber' }
  const td: React.CSSProperties = { fontSize: 11, padding: '7px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }
  const th: React.CSSProperties = { fontSize: 10, padding: '7px 10px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', background: 'var(--bg-card)', textAlign: 'left' as const }

  useEffect(() => {
    supabase.from('equipment').select('no,name,model,type').neq('type','지그').order('no')
      .then(({ data }) => { setEquipment(data || []); setEqLoading(false) })
  }, [])

  async function selectEquipment(eq: any) {
    setSelected(eq); setLoading(true)
    const { data } = await supabase.from('imarking').select('*').eq('equipment_no', eq.no).order('change_date', { ascending: false })
    setData(data || []); setLoading(false)
  }

  async function reload() {
    if (!selected) return
    const { data } = await supabase.from('imarking').select('*').eq('equipment_no', selected.no).order('change_date', { ascending: false })
    setData(data || [])
  }

  function showToast(msg: string, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  // 점검일 등록 (아이마킹 점검 완료 기록)
  async function handleAddInspection() {
    if (!inspectDate) return
    const payload = {
      equipment_no: selected.no,
      change_date: inspectDate,
      category: '점검',
      mode: '아이마킹',
      unit: '점검완료',
      value: 1,
      note: inspectNote || '아이마킹 점검 완료',
    }
    const { error } = await supabase.from('imarking').insert([payload])
    if (error) { showToast('등록 실패', 'error'); return }
    showToast('점검일이 등록되었습니다')
    setModal(false)
    setInspectNote('')
    reload()
  }

  async function handleDelete(id: number) {
    await supabase.from('imarking').delete().eq('id', id)
    showToast('삭제되었습니다'); setDeleteId(null); reload()
  }

  // 점검 이력만 필터 (change_date 기준 그룹)
  const inspections = data.filter(r => r.mode === '아이마킹' || r.category === '점검')
  const others = data.filter(r => r.mode !== '아이마킹' && r.category !== '점검')

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>아이마킹</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>설비를 선택하면 아이마킹 점검 이력이 표시됩니다 (1일 1설비 순환)</div>
          </div>
        </div>
        <div className="content-area" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* 설비 목록 */}
          <div style={{ width: 220, flexShrink: 0 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>설비 목록</div>
              {eqLoading ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>로딩 중...</div> : (
                <div style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
                  {equipment.map(eq => (
                    <div key={eq.no} onClick={() => selectEquipment(eq)}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: selected?.no === eq.no ? 'var(--accent-blue-dim)' : 'transparent', borderLeft: `3px solid ${selected?.no === eq.no ? 'var(--accent-blue)' : 'transparent'}`, transition: 'all 0.15s' }}
                      onMouseEnter={e => { if (selected?.no !== eq.no) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { if (selected?.no !== eq.no) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>#{String(eq.no).padStart(2,'0')}</span>
                        <span className={`badge ${typeColors[eq.type]||'badge-gray'}`} style={{ fontSize: 9 }}>{eq.type}</span>
                        <span className="badge badge-gray" style={{ fontSize: 9 }}>{eq.model}</span>
                      </div>
                      <div style={{ fontSize: 11, color: selected?.no === eq.no ? 'var(--accent-blue)' : 'var(--text-primary)', lineHeight: 1.4, fontWeight: selected?.no === eq.no ? 600 : 400 }}>{eq.name}</div>
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
                <div style={{ fontSize: 12 }}>왼쪽 목록에서 설비를 클릭하면 아이마킹 점검 이력이 표시됩니다</div>
              </div>
            ) : (
              <>
                {/* 설비 헤더 */}
                <div className="card" style={{ marginBottom: 12, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{String(selected.no).padStart(2,'0')}</span>
                    <span className={`badge ${typeColors[selected.type]||'badge-gray'}`}>{selected.type}</span>
                    <span className="badge badge-gray">{selected.model}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{selected.name}</span>
                    <button className="btn btn-primary btn-sm" onClick={() => { setInspectDate(new Date().toISOString().slice(0,10)); setModal(true) }}>
                      + 점검 완료 등록
                    </button>
                  </div>
                </div>

                {/* 안내 */}
                <div style={{ padding: '10px 14px', background: 'var(--accent-blue-dim)', borderRadius: 8, marginBottom: 12, fontSize: 12, color: 'var(--accent-blue)', border: '1px solid var(--accent-blue-dim)' }}>
                  💡 아이마킹은 <strong>1일 1설비</strong>씩 순환 점검합니다. 점검 완료 시 날짜를 등록해주세요. TO DO에서 체크하면 달력에 자동 표시됩니다.
                </div>

                {/* 점검 이력 */}
                <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
                    점검 이력 <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{inspections.length}건</span>
                  </div>
                  {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>로딩 중...</div>
                  ) : inspections.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>점검 이력 없음 — 점검 완료 시 등록해주세요</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>{['점검일','비고','관리'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                      <tbody>{inspections.map(r => (
                        <tr key={r.id}>
                          <td style={td}><span className="badge badge-green">{(r.change_date||'').slice(0,10)}</span></td>
                          <td style={td}>{r.note||'-'}</td>
                          <td style={td}>
                            <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(r.id)}>삭제</button>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>

                {/* 기타 데이터 (기존 조건 데이터) */}
                {others.length > 0 && (
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
                      기타 데이터 <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{others.length}건</span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>{['변경일자','구분','모드','단위','값','비고','관리'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                      <tbody>{others.map(r => (
                        <tr key={r.id}>
                          <td style={td}>{(r.change_date||'').slice(0,10)}</td>
                          <td style={td}>{r.category}</td>
                          <td style={td}>{r.mode}</td>
                          <td style={td}>{r.unit}</td>
                          <td style={td}><span className="badge badge-blue">{r.value}</span></td>
                          <td style={td}>{r.note||'-'}</td>
                          <td style={td}>
                            <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(r.id)}>삭제</button>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 점검 완료 등록 모달 */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">아이마킹 점검 완료 등록</div>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: 6 }}>
              {selected?.name}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">점검일 *</label>
                <input className="form-input" type="date" value={inspectDate} onChange={e => setInspectDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">비고</label>
                <input className="form-input" type="text" placeholder="특이사항 입력..." value={inspectNote} onChange={e => setInspectNote(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleAddInspection}>등록</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-header"><div className="modal-title">삭제 확인</div><button className="modal-close" onClick={() => setDeleteId(null)}>×</button></div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>이 항목을 삭제하시겠습니까?</div>
            <div className="modal-footer" style={{ marginTop: 0, paddingTop: 0, border: 'none' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>취소</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
