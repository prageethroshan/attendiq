import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { studentIdSchema, validationError } from '@/lib/validation'
import { enforceRateLimit } from '@/lib/security'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const parsed = studentIdSchema.safeParse(searchParams.get('student_id') ?? '')
    if (!parsed.success) {
      return NextResponse.json({ error: validationError(parsed.error) }, { status: 400 })
    }
    const studentId = parsed.data
    const limited = await enforceRateLimit(req, 'lookup', studentId, 10)
    if (limited) return limited

    const supabase = createServiceSupabaseClient()

    const { data: enrollments, error: enrollmentError } = await supabase
      .from('session_enrollments')
      .select(`
        session_id,
        sessions(
          subject_code,
          subject_name,
          created_at
        )
      `)
      .eq('student_id', studentId)

    if (enrollmentError) {
      console.error('Lookup error:', enrollmentError)
      return NextResponse.json(
        { error: 'Failed to fetch records. Please try again.' },
        { status: 500 }
      )
    }

    const sessionIds = (enrollments ?? []).map(enrollment => enrollment.session_id)
    const { data: records, error } = sessionIds.length > 0
      ? await supabase
          .from('attendance_records')
          .select('session_id, status, marked_at')
          .eq('student_id', studentId)
          .in('session_id', sessionIds)
      : { data: [], error: null }
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch records.' }, { status: 500 })
    }
    const recordMap = new Map((records ?? []).map(record => [record.session_id, record]))
    const safeRecords = (enrollments ?? []).map(enrollment => {
      const record = recordMap.get(enrollment.session_id)
      const session = Array.isArray(enrollment.sessions) ? enrollment.sessions[0] : enrollment.sessions
      return {
        status: record?.status ?? 'Absent',
        marked_at: record?.marked_at ?? session?.created_at,
        sessions: session,
      }
    }).sort((a, b) => new Date(b.marked_at ?? 0).getTime() - new Date(a.marked_at ?? 0).getTime())
    return NextResponse.json({ records: safeRecords })

  } catch (err) {
    console.error('GET /api/lookup error:', err)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
