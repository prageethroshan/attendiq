import { NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { requireAdminApi } from '@/lib/auth'

export async function GET() {
  try {
    const admin = await requireAdminApi()
    if (admin.error) return admin.error

    const service = createServiceSupabaseClient()

    const { data: sessions } = await service
      .from('sessions')
      .select('id, subject_code, subject_name, teacher_id, is_active, created_at')

    const { data: records } = await service
      .from('attendance_records')
      .select('id, session_id, student_id, status, geo_verified, marked_at')

    const { data: profiles } = await service
      .from('profiles')
      .select('id, full_name, email, department')

    const allSessions = sessions ?? []
    const allRecords = records ?? []
    const allProfiles = profiles ?? []

    const recordsBySession = new Map<string, number>()
    for (const record of allRecords) {
      recordsBySession.set(record.session_id, (recordsBySession.get(record.session_id) ?? 0) + 1)
    }

    const totalSessions = allSessions.length
    const activeSessions = allSessions.filter(session => session.is_active).length
    const totalRecords = allRecords.length
    const flaggedRecords = allRecords.filter(record => record.geo_verified === false).length

    const teacherMap = new Map<string, {
      profile: { id: string; full_name: string; email: string; department: string | null }
      sessionCount: number
      scanCount: number
      activeCount: number
    }>()

    for (const profile of allProfiles) {
      teacherMap.set(profile.id, {
        profile,
        sessionCount: 0,
        scanCount: 0,
        activeCount: 0,
      })
    }

    for (const session of allSessions) {
      const teacher = teacherMap.get(session.teacher_id)
      if (!teacher) continue
      teacher.sessionCount++
      if (session.is_active) teacher.activeCount++
      teacher.scanCount += recordsBySession.get(session.id) ?? 0
    }

    const byTeacher = Array.from(teacherMap.values())
      .filter(teacher => teacher.sessionCount > 0)
      .sort((a, b) => b.scanCount - a.scanCount)

    const subjectMap = new Map<string, { code: string; name: string; count: number; scans: number }>()
    for (const session of allSessions) {
      const key = session.subject_code
      if (!subjectMap.has(key)) {
        subjectMap.set(key, { code: key, name: session.subject_name, count: 0, scans: 0 })
      }
      const entry = subjectMap.get(key)!
      entry.count++
      entry.scans += recordsBySession.get(session.id) ?? 0
    }

    const bySubject = Array.from(subjectMap.values())
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 10)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentRecords = allRecords.filter(record => new Date(record.marked_at) >= thirtyDaysAgo)
    const dailyMap = new Map<string, number>()
    for (const record of recentRecords) {
      const day = record.marked_at.slice(0, 10)
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1)
    }

    const dailyActivity = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      summary: {
        totalSessions,
        activeSessions,
        totalRecords,
        flaggedRecords,
        totalTeachers: allProfiles.length,
      },
      byTeacher,
      bySubject,
      dailyActivity,
    })
  } catch (err) {
    console.error('GET /api/admin/analytics error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
