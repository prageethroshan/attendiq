import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 })
    }

    const { students, session_id } = await req.json()

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
    const cleaned = students
      .map((student: any, index: number) => {
        const studentId = String(student.student_id ?? student['Student ID'] ?? '').trim().toUpperCase()
        const name = String(student.name ?? student['Full Name'] ?? '').trim()
        const year = String(student.year ?? student['Year'] ?? '').trim()
        const department = String(student.department ?? student['Department'] ?? '').trim()

        if (!studentId) errors.push(`Row ${index + 2}: Student ID is missing`)
        if (!name) errors.push(`Row ${index + 2}: Full Name is missing`)
        if (!year) errors.push(`Row ${index + 2}: Year is missing`)

        return { student_id: studentId, name, year, department }
      })
      .filter(student => student.student_id && student.name)

    if (errors.length > 0 && cleaned.length === 0) {
      return NextResponse.json(
        { error: 'All rows have errors.', details: errors.slice(0, 10) },
        { status: 400 }
      )
    }

    const service = createServiceSupabaseClient()

    const { error: upsertError } = await service
      .from('students')
      .upsert(cleaned, { onConflict: 'student_id' })

    if (upsertError) {
      console.error('Bulk upsert error:', upsertError)
      return NextResponse.json(
        { error: 'Failed to save students.' },
        { status: 500 }
      )
    }

    let returnedStudentIds = cleaned.map(student => student.student_id)

    if (session_id) {
      const { data: session } = await supabase
        .from('sessions')
        .select('id, teacher_id, enrolled_ids')
        .eq('id', session_id)
        .eq('teacher_id', user.id)
        .single()

      if (session) {
        const existingIds = session.enrolled_ids ?? []
        const newIds = cleaned.map(student => student.student_id)
        const mergedIds = Array.from(new Set([...existingIds, ...newIds]))
        returnedStudentIds = mergedIds

        await service
          .from('sessions')
          .update({ enrolled_ids: mergedIds })
          .eq('id', session_id)
      }
    }

    return NextResponse.json({
      inserted: cleaned.length,
      errors: errors.slice(0, 10),
      studentIds: returnedStudentIds,
    })
  } catch (err) {
    console.error('POST /api/students/bulk error:', err)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
