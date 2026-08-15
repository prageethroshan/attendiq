import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth'
import { getSessionReport } from '@/lib/session-report'

export async function GET(req: Request) {
  try {
    const admin = await requireAdminApi()
    if (admin.error) return admin.error

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id') ?? ''
    const result = await getSessionReport(sessionId)

    if (result.error) return result.error
    return NextResponse.json(result.data)
  } catch (err) {
    console.error('GET /api/admin/reports/session error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
