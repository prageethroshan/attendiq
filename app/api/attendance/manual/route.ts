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

    const {
      sessionId,
      studentId,
      studentName,
      year,
      department,
    } = await req.json()

    if (!sessionId || !studentId?.trim() || !studentName?.trim()) {
      return NextResponse.json(
        { error: 'Session ID, student ID and name are required.' },
        { status: 400 }
      )
    }

    const cleanId = studentId.trim().toUpperCase()
    const studentIdRegex = /^[A-Z]{2,6}\/\d{4}\/\d{2,4}$/
    if (!studentIdRegex.test(cleanId)) {
      return NextResponse.json(
        { error: 'Invalid Student ID format. Use MGT/2025/001.' },
        { status: 400 }
      )
    }

    const { data: session } = await supabase
      .from('sessions')
      .select('id, teacher_id, is_active, expires_at')
      .eq('id', sessionId)
      .eq('teacher_id', user.id)
      .single()

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or you do not own this session.' },
        { status: 404 }
      )
    }

    if (!session.is_active || new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Session has ended or expired.' },
        { status: 410 }
      )
    }

    const service = createServiceSupabaseClient()

    const { data: existing } = await service
      .from('attendance_records')
      .select('id, marked_at, manual_entry')
      .eq('session_id', sessionId)
      .eq('student_id', cleanId)
      .maybeSingle()

    if (existing) {
      const time = new Date(existing.marked_at).toLocaleTimeString('en-LK', {
        hour: '2-digit',
        minute: '2-digit',
      })
      const how = existing.manual_entry ? 'manually' : 'by the student'
      return NextResponse.json(
        { error: `Attendance already marked ${how} at ${time}.` },
        { status: 409 }
      )
    }

    const { data: record, error: insertError } = await service
      .from('attendance_records')
      .insert({
        session_id: sessionId,
        student_id: cleanId,
        student_name: studentName.trim(),
        year: String(year ?? ''),
        department: department ?? null,
        status: 'Present',
        device_fp: null,
        geo_verified: null,
        dist_metres: null,
        manual_entry: true,
        marked_by: user.id,
        marked_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Attendance already marked for this student.' },
          { status: 409 }
        )
      }
      console.error('Manual attendance insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save attendance.' },
        { status: 500 }
      )
    }

    await service
      .from('students')
      .upsert(
        {
          student_id: cleanId,
          name: studentName.trim(),
          year: String(year ?? ''),
          department: department ?? '',
        },
        { onConflict: 'student_id' }
      )

    return NextResponse.json({
      studentId: record.student_id,
      studentName: record.student_name,
      status: record.status,
      manualEntry: true,
      markedAt: record.marked_at,
    })
  } catch (err) {
    console.error('POST /api/attendance/manual error:', err)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
