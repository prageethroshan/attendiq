// Safe alphabet — no ambiguous chars (0/O, 1/I/L)
const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateToken(): string {
  // 32-char hex token embedded in QR code URL
  // crypto.randomUUID() is available in Node.js 14.17+ and all modern browsers
  return crypto.randomUUID().replace(/-/g, '')
}

export function generateShortCode(): string {
  // 6-char human-typeable code shown on projector
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes)
    .map(b => SAFE_CHARS[b % SAFE_CHARS.length])
    .join('')
}

export function buildSessionUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  return `${base}/session/${token}`
}
