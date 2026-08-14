import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

const DEVICE_COOKIE = 'attendiq_device'
const encoder = new TextEncoder()

function secret(): string {
  const value = process.env.RATE_LIMIT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error('RATE_LIMIT_SECRET is not configured.')
  return value
}

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function deviceIdentity(req: NextRequest) {
  const current = req.cookies.get(DEVICE_COOKIE)?.value
  if (current) {
    const separator = current.lastIndexOf('.')
    if (separator > 0) {
      const id = current.slice(0, separator)
      const supplied = current.slice(separator + 1)
      if (supplied === await hmac(id)) return { id, cookie: null }
    }
  }

  const id = crypto.randomUUID()
  return { id, cookie: `${id}.${await hmac(id)}` }
}

export function setDeviceCookie(response: NextResponse, value: string | null) {
  if (!value) return response
  response.cookies.set(DEVICE_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return response
}

function clientIp(req: NextRequest): string {
  return req.headers.get('x-real-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown'
}

export async function enforceRateLimit(
  req: NextRequest,
  route: string,
  identifier: string,
  limit: number
): Promise<NextResponse | null> {
  const key = await hmac(`${clientIp(req)}:${route}:${identifier}`)
  const service = createServiceSupabaseClient()
  const { data, error } = await service.rpc('check_rate_limit', {
    p_key: key,
    p_route: route,
    p_limit: limit,
    p_window_seconds: 60,
  })

  if (error) {
    console.error('Rate limit check failed:', error)
    return NextResponse.json({ error: 'Request verification unavailable.' }, { status: 503 })
  }

  if (data === false) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }
  return null
}
