const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export function generateShortCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes)
    .map(b => SAFE_CHARS[b % SAFE_CHARS.length])
    .join('')
}

export function buildSessionUrl(token: string): string {
  // In browser context use window.location.origin
  // In server context use NEXT_PUBLIC_BASE_URL
  const base =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
  return `${base}/session/${token}`
}

export const QR_ROTATION_MS = 2 * 60 * 1000  // 2 minutes
export const QR_WARNING_MS = 20 * 1000       // warn at 20 seconds left
