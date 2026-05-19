'use client'
import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/auth'
import { useToast } from '@/lib/useToast'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function SecurityPage() {
  const { userRole, userName, changePassword, changePin } = useRequireAuth()

  // 비밀번호 변경
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  // PIN 변경
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  // 사용자 관리 (admin only)
  const [users, setUsers] = useState<any[]>([])
  const [userModal, setUserModal] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  const [userForm, setUserForm] = useState({ user_id: '', password: '', pin: '0515', name: '', role: 'user', department: '생산기술' })
  // 접속 로그
  const [logs, setLogs] = useState<any[]>([])
  // Audit 로그 (데이터 변경 이력)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [auditFilter, setAuditFilter] = useState<string>('all')
  // 세션 정보
  const [sessionExpire, setSessionExpire] = useState<string | null>(null)

  const { showToast, ToastUI } = useToast()

  useEffect(() => {
    if (userRole === 'admin') {
      fetchUsers()
      fetchLogs()
      fetchAuditLogs()
    }
    const exp = sessionStorage.getItem('bumper_expire')
    if (exp) setSessionExpire(new Date(Number(exp)).toLocaleString('ko-KR'))
  }, [userRole])

  async function fetchUsers() {
    const { data } = await supabase.from('users').select('*').order('id')
    setUsers(data || [])
  }

  async function fetchLogs() {
    const { data } = await supabase.from('access_logs').select('*').order('created_at', { ascending: false }).limit(20)
    setLogs(data || [])
  }

  async function fetchAuditLogs() {
    const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50)
    setAuditLogs(data || [])
  }

  async function handlePwChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) { showToast('새 비밀번호가 일치하지 않습니다', 'error'); return }
    const result = await changePassword(oldPw, newPw)
    showToast(result.msg, result.ok ? 'success' : 'error')
    if (result.ok) { setOldPw(''); setNewPw(''); setConfirmPw('') }
  }

  async function handlePinChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPin !== confirmPin) { showToast('새 PIN이 일치하지 않습니다', 'error'); return }
    const result = await changePin(oldPin, newPin)
    showToast(result.msg, result.ok ? 'success' : 'error')
    if (result.ok) { setOldPin(''); setNewPin(''); setConfirmPin('') }
  }

  async function handleUserSave() {
    if (!userForm.user_id || !userForm.name || !userForm.password) { showToast('필수 항목을 입력하세요', 'error'); return }
    if (editUser) {
      const { error } = await supabase.from('users').update({ ...userForm, updated_at: new Date().toISOString() }).eq('id', editUser.id)
      if (error) { showToast('수정 실패', 'error'); return }
      showToast('수정 완료')
    } else {
      const { error } = await supabase.from('users').insert([userForm])
      if (error) { showToast('등록 실패: ' + error.message, 'error'); return }
      showToast('등록 완료')
    }
    setUserModal(false); fetchUsers()
  }

  async function handleUserToggle(user: any) {
    await supabase.from('users').update({ is_active: !user.is_active, updated_at: new Date().toISOString() }).eq('id', user.id)
    fetchUsers()
  }

  async function handleUserDelete(user: any) {
    if (user.role === 'admin') { showToast('관리자 계정은 삭제할 수 없습니다', 'error'); return }
    if (user.name === userName) { showToast('본인 계정은 삭제할 수 없습니다', 'error'); return }
    if (!confirm(`'${user.name}' 사용자를 정말 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`)) return
    const { error } = await supabase.from('users').delete().eq('id', user.id)
    if (error) { showToast('삭제 실패: ' + error.message, 'error'); return }
    showToast(`'${user.name}' 사용자가 삭제되었습니다`)
    // Audit Log 기록
    await supabase.from('audit_logs').insert([{
      user_name: userName,
      action: 'DELETE',
      target_table: 'users',
      target_id: user.id,
      description: `사용자 '${user.name}'(${user.user_id}) 삭제`,
    }]).then(() => {})
    fetchUsers()
  }

  const th: React.CSSProperties = { fontSize: 10, padding: '7px 10px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', textAlign: 'left' }
  const td: React.CSSProperties = { fontSize: 11, padding: '7px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Security</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>보안 설정 및 사용자 관리</div>
          </div>
        </div>
        <div className="content-area">

          {/* 세션 정보 + 현재 사용자 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>현재 사용자</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-blue)' }}>{userName || '-'}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>권한: {userRole === 'admin' ? '관리자' : '일반'}</div>
            </div>
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>세션 만료</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-amber)' }}>{sessionExpire || '-'}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>8시간 후 자동 로그아웃</div>
            </div>
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>보안 수준</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-green)' }}>3단계</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>IP + ID/PW + PIN</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* 비밀번호 변경 */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>🔐 비밀번호 변경</div>
              <form onSubmit={handlePwChange} style={{ padding: 18 }}>
                <div style={{ marginBottom: 12 }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>현재 비밀번호</div>
                  <input className="form-input" type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>새 비밀번호</div>
                  <input className="form-input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>새 비밀번호 확인</div>
                  <input className="form-input" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-sm" type="submit" disabled={!oldPw || !newPw || !confirmPw}>변경</button>
              </form>
            </div>

            {/* PIN 변경 */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>🔑 PIN 변경</div>
              <form onSubmit={handlePinChange} style={{ padding: 18 }}>
                <div style={{ marginBottom: 12 }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>현재 PIN (4자리)</div>
                  <input className="form-input" type="password" maxLength={4} value={oldPin} onChange={e => setOldPin(e.target.value)} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>새 PIN (4자리)</div>
                  <input className="form-input" type="password" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value)} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>새 PIN 확인</div>
                  <input className="form-input" type="password" maxLength={4} value={confirmPin} onChange={e => setConfirmPin(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-sm" type="submit" disabled={!oldPin || !newPin || !confirmPin}>변경</button>
              </form>
            </div>
          </div>

          {/* 사용자 관리 (admin only) */}
          {userRole === 'admin' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>👥 사용자 관리</div>
                <button className="btn btn-primary btn-sm" onClick={() => { setEditUser(null); setUserForm({ user_id:'', password:'', pin:'0515', name:'', role:'user', department:'생산기술' }); setUserModal(true) }}>+ 사용자 추가</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['아이디','이름','부서','권한','상태','관리'].map(h => <th key={h} className="tbl-th">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="tbl-td" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>등록된 사용자 없음</td></tr>
                  ) : users.map(u => (
                    <tr key={u.id}>
                      <td className="tbl-td">{u.user_id}</td>
                      <td className="tbl-td">{u.name}</td>
                      <td className="tbl-td">{u.department}</td>
                      <td className="tbl-td"><span className={`badge ${u.role === 'admin' ? 'badge-red' : 'badge-blue'}`}>{u.role === 'admin' ? '관리자' : '일반'}</span></td>
                      <td className="tbl-td"><span className={`badge ${u.is_active ? 'badge-green' : 'badge-gray'}`}>{u.is_active ? '활성' : '비활성'}</span></td>
                      <td className="tbl-td">
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setEditUser(u); setUserForm({ user_id:u.user_id, password:u.password, pin:u.pin, name:u.name, role:u.role, department:u.department }); setUserModal(true) }}>수정</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleUserToggle(u)}>{u.is_active ? '비활성' : '활성'}</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleUserDelete(u)} disabled={u.role === 'admin' || u.name === userName}>삭제</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Audit Log: 데이터 변경 이력 (admin only) */}
          {userRole === 'admin' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>📋 데이터 변경 이력</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>누가 언제 무엇을 수정했는지 추적</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select value={auditFilter} onChange={e => setAuditFilter(e.target.value)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                    <option value="all">전체</option>
                    <option value="CREATE">등록</option>
                    <option value="UPDATE">수정</option>
                    <option value="DELETE">삭제</option>
                  </select>
                  <button className="btn btn-ghost btn-sm" onClick={fetchAuditLogs}>🔄 새로고침</button>
                </div>
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
                    <tr>
                      {['시간','사용자','동작','테이블','상세 내용'].map(h => <th key={h} className="tbl-th">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.filter(l => auditFilter === 'all' || l.action === auditFilter).length === 0 ? (
                      <tr><td colSpan={5} className="tbl-td" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>변경 이력 없음</td></tr>
                    ) : auditLogs.filter(l => auditFilter === 'all' || l.action === auditFilter).map((l, i) => (
                      <tr key={i}>
                        <td className="tbl-td" style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{l.created_at ? new Date(l.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        <td className="tbl-td" style={{ fontSize: 11, fontWeight: 600 }}>{l.user_name}</td>
                        <td className="tbl-td">
                          <span className={`badge ${l.action === 'CREATE' ? 'badge-green' : l.action === 'UPDATE' ? 'badge-blue' : 'badge-red'}`}>
                            {l.action === 'CREATE' ? '등록' : l.action === 'UPDATE' ? '수정' : '삭제'}
                          </span>
                        </td>
                        <td className="tbl-td" style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>{l.target_table}</td>
                        <td className="tbl-td" style={{ fontSize: 11 }}>{l.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 접속 로그 (admin only) */}
          {userRole === 'admin' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>🔐 최근 접속 로그</div>
                <button className="btn btn-ghost btn-sm" onClick={fetchLogs}>🔄 새로고침</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['시간','IP','상태','User Agent'].map(h => <th key={h} className="tbl-th">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr><td colSpan={4} className="tbl-td" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>로그 없음</td></tr>
                    ) : logs.map((l, i) => (
                      <tr key={i}>
                        <td className="tbl-td">{l.created_at ? new Date(l.created_at).toLocaleString('ko-KR') : '-'}</td>
                        <td className="tbl-td" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>{l.ip_address || '-'}</td>
                        <td className="tbl-td"><span className={`badge ${l.status === 'allowed' ? 'badge-green' : 'badge-red'}`}>{l.status}</span></td>
                        <td className="tbl-td" style={{ fontSize: 9, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.user_agent?.slice(0, 60) || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 사용자 추가/수정 모달 */}
      {userModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setUserModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editUser ? '사용자 수정' : '사용자 추가'}</div>
              <button className="modal-close" onClick={() => setUserModal(false)}>×</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">아이디 *</label>
                <input className="form-input" value={userForm.user_id} onChange={e => setUserForm({ ...userForm, user_id: e.target.value })} disabled={!!editUser} />
              </div>
              <div className="form-group">
                <label className="form-label">이름 *</label>
                <input className="form-input" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">비밀번호 *</label>
                <input className="form-input" type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">PIN (4자리)</label>
                <input className="form-input" maxLength={4} value={userForm.pin} onChange={e => setUserForm({ ...userForm, pin: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">부서</label>
                <input className="form-input" value={userForm.department} onChange={e => setUserForm({ ...userForm, department: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">권한</label>
                <select className="form-select" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                  <option value="user">일반</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setUserModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleUserSave}>{editUser ? '저장' : '등록'}</button>
            </div>
          </div>
        </div>
      )}

      <ToastUI />
    </div>
  )
}
