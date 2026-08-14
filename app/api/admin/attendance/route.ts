import { NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { requireAdminApi } from '@/lib/auth'
import { paginationSchema } from '@/lib/validation'

export async function GET(req: Request) {
  try {
    const admin = await requireAdminApi()
    if (admin.error) return admin.error

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id')
    const studentId = searchParams.get('student_id')
    const pagination = paginationSchema.safeParse({
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    })
    if (!pagination.success) {
      return NextResponse.json({ error: 'Invalid pagination.' }, { status: 400 })
    }
    const { page, pageSize } = pagination.data
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
