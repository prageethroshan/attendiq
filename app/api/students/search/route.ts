import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const rawQuery = searchParams.get('q')?.trim().slice(0, 80) ?? ''
    const query = rawQuery.toUpperCase()
    const sessionId = searchParams.get('session_id')

    if (query.length < 2) {
      return NextResponse.json([])
    }
    if (/[,%()]/.test(rawQuery)) {
      return NextResponse.json({ error: 'Search contains unsupported characters.' }, { status: 400 })
    }

    const service = createServiceSupabaseClient()
    let enrolledIds: string[] | null = null

    if (sessionId) {
      const { data: session } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('teacher_id', user.id)
        .single()

      if (!session) {
        return NextResponse.json([])
      }

      const { data: enrollments } = await service
        .from('session_enrollments')
        .select('student_id')
        .eq('session_id', sessionId)
      enrolledIds = (enrollments ?? []).map(enrollment => enrollment.student_id)
    }

    const { data: students } = await service
      .from('students')
      .select('student_id, name, year, department')
      .or(`student_id.ilike.%${query}%,name.ilike.%${rawQuery}%`)
      .limit(10)

    let results = students ?? []

    if (sessionId) {
      results = results.filter(student =>
        enrolledIds?.includes(student.student_id)
      )
    }

    if (sessionId && results.length > 0) {
      const { data: existing } = await service
        .from('attendance_records')
        .select('student_id')
        .eq('session_id', sessionId)
        .in('student_id', results.map(student => student.student_id))

      const markedSet = new Set((existing ?? []).map(record => record.student_id))

      results = results.map(student => ({
        ...student,
        already_marked: markedSet.has(student.student_id),
      }))
    }

    return NextResponse.json(results)
  } catch (err) {
    console.error('GET /api/students/search error:', err)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
