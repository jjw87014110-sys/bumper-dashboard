'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const FAV_KEY = 'bumper_favorites'

interface FavItem { equipmentNo: number; name?: string }

export default function Favorites() {
  const [favorites, setFavorites] = useState<FavItem[]>([])
  const [addInput, setAddInput] = useState('')

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FAV_KEY) || '[]')
      setFavorites(saved)
    } catch {}
  }, [])

  const saveFavorites = (arr: FavItem[]) => {
    setFavorites(arr)
    localStorage.setItem(FAV_KEY, JSON.stringify(arr))
  }

  const addFavorite = () => {
    const num = parseInt(addInput.replace('#', ''))
    if (!num || num < 1 || num > 31) return
    if (favorites.some(f => f.equipmentNo === num)) { setAddInput(''); return }
    saveFavorites([...favorites, { equipmentNo: num }])
    setAddInput('')
  }

  const removeFavorite = (num: number) => {
    saveFavorites(favorites.filter(f => f.equipmentNo !== num))
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>⭐ 즐겨찾기 설비</div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{favorites.length}개</span>
      </div>
      {favorites.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
          자주 보는 설비 번호를 추가하세요
        </div>
      ) : (
        <div style={{ marginBottom: 10 }}>
          {favorites.map(f => (
            <span key={f.equipmentNo} className="favorite-badge" onClick={() => removeFavorite(f.equipmentNo)} title="클릭하여 삭제">
              <Link href={`/equipment`} style={{ color: 'inherit', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                #{String(f.equipmentNo).padStart(2, '0')}
              </Link>
              <span style={{ marginLeft: 4, opacity: 0.6 }} onClick={() => removeFavorite(f.equipmentNo)}>×</span>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="number"
          min={1}
          max={31}
          placeholder="설비 번호 (1~31)"
          value={addInput}
          onChange={e => setAddInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addFavorite()}
          style={{ flex: 1, fontSize: 11, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        />
        <button className="btn btn-primary btn-sm" onClick={addFavorite} disabled={!addInput}>추가</button>
      </div>
    </div>
  )
}
