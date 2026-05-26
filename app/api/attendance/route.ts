import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

function haversineMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      token,
      sessionId,
      studentId,
      studentName,
      year,
      department,
      deviceFp,
      geo,
    } = body

    if (!token || !sessionId || !studentId || !studentName || !year) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 }
      )
    }

    if (studentId.length < 3 || studentId.length > 30) {
      return NextResponse.json(
        { error: 'Invalid student ID format.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { data: session } = await supabase
      .from('sessions')
      .select(`
        id,
        token,
        is_active,
        expires_at,
        enrolled_ids,
        geo_lat,
        geo_lng,
        geo_radius_m,
        teacher_id
      `)
      .eq('token', token)
      .eq('id', sessionId)
      .single()

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session. Please scan the latest QR code.' },
        { status: 400 }
      )
    }

    if (!session.is_active) {
      return NextResponse.json(
        { error: 'This session has been ended by your lecturer.' },
        { status: 410 }
      )
    }

    if (new Date(session.expires_at) < new Date()) {
      await supabase
        .from('sessions')
        .update({ is_active: false })
        .eq('id', sessionId)

      return NextResponse.json(
        { error: 'This session has expired. Ask your lecturer to start a new one.' },
        { status: 410 }
      )
    }

    const normalisedStudentId = studentId.trim().toUpperCase()

    if (session.enrolled_ids && session.enrolled_ids.length > 0) {
      if (!session.enrolled_ids.includes(normalisedStudentId)) {
        return NextResponse.json(
          { error: 'Your Student ID is not enrolled in this subject. Check your ID and try again.' },
          { status: 403 }
        )
      }
    }

    const { data: existing } = await supabase
      .from('attendance_records')
      .select('id, marked_at')
      .eq('session_id', sessionId)
      .eq('student_id', normalisedStudentId)
      .maybeSingle()

    if (existing) {
      const markedTime = new Date(existing.marked_at).toLocaleTimeString(
        'en-LK',
        { hour: '2-digit', minute: '2-digit' }
      )
      return NextResponse.json(
        { error: `Attendance already marked for this session at ${markedTime}.` },
        { status: 409 }
      )
    }

    let deviceFlagged = false
    if (deviceFp) {
      const { data: sameDevice } = await supabase
        .from('attendance_records')
        .select('student_id')
        .eq('session_id', sessionId)
        .eq('device_fp', deviceFp)
        .neq('student_id', normalisedStudentId)
        .limit(1)
        .maybeSingle()

      if (sameDevice) deviceFlagged = true
    }

    let geoVerified: boolean | null = null
    let distMetres: number | null = null

    if (session.geo_lat !== null && session.geo_lng !== null) {
      if (!geo || typeof geo.lat !== 'number' || typeof geo.lng !== 'number') {
        geoVerified = false
        distMetres = null
      } else {
        distMetres = Math.round(
          haversineMetres(session.geo_lat, session.geo_lng, geo.lat, geo.lng)
        )
        geoVerified = distMetres <= session.geo_radius_m!
      }
    }

    const status = 'Present'
    const service = createServiceSupabaseClient()

    const { data: record, error: insertError } = await service
      .from('attendance_records')
      .insert({
        session_id: sessionId,
        student_id: normalisedStudentId,
        student_name: studentName.trim(),
        year: String(year),
        department: department ?? null,
        status,
        device_fp: deviceFp ?? null,
        geo_verified: geoVerified,
        dist_metres: distMetres,
        marked_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Attendance already marked for this session.' },
          { status: 409 }
        )
      }
      console.error('Attendance insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save attendance. Please try again.' },
        { status: 500 }
      )
    }

    await service
      .from('students')
      .upsert(
        {
          student_id: normalisedStudentId,
          name: studentName.trim(),
          year: String(year),
          department: department ?? '',
        },
        { onConflict: 'student_id' }
      )

    return NextResponse.json({
      studentId: record.student_id,
      studentName: record.student_name,
      year: record.year,
      department: record.department,
      status: record.status,
      geoVerified: record.geo_verified,
      distMetres: record.dist_metres,
      deviceFlagged,
      markedAt: record.marked_at,
    })

  } catch (err) {
    console.error('POST /api/attendance error:', err)
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    )
  }
}
