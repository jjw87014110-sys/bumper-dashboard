'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function StaffPage() {
  const { isPinVerified } = useAuth()
  const _router = typeof window !== 'undefined' ? null : null
  if (typeof window !== 'undefined' && !isPinVerified) {
    window.location.href = '/login'
  }
  const [staff, setStaff] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [leaves, setLeaves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [staffModal, setStaffModal] = useState(false)
  const [leaveModal, setLeaveModal] = useState(false)
  const [editStaff, setEditStaff] = useState<any>(null)
  const [editLeave, setEditLeave] = useState<any>(null)
  const [deleteStaffId, setDeleteStaffId] = useState<number|null>(null)
  const [deleteLeaveId, setDeleteLeaveId] = useState<number|null>(null)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const [staffForm, setStaffForm] = useState<any>({ name: '', department: '', employee_no: '', groupware_id: '', email: '', microsoft_id: '', position: '', total_leave: 15 })
  const [leaveForm, setLeaveForm] = useState<any>({ use_date: new Date().toISOString().slice(0,10), days: 1, reason: '', note: '' })

  const td: React.CSSProperties = { fontSize: 11, padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }
  const th: React.CSSProperties = { fontSize: 10, padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', textAlign: 'left' as const }

  useEffect(() => { fetchStaff() }, [])

  async function fetchStaff() {
    setLoading(true)
    const { data } = await supabase.from('staff').select('*').order('name')
    setStaff(data || [])
    setLoading(false)
  }

  async function selectStaff(s: any) {
    setSelected(s); setLeaveLoading(true)
    const { data } = await supabase.from('leave_history').select('*').eq('staff_id', s.id).order('use_date', { ascending: false })
    setLeaves(data || []); setLeaveLoading(false)
  }

  async function reloadLeaves() {
    if (!selected) return
    const { data } = await supabase.from('leave_history').select('*').eq('staff_id', selected.id).order('use_date', { ascending: false })
    setLeaves(data || [])
  }

  function showToast(msg: string, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  function openAddStaff() { setEditStaff(null); setStaffForm({ name: '', department: '', employee_no: '', groupware_id: '', email: '', microsoft_id: '', position: '', total_leave: 15 }); setStaffModal(true) }
  function openEditStaff(s: any) { setEditStaff(s); setStaffForm({ name: s.name, department: s.department||'', employee_no: s.employee_no||'', groupware_id: s.groupware_id||'', email: s.email||'', microsoft_id: s.microsoft_id||'', position: s.position||'', total_leave: s.total_leave||15 }); setStaffModal(true) }

  async function handleSaveStaff() {
    if (!staffForm.name) { showToast('이름은 필수입니다', 'error'); return }
    if (editStaff) {
      const { error } = await supabase.from('staff').update({ ...staffForm, total_leave: Number(staffForm.total_leave) }).eq('id', editStaff.id)
      if (error) { showToast('수정 실패', 'error'); return }
      showToast('수정되었습니다')
      if (selected?.id === editStaff.id) setSelected({ ...selected, ...staffForm, total_leave: Number(staffForm.total_leave) })
    } else {
      const { error } = await supabase.from('staff').insert([{ ...staffForm, total_leave: Number(staffForm.total_leave) }])
      if (error) { showToast('등록 실패', 'error'); return }
      showToast('등록되었습니다')
    }
    setStaffModal(false); fetchStaff()
  }

  async function handleDeleteStaff(id: number) {
    await supabase.from('leave_history').delete().eq('staff_id', id)
    await supabase.from('staff').delete().eq('id', id)
    showToast('삭제되었습니다'); setDeleteStaffId(null); setSelected(null); setLeaves([]); fetchStaff()
  }

  function openAddLeave() { setEditLeave(null); setLeaveForm({ use_date: new Date().toISOString().slice(0,10), days: 1, reason: '', note: '' }); setLeaveModal(true) }
  function openEditLeave(l: any) { setEditLeave(l); setLeaveForm({ use_date: l.use_date, days: l.days, reason: l.reason||'', note: l.note||'' }); setLeaveModal(true) }

  async function handleSaveLeave() {
    const payload = { staff_id: selected.id, use_date: leaveForm.use_date, days: Number(leaveForm.days), reason: leaveForm.reason, note: leaveForm.note }
    if (editLeave) {
      const { error } = await supabase.from('leave_history').update(payload).eq('id', editLeave.id)
      if (error) { showToast('수정 실패', 'error'); return }
      showToast('수정되었습니다')
    } else {
      const { error } = await supabase.from('leave_history').insert([payload])
      if (error) { showToast('등록 실패', 'error'); return }
      showToast('등록되었습니다')
    }
    setLeaveModal(false); reloadLeaves()
  }

  async function handleDeleteLeave(id: number) {
    await supabase.from('leave_history').delete().eq('id', id)
    showToast('삭제되었습니다'); setDeleteLeaveId(null); reloadLeaves()
  }

  const usedLeave = leaves.reduce((s, l) => s + Number(l.days), 0)
  const totalLeave = selected?.total_leave || 0
  const remainLeave = totalLeave - usedLeave

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>인사 정보</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>직원 정보 및 연월차 관리</div>
          </div>
          <button className="btn btn-primary" onClick={openAddStaff}>+ 직원 추가</button>
        </div>

        <div className="content-area" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 220, flexShrink: 0 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>직원 목록</div>
              {loading ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>로딩 중...</div> : (
                <div>
                  {staff.map(s => (
                    <div key={s.id} onClick={() => selectStaff(s)}
                      style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: selected?.id === s.id ? 'var(--accent-blue-dim)' : 'transparent', borderLeft: `3px solid ${selected?.id === s.id ? 'var(--accent-blue)' : 'transparent'}`, transition: 'all 0.15s' }}
                      onMouseEnter={e => { if (selected?.id !== s.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { if (selected?.id !== s.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent-blue)', flexShrink: 0 }}>{s.name[0]}</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: selected?.id === s.id ? 'var(--accent-blue)' : 'var(--text-primary)' }}>{s.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.department} · {s.position}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {staff.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>직원 없음</div>}
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {!selected ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>←</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>직원을 선택해주세요</div>
                <div style={{ fontSize: 12 }}>왼쪽 목록에서 직원을 클릭하면 상세 정보가 표시됩니다</div>
              </div>
            ) : (
              <>
                <div className="card" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent-blue-dim)', border: '2px solid var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--accent-blue)' }}>{selected.name[0]}</div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{selected.name}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span className="badge badge-blue">{selected.department}</span>
                          <span className="badge badge-gray">{selected.position}</span>
                          {selected.employee_no && <span className="badge badge-gray">사번 {selected.employee_no}</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditStaff(selected)}>수정</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteStaffId(selected.id)}>삭제</button>
                    </div>
                  </div>
                  <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {[
                      { label: '그룹웨어', value: selected.groupware_id },
                      { label: '이메일', value: selected.email },
                      { label: 'Microsoft ID', value: selected.microsoft_id },
                    ].map(item => (
                      <div key={item.label} style={{ padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: 6 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{item.value || '-'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
                  {[
                    { label: '총 연차', value: totalLeave, color: 'var(--accent-blue)' },
                    { label: '사용 연차', value: usedLeave, color: 'var(--accent-amber)' },
                    { label: '잔여 연차', value: remainLeave, color: remainLeave < 3 ? 'var(--accent-red)' : 'var(--accent-green)' },
                  ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}일</div>
                    </div>
                  ))}
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>연차 사용 내역 <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{leaves.length}건</span></div>
                    <button className="btn btn-primary btn-sm" onClick={openAddLeave}>+ 연차 등록</button>
                  </div>
                  {leaveLoading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>로딩 중...</div>
                  : leaves.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>연차 사용 내역 없음</div>
                  : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>{['순번','사용 일자','사용 일수','사유','비고','관리'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                      <tbody>{leaves.map((l, i) => (
                        <tr key={l.id}>
                          <td style={td}>{i+1}</td>
                          <td style={td}><span className="badge badge-blue">{l.use_date}</span></td>
                          <td style={td}><span className="badge badge-amber">{l.days}일</span></td>
                          <td style={td}>{l.reason||'-'}</td>
                          <td style={td}>{l.note||'-'}</td>
                          <td style={td}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => openEditLeave(l)}>수정</button>
                              <button className="btn btn-danger btn-sm" onClick={() => setDeleteLeaveId(l.id)}>삭제</button>
                            </div>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {staffModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setStaffModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editStaff ? '직원 정보 수정' : '직원 추가'}</div>
              <button className="modal-close" onClick={() => setStaffModal(false)}>×</button>
            </div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">이름 *</label><input className="form-input" type="text" value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">부서</label><input className="form-input" type="text" value={staffForm.department} onChange={e => setStaffForm({...staffForm, department: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">직책</label><input className="form-input" type="text" value={staffForm.position} onChange={e => setStaffForm({...staffForm, position: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">사번</label><input className="form-input" type="text" value={staffForm.employee_no} onChange={e => setStaffForm({...staffForm, employee_no: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">총 연차 (일)</label><input className="form-input" type="number" value={staffForm.total_leave} onChange={e => setStaffForm({...staffForm, total_leave: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">그룹웨어 주소</label><input className="form-input" type="text" value={staffForm.groupware_id} onChange={e => setStaffForm({...staffForm, groupware_id: e.target.value})} /></div>
              <div className="form-group form-grid-full"><label className="form-label">이메일</label><input className="form-input" type="email" value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} /></div>
              <div className="form-group form-grid-full"><label className="form-label">Microsoft ID</label><input className="form-input" type="text" value={staffForm.microsoft_id} onChange={e => setStaffForm({...staffForm, microsoft_id: e.target.value})} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setStaffModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleSaveStaff}>{editStaff ? '저장' : '등록'}</button>
            </div>
          </div>
        </div>
      )}

      {leaveModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setLeaveModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div className="modal-title">{editLeave ? '연차 수정' : '연차 등록'}</div>
              <button className="modal-close" onClick={() => setLeaveModal(false)}>×</button>
            </div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">사용 일자 *</label><input className="form-input" type="date" value={leaveForm.use_date} onChange={e => setLeaveForm({...leaveForm, use_date: e.target.value})} /></div>
              <div className="form-group">
                <label className="form-label">사용 일수</label>
                <select className="form-select" value={leaveForm.days} onChange={e => setLeaveForm({...leaveForm, days: e.target.value})}>
                  {[0.5,1,1.5,2,3,4,5].map(v => <option key={v} value={v}>{v}일</option>)}
                </select>
              </div>
              <div className="form-group form-grid-full"><label className="form-label">사유</label><input className="form-input" type="text" placeholder="예: 개인사, 병가..." value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} /></div>
              <div className="form-group form-grid-full"><label className="form-label">비고</label><input className="form-input" type="text" value={leaveForm.note} onChange={e => setLeaveForm({...leaveForm, note: e.target.value})} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setLeaveModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleSaveLeave}>{editLeave ? '저장' : '등록'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteStaffId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-header"><div className="modal-title">직원 삭제</div><button className="modal-close" onClick={() => setDeleteStaffId(null)}>×</button></div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>직원 정보와 연차 내역이 모두 삭제됩니다. 계속하시겠습니까?</div>
            <div className="modal-footer" style={{ marginTop: 0, paddingTop: 0, border: 'none' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteStaffId(null)}>취소</button>
              <button className="btn btn-danger" onClick={() => handleDeleteStaff(deleteStaffId)}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {deleteLeaveId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-header"><div className="modal-title">연차 삭제</div><button className="modal-close" onClick={() => setDeleteLeaveId(null)}>×</button></div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>이 연차 내역을 삭제하시겠습니까?</div>
            <div className="modal-footer" style={{ marginTop: 0, paddingTop: 0, border: 'none' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteLeaveId(null)}>취소</button>
              <button className="btn btn-danger" onClick={() => handleDeleteLeave(deleteLeaveId)}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
