import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { rosterStudentSchema } from '@/lib/validation'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 })
    }

    const { students, session_id } = await req.json()

    if (!session_id) {
      return NextResponse.json({ error: 'session_id is required.' }, { status: 400 })
    }

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { error: 'No students provided.' },
        { status: 400 }
      )
    }

    if (students.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 students per upload.' },
        { status: 400 }
      )
    }

    const errors: string[] = []
    const cleaned: Array<{ student_id: string; name: string; year: string; department: string }> = []
    students.forEach((student: unknown, index: number) => {
      const parsed = rosterStudentSchema.safeParse(student)
      if (!parsed.success) {
        errors.push(`Row ${index + 2}: ${parsed.error.issues[0]?.message ?? 'Invalid student'}`)
      } else {
        cleaned.push(parsed.data)
      }
    })

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Roster contains invalid rows.', details: errors.slice(0, 10) },
        { status: 400 }
      )
    }

    const service = createServiceSupabaseClient()

    const { data: session } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', session_id)
      .eq('teacher_id', user.id)
      .single()
    if (!session) {
      return NextResponse.json({ error: 'Session not found or forbidden.' }, { status: 404 })
    }

    const studentIds = cleaned.map(student => student.student_id)
    const { data: existingStudents } = await service
      .from('students')
      .select('student_id, name, year, department')
      .in('student_id', studentIds)
    const existingMap = new Map((existingStudents ?? []).map(student => [student.student_id, student]))
    const conflicts = cleaned.filter(student => {
      const existing = existingMap.get(student.student_id)
      return existing && (
        existing.name !== student.name || String(existing.year) !== student.year ||
        (existing.department ?? '') !== student.department
      )
    })
    if (conflicts.length > 0) {
      return NextResponse.json({
        error: 'Existing student details do not match the authoritative record.',
        conflicts: conflicts.map(student => student.student_id),
      }, { status: 409 })
    }

    const newStudents = cleaned.filter(student => !existingMap.has(student.student_id))
    const { error: importError } = await service.rpc('import_session_roster', {
      p_session_id: session_id,
      p_teacher_id: user.id,
      p_students: cleaned,
    })
    if (importError) {
      console.error('Roster import error:', importError)
      return NextResponse.json({ error: 'Failed to import roster.' }, { status: 500 })
    }

    return NextResponse.json({
      created: newStudents.length,
      enrolled: studentIds.length,
      inserted: studentIds.length,
      conflicts: [],
      errors: [],
      studentIds,
    })
  } catch (err) {
    console.error('POST /api/students/bulk error:', err)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
