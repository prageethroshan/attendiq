import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 })
    }

    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, subject_code, subject_name, created_at, is_active')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        summary: { totalSessions: 0, totalRecords: 0, avgRate: 0, flaggedCount: 0 },
        bySubject: [],
        recentSessions: [],
        dailyActivity: [],
        deviceFlags: [],
        geoFailRate: [],
      })
    }

    const sessionIds = sessions.map(session => session.id)

    const { data: enrollments } = await supabase
      .from('session_enrollments')
      .select('session_id, student_id')
      .in('session_id', sessionIds)
    const enrollmentCount = new Map<string, number>()
    for (const enrollment of enrollments ?? []) {
      enrollmentCount.set(enrollment.session_id, (enrollmentCount.get(enrollment.session_id) ?? 0) + 1)
    }

    const { data: records } = await supabase
      .from('attendance_records')
      .select('id, session_id, student_id, status, geo_verified, device_fp, marked_at')
      .in('session_id', sessionIds)

    const allRecords = records ?? []
    const totalSessions = sessions.length
    const totalRecords = allRecords.length
    const flaggedCount = allRecords.filter(record => record.geo_verified === false).length

    const subjectMap = new Map<string, {
      subject_code: string
      subject_name: string
      sessionCount: number
      presentCount: number
      totalCount: number
      enrolledTotal: number
    }>()

    for (const session of sessions) {
      const key = session.subject_code
      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          subject_code: session.subject_code,
          subject_name: session.subject_name,
          sessionCount: 0,
          presentCount: 0,
          totalCount: 0,
          enrolledTotal: 0,
        })
      }

      const entry = subjectMap.get(key)!
      entry.sessionCount++
      entry.enrolledTotal += enrollmentCount.get(session.id) ?? 0

      const sessionRecords = allRecords.filter(record => record.session_id === session.id)
      entry.totalCount += enrollmentCount.get(session.id) ?? 0
      entry.presentCount += sessionRecords.filter(record => record.status === 'Present').length
    }

    const bySubject = Array.from(subjectMap.values()).map(subject => ({
      ...subject,
      attendanceRate: subject.enrolledTotal > 0
        ? Math.round((subject.presentCount / subject.enrolledTotal) * 100)
        : 0,
    })).sort((a, b) => b.sessionCount - a.sessionCount)

    const totalExpected = bySubject.reduce((sum, subject) => sum + subject.enrolledTotal, 0)
    const totalPresent = bySubject.reduce((sum, subject) => sum + subject.presentCount, 0)
    const avgRate = totalExpected > 0
      ? Math.round((totalPresent / totalExpected) * 100)
      : 0

    const recentSessions = sessions.slice(0, 10).map(session => {
      const sessionRecords = allRecords.filter(record => record.session_id === session.id)
      return {
        id: session.id,
        subject_code: session.subject_code,
        subject_name: session.subject_name,
        created_at: session.created_at,
        is_active: session.is_active,
        scanned: sessionRecords.length,
        enrolled: enrollmentCount.get(session.id) ?? 0,
        rate: (enrollmentCount.get(session.id) ?? 0) > 0
          ? Math.round((sessionRecords.length / (enrollmentCount.get(session.id) ?? 1)) * 100)
          : null,
      }
    })

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentRecords = allRecords.filter(
      record => new Date(record.marked_at) >= thirtyDaysAgo
    )

    const dailyMap = new Map<string, number>()
    for (const record of recentRecords) {
      const day = record.marked_at.slice(0, 10)
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1)
    }

    const dailyActivity = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const fpMap = new Map<string, Set<string>>()
    for (const record of allRecords) {
      if (!record.device_fp) continue
      if (!fpMap.has(record.device_fp)) fpMap.set(record.device_fp, new Set())
      fpMap.get(record.device_fp)!.add(record.student_id)
    }

    const deviceFlags = Array.from(fpMap.entries())
      .filter(([, students]) => students.size > 1)
      .map(([device_fp, students]) => ({
        device_fp,
        studentIds: Array.from(students),
        count: students.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const geoFailRate = bySubject.map(subject => {
      const subjectSessions = sessions
        .filter(session => session.subject_code === subject.subject_code)
        .map(session => session.id)

      const subjectRecords = allRecords.filter(record =>
        subjectSessions.includes(record.session_id) && record.geo_verified !== null
      )

      const failed = subjectRecords.filter(record => record.geo_verified === false).length

      return {
        subject_code: subject.subject_code,
        subject_name: subject.subject_name,
        total: subjectRecords.length,
        failed,
        failRate: subjectRecords.length > 0
          ? Math.round((failed / subjectRecords.length) * 100)
          : 0,
      }
    }).filter(subject => subject.total > 0)

    return NextResponse.json({
      summary: { totalSessions, totalRecords, avgRate, flaggedCount },
      bySubject,
      recentSessions,
      dailyActivity,
      deviceFlags,
      geoFailRate,
    })

  } catch (err) {
    console.error('GET /api/analytics error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
