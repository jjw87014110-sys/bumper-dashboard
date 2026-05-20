import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

/**
 * 비밀번호 해싱
 */
export async function hashPassword(plain: string): Promise<string> {
  return await bcrypt.hash(plain, SALT_ROUNDS)
}

/**
 * 비밀번호 검증 (해시 또는 평문 모두 처리)
 * - 자동 마이그레이션: 평문이면 해시 후 업데이트해야 함
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  // bcrypt 해시는 항상 $2a$ 또는 $2b$로 시작
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    // 해시된 비밀번호
    return await bcrypt.compare(plain, stored)
  } else {
    // 평문 비밀번호 (기존 데이터, 호환성 유지)
    return plain === stored
  }
}

/**
 * 비밀번호가 해시인지 확인
 */
export function isHashed(password: string): boolean {
  return password.startsWith('$2a$') || password.startsWith('$2b$') || password.startsWith('$2y$')
}

/**
 * 비밀번호 강도 평가
 * 반환: { score: 0~4, label, color }
 */
export function evaluatePasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  if (score > 4) score = 4

  const labels = ['매우 약함', '약함', '보통', '강함', '매우 강함']
  const colors = ['var(--accent-red)', 'var(--accent-red)', 'var(--accent-amber)', 'var(--accent-green)', 'var(--accent-green)']
  return { score, label: labels[score], color: colors[score] }
}
