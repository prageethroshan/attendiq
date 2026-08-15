import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { paginationSchema } from '@/lib/validation'

export async function GET(req: Request) {
  try {
    const admin = await requireAdminApi()
    if (admin.error) return admin.error

    const { searchParams } = new URL(req.url)
    const pagination = paginationSchema.safeParse({
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    })
    if (!pagination.success) {
      return NextResponse.json({ error: 'Invalid pagination.' }, { status: 400 })
    }

    const queryText = searchParams.get('query')?.trim()
    const academicYear = searchParams.get('academic_year')
    const department = searchParams.get('department')?.trim()
    const status = searchParams.get('status') ?? 'active'
    const { page, pageSize } = pagination.data
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const service = createServiceSupabaseClient()
    let query = service
      .from('students')
      .select('student_id, name, year, department, academic_year, is_active, created_at', { count: 'exact' })
      .order('student_id', { ascending: true })
      .range(from, to)

    if (queryText) {
      const safeQuery = queryText.replace(/[^A-Za-z0-9/ .'-]/g, '').trim()
      if (safeQuery) {
        query = query.or(`student_id.ilike.%${safeQuery}%,name.ilike.%${safeQuery}%`)
      }
    }

    if (academicYear) {
      const year = Number(academicYear)
      if (!Number.isInteger(year)) {
        return NextResponse.json({ error: 'Invalid academic year.' }, { status: 400 })
      }
      query = query.eq('academic_year', year)
    }

    if (department) {
      query = query.eq('department', department)
    }

    if (status === 'active') query = query.eq('is_active', true)
    else if (status === 'inactive') query = query.eq('is_active', false)
    else if (status !== 'all') {
      return NextResponse.json({ error: 'Invalid status filter.' }, { status: 400 })
    }

    const { data, count, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const studentIds = (data ?? []).map(student => student.student_id)
    const attendanceCounts = new Map<string, number>()
    const enrollmentCounts = new Map<string, number>()

    if (studentIds.length > 0) {
      const { data: counts, error: countsError } = await service.rpc('get_student_record_counts', {
        p_student_ids: studentIds,
      })
      if (countsError) {
        return NextResponse.json({ error: countsError.message }, { status: 500 })
      }

      for (const countRow of counts ?? []) {
        attendanceCounts.set(countRow.student_id, Number(countRow.attendance_count ?? 0))
        enrollmentCounts.set(countRow.student_id, Number(countRow.enrollment_count ?? 0))
      }
    }

    return NextResponse.json({
      students: (data ?? []).map(student => ({
        ...student,
        attendance_count: attendanceCounts.get(student.student_id) ?? 0,
        enrollment_count: enrollmentCounts.get(student.student_id) ?? 0,
      })),
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    })
  } catch (err) {
    console.error('GET /api/admin/students error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
