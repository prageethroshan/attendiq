import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

async function verifyAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = createServiceSupabaseClient()
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return profile?.role === 'admin' || user.user_metadata?.role === 'admin'
    ? user
    : null
}

export async function GET(req: Request) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter')
    const service = createServiceSupabaseClient()

    let sessionQuery = service
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })

    if (filter === 'active') sessionQuery = sessionQuery.eq('is_active', true)
    if (filter === 'history') sessionQuery = sessionQuery.eq('is_active', false)

    const { data: sessions, error: sessionsError } = await sessionQuery

    if (sessionsError) {
      console.error('Sessions query error:', sessionsError)
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json([])
    }

    const sessionIds = sessions.map(session => session.id)
    const { data: attendanceRecords } = await service
      .from('attendance_records')
      .select('session_id')
      .in('session_id', sessionIds)

    const countMap = new Map<string, number>()
    for (const record of attendanceRecords ?? []) {
      countMap.set(record.session_id, (countMap.get(record.session_id) ?? 0) + 1)
    }

    const teacherIds = Array.from(new Set(sessions.map(session => session.teacher_id)))
    const { data: profiles } = await service
      .from('profiles')
      .select('id, full_name, email, department')
      .in('id', teacherIds)

    const profileMap = new Map<string, any>()
    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, profile)
    }

    const result = sessions.map(session => {
      const profile = profileMap.get(session.teacher_id)
      return {
        ...session,
        profiles: {
          full_name: profile?.full_name ?? session.teacher_name ?? 'Unknown',
          email: profile?.email ?? '',
          department: profile?.department ?? null,
        },
        attendance_records: [{ count: countMap.get(session.id) ?? 0 }],
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('GET /api/admin/sessions error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
