import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getSessionReport } from '@/lib/session-report'

export async function GET(req: Request) {
  try {
    const auth = await requireUser()
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id') ?? ''
    const result = await getSessionReport(sessionId, auth.user.id)

    if (result.error) return result.error
    return NextResponse.json(result.data)
  } catch (err) {
    console.error('GET /api/reports/session error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
