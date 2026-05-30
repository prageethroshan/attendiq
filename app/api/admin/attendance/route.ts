import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

async function verifyAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = createServiceSupabaseClient()
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return profile?.role === 'admin' || user.user_metadata?.role === 'admin'
    ? user
    : null
}

export async function GET(req: Request) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id')
    const studentId = searchParams.get('student_id')
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSizeParam = parseInt(searchParams.get('pageSize') ?? '50')
    const pageSize = Number.isFinite(pageSizeParam)
      ? Math.min(Math.max(pageSizeParam, 1), 10000)
      : 50
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const service = createServiceSupabaseClient()
    let query = service
      .from('attendance_records')
      .select(`
        *,
        sessions!inner(
          subject_code,
          subject_name,
          teacher_id,
          created_at
        )
      `, { count: 'exact' })
      .order('marked_at', { ascending: false })
      .range(from, to)

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      records: data,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    })
  } catch (err) {
    console.error('GET /api/admin/attendance error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
