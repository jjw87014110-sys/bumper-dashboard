'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

const IMARKING_BASE_DATE = new Date('2026-04-29')
const IMARKING_BASE_EQ = 1
const TOTAL_EQ = 31

function toLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function getImarkingSchedule(date: Date): number {
  const day = date.getDay()
  if (day === 0 || day === 6) return 0
  let weekdayCount = 0
  const d = new Date(IMARKING_BASE_DATE)
  const target = new Date(date)
  target.setHours(0,0,0,0)
  d.setHours(0,0,0,0)
  if (target < d) {
    const cur = new Date(target)
    while (cur < d) {
      if (cur.getDay() !== 0 && cur.getDay() !== 6) weekdayCount--
      cur.setDate(cur.getDate() + 1)
    }
  } else {
    const cur = new Date(d)
    while (cur < target) {
      if (cur.getDay() !== 0 && cur.getDay() !== 6) weekdayCount++
      cur.setDate(cur.getDate() + 1)
    }
  }
  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Dashboard</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>후가공설비 관리 현황</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>{clock}</div>
            <button className="btn btn-ghost" onClick={fetchData}>↻ 새로고침</button>
          </div>
        </div>

        <div className="content-area">
          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            {kpiCards.map(k => (
              <div key={k.label} className="card" style={{ padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{k.label}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 700, color: k.color }}>{loading ? '-' : k.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{k.unit}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
            {/* 왼쪽: TO DO + 분포 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Daily TO DO */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Daily TO DO</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    <span style={{ color: doneCount === totalCount ? 'var(--accent-green)' : 'var(--accent-amber)', fontWeight: 600 }}>{doneCount}</span>/{totalCount}
                  </div>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {DAILY_TODOS.map(item => (
                    <div key={item.key} onClick={() => toggleTodo(item)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, border: `2px solid ${checked[item.key] ? 'var(--accent-green)' : 'var(--border-light)'}`, background: checked[item.key] ? 'var(--accent-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        {checked[item.key] && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 12, color: checked[item.key] ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: checked[item.key] ? 'line-through' : 'none', transition: 'all 0.15s' }}>
                        {item.label}
                        {item.key === '아이마킹' && todayImarking > 0 && (
                          <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--accent-blue)', background: 'var(--accent-blue-dim)', padding: '1px 6px', borderRadius: 10 }}>
                            #{String(todayImarking).padStart(2,'0')} 설비
                          </span>
                        )}
                        {item.regular && <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: 8 }}>정기</span>}
                      </span>
                    </div>
                  ))}
                  {customTodos.map(label => (
                    <div key={label} onClick={() => toggleCustomTodo(label)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', transition: 'background 0.15s', borderTop: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, border: `2px solid ${customChecked[label] ? 'var(--accent-amber)' : 'var(--border-light)'}`, background: customChecked[label] ? 'var(--accent-amber)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        {customChecked[label] && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 12, color: customChecked[label] ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: customChecked[label] ? 'line-through' : 'none' }}>
                        {label}
                        <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--accent-amber)', background: 'var(--accent-amber-dim)', padding: '1px 5px', borderRadius: 8 }}>추가</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
                  <div style={{ height: 4, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${totalCount > 0 ? (doneCount/totalCount)*100 : 0}%`, background: doneCount === totalCount && totalCount > 0 ? 'var(--accent-green)' : 'var(--accent-blue)', borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>

              {/* 설비 유형 분포 */}
              <div className="card">
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>설비 유형 분포</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(equipByType).map(([type, cnt]: any) => (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 48, fontSize: 11, color: 'var(--text-secondary)' }}>{type}</div>
                      <div style={{ flex: 1, height: 10, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(cnt/stats.equipment)*100}%`, background: 'var(--accent-blue)', borderRadius: 4 }} />
                      </div>
                      <div style={{ width: 20, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', textAlign: 'right' }}>{cnt}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 달력 */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{calYear}년 {calMonth + 1}월</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(calYear, calMonth - 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()) }}>‹</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()) }}>오늘</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(calYear, calMonth + 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()) }}>›</button>
                  <button className="btn btn-primary btn-sm" onClick={() => { setEventDate(todayKey); setEventModal(true) }}>+ 일정 추가</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--border)' }}>
                {['일','월','화','수','목','금','토'].map((d, i) => (
                  <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: i === 0 ? 'var(--accent-red)' : i === 6 ? 'var(--accent-teal)' : 'var(--text-muted)' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
                {cells.map((date, idx) => {
                  if (!date) return <div key={idx} style={{ minHeight: 110, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }} />
                  const dateStr = toLocalDate(date)
                  const isToday = dateStr === todayKey
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                  const imarkingEq = getImarkingSchedule(date)
                  const dayEvents = events[dateStr] || []
                  const dayCompleted = completedDates[dateStr] || []
                  const wd = date.getDay()
                  return (
                    <div key={idx}
                      style={{ minHeight: 110, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '6px', background: isToday ? 'var(--accent-blue-dim)' : 'transparent', cursor: 'pointer' }}
                      onClick={() => { setEventDate(dateStr); setEventModal(true) }}
                    >
                      <div style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? 'white' : wd === 0 ? 'var(--accent-red)' : wd === 6 ? 'var(--accent-teal)' : 'var(--text-primary)', background: isToday ? 'var(--accent-blue)' : 'transparent', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          {date.getDate()}
                        </span>
                      </div>
                      {!isWeekend && imarkingEq > 0 && (
                        <div style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: dayCompleted.includes('아이마킹') ? 'var(--accent-green-dim)' : 'var(--accent-teal-dim)', color: dayCompleted.includes('아이마킹') ? 'var(--accent-green)' : 'var(--accent-teal)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {dayCompleted.includes('아이마킹') ? '✓ ' : ''}i-Marking #{String(imarkingEq).padStart(2,'0')}
                        </div>
                      )}
                      {!isWeekend && (
                        <div style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: REGULAR_TODOS.every(t => dayCompleted.includes(t)) ? 'var(--accent-green-dim)' : 'var(--bg-hover)', color: REGULAR_TODOS.every(t => dayCompleted.includes(t)) ? 'var(--accent-green)' : 'var(--text-muted)', marginBottom: 2 }}>
                          {REGULAR_TODOS.every(t => dayCompleted.includes(t)) ? '✓ 정기업무 완료' : '정기업무'}
                        </div>
                      )}
                      {dayEvents.map((ev, i) => {
                        const isDone = dayCompleted.includes(ev)
                        return (
                          <div key={i} style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: isDone ? 'var(--accent-green-dim)' : 'var(--accent-amber-dim)', color: isDone ? 'var(--accent-green)' : 'var(--accent-amber)', marginBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
                            onClick={e => { e.stopPropagation(); removeEvent(dateStr, i) }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isDone ? '✓ ' : ''}{ev}</span>
                            <span style={{ flexShrink: 0, opacity: 0.6 }}>×</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16, fontSize: 10, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-teal)' }} />아이마킹 일정</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--bg-hover)', border: '1px solid var(--border)' }} />정기업무</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-green)' }} />완료</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-amber)' }} />추가 일정 (×클릭 삭제)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {eventModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEventModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">일정 추가</div>
              <button className="modal-close" onClick={() => setEventModal(false)}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">날짜</label>
                <input className="form-input" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">내용</label>
                <input className="form-input" type="text" placeholder="일정 내용 입력..." value={eventText} onChange={e => setEventText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEvent()} autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEventModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={addEvent}>추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
