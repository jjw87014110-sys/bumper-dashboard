'use client'

export function SkeletonText({ width = '100%' }: { width?: string | number }) {
  return <div className="skeleton skeleton-text" style={{ width, height: 14, marginBottom: 6 }} />
}

export function SkeletonCard() {
  return <div className="skeleton skeleton-card" />
}

export function SkeletonKpi() {
  return (
    <div className="card" style={{ padding: '14px 18px' }}>
      <div className="skeleton" style={{ width: 60, height: 10, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: 80, height: 24, marginBottom: 6 }} />
      <div className="skeleton" style={{ width: 100, height: 10 }} />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="tbl-th"><div className="skeleton" style={{ width: '70%', height: 10 }} /></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i}>
            {Array.from({ length: cols }).map((_, j) => (
              <td key={j} className="tbl-td"><div className="skeleton" style={{ width: '80%', height: 12 }} /></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * 빈 데이터 일러스트 (개선판)
 */
export function EmptyState({
  icon = '📭',
  title = '데이터가 없습니다',
  desc = ''
}: {
  icon?: string
  title?: string
  desc?: string
}) {
  return (
    <div className="empty-state-pro">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {desc && <div className="empty-desc">{desc}</div>}
    </div>
  )
}
