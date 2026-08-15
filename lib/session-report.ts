import { NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

interface AttendanceRecord {
  student_id: string
  status: string
  manual_entry: boolean
  geo_verified: boolean | null
  dist_metres: number | null
  marked_at: string
  device_fp: string | null
}

export async function getSessionReport(sessionId: string, teacherId?: string) {
  if (!sessionId) {
    return { error: NextResponse.json({ error: 'session_id is required.' }, { status: 400 }) }
  }

  const service = createServiceSupabaseClient()
  let sessionQuery = service
    .from('sessions')
    .select('id, subject_code, subject_name, teacher_id, teacher_name, created_at, expires_at, academic_year, target_department')
    .eq('id', sessionId)

  if (teacherId) sessionQuery = sessionQuery.eq('teacher_id', teacherId)

  const { data: session, error: sessionError } = await sessionQuery.maybeSingle()
  if (sessionError) {
    return { error: NextResponse.json({ error: sessionError.message }, { status: 500 }) }
  }
  if (!session) {
    return { error: NextResponse.json({ error: 'Session not found.' }, { status: 404 }) }
  }

  const { data: profile } = await service
    .from('profiles')
    .select('full_name, email, department')
    .eq('id', session.teacher_id)
    .maybeSingle()

  const { data: enrollments, error: enrollmentsError } = await service
    .from('session_enrollments')
    .select('student_id, students!inner(student_id, name, year, department)')
    .eq('session_id', sessionId)

  if (enrollmentsError) {
    return { error: NextResponse.json({ error: enrollmentsError.message }, { status: 500 }) }
  }

  const { data: attendance, error: attendanceError } = await service
    .from('attendance_records')
    .select('student_id, status, manual_entry, geo_verified, dist_metres, marked_at, device_fp')
    .eq('session_id', sessionId)

  if (attendanceError) {
    return { error: NextResponse.json({ error: attendanceError.message }, { status: 500 }) }
  }

  const recordMap = new Map<string, AttendanceRecord>()
  for (const record of attendance ?? []) {
    recordMap.set(record.student_id, record)
  }

  const students = (enrollments ?? []).map(enrollment => {
    const student = Array.isArray(enrollment.students)
      ? enrollment.students[0]
      : enrollment.students
    const record = recordMap.get(enrollment.student_id)
    return {
      student_id: enrollment.student_id,
      name: student?.name ?? enrollment.student_id,
      year: student?.year ?? '',
      department: student?.department ?? '',
      status: record?.status ?? 'Absent',
      marked_at: record?.marked_at ?? null,
      manual_entry: record?.manual_entry ?? false,
      geo_verified: record?.geo_verified ?? null,
      dist_metres: record?.dist_metres ?? null,
      device_fp: record?.device_fp ?? null,
    }
  }).sort((a, b) => a.student_id.localeCompare(b.student_id))

  const present = students.filter(student => student.status !== 'Absent').length
  const absent = students.filter(student => student.status === 'Absent').length
  const manual = students.filter(student => student.manual_entry).length
  const flagged = students.filter(student => student.geo_verified === false).length

  return {
    data: {
      session: {
        id: session.id,
        subject_code: session.subject_code,
        subject_name: session.subject_name,
        teacher_id: session.teacher_id,
        teacher_name: profile?.full_name ?? session.teacher_name,
        teacher_email: profile?.email ?? '',
        teacher_department: profile?.department ?? null,
        created_at: session.created_at,
        expires_at: session.expires_at,
        academic_year: session.academic_year,
        department: session.target_department,
      },
      summary: {
        enrolled: students.length,
        present,
        absent,
        manual,
        flagged,
        attendanceRate: students.length > 0 ? Math.round((present / students.length) * 100) : 0,
      },
      students,
    },
  }
}
