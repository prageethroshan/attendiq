import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateToken, generateShortCode } from '@/lib/qr'
import { createSessionSchema, validationError } from '@/lib/validation'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // ── Auth check ──
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 })
    }

    const parsed = createSessionSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: validationError(parsed.error) }, { status: 400 })
    }
    const {
      subject_code, subject_name, duration_minutes,
      academic_year, target_department,
      geo_lat, geo_lng, geo_radius_m,
    } = parsed.data

    const service = createServiceSupabaseClient()
    await service.rpc('close_expired_sessions', { p_teacher_id: user.id })

    // ── Duplicate active session guard ──
    // Teacher cannot run two unexpired sessions at the same time
    const { data: existing } = await supabase
      .from('sessions')
      .select('id, subject_name')
      .eq('teacher_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existing) {
      return NextResponse.json(
        {
          error: `You already have an active session for "${existing.subject_name}". End it before starting a new one.`,
          existing_session_id: existing.id,
        },
        { status: 409 }
      )
    }

    // ── Generate token + short code ──
    // Retry loop handles the rare case of a collision on unique columns
    let token = ''
    let short_code = ''
    let sessionId = ''
    let inserted = false
    let attempts = 0

    const { data: profile } = await service
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()
    const teacherName = profile?.full_name ?? user.email ?? 'Unknown'

    while (!inserted && attempts < 5) {
      attempts++
      token = generateToken()
      short_code = generateShortCode()

      const expires_at = new Date(
        Date.now() + duration_minutes * 60 * 1000
      ).toISOString()

      const { data: createdId, error: insertError } = await service.rpc('create_cohort_session', {
        p_token: token,
        p_short_code: short_code,
        p_subject_code: subject_code,
        p_subject_name: subject_name,
        p_teacher_id: user.id,
        p_teacher_name: teacherName,
        p_expires_at: expires_at,
        p_academic_year: academic_year,
        p_target_department: target_department,
        p_geo_lat: geo_lat,
        p_geo_lng: geo_lng,
        p_geo_radius_m: geo_radius_m,
      })

      if (!insertError) {
        sessionId = createdId
        inserted = true
      } else if (`${insertError.message} ${insertError.details}`.includes('sessions_one_active_per_teacher')) {
        return NextResponse.json(
          { error: 'You already have an active session. End it before starting another.' },
          { status: 409 }
        )
      } else if (insertError.message.includes('No registered students match')) {
        return NextResponse.json(
          { error: 'No registered students match that academic year and department.' },
          { status: 400 }
        )
      } else if (!insertError.message.includes('unique')) {
        // Non-collision error — bail immediately
        console.error('Session insert error:', insertError)
        return NextResponse.json(
          { error: 'Failed to create session. Please try again.' },
          { status: 500 }
        )
      }
      // If unique collision → loop and try new token/code
    }

    if (!inserted) {
      return NextResponse.json(
        { error: 'Could not generate a unique session token. Please try again.' },
        { status: 500 }
      )
    }

    // ── Fetch and return the full session ──
    const { data: session } = await service
      .from('sessions')
      .select('id, token, short_code, subject_code, subject_name, teacher_id, teacher_name, is_active, expires_at, academic_year, target_department, geo_lat, geo_lng, geo_radius_m, created_at, session_enrollments(count)')
      .eq('id', sessionId)
      .single()

    return NextResponse.json({
      ...session,
      enrolled_count: session?.session_enrollments?.[0]?.count ?? 0,
    }, { status: 201 })

  } catch (err) {
    console.error('POST /api/sessions error:', err)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') // 'active' | 'history' | null (all)
    const service = createServiceSupabaseClient()
    await service.rpc('close_expired_sessions', { p_teacher_id: user.id })

    let query = supabase
      .from('sessions')
      .select(`
        id, token, short_code, subject_code, subject_name, teacher_id, teacher_name,
        is_active, expires_at, academic_year, target_department,
        geo_lat, geo_lng, geo_radius_m, created_at,
        attendance_records(count),
        session_enrollments(count)
      `)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (filter === 'active') {
      query = query.eq('is_active', true)
    } else if (filter === 'history') {
      query = query.eq('is_active', false)
    }

    const { data: sessions, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json((sessions ?? []).map(session => ({
      ...session,
      enrolled_count: session.session_enrollments?.[0]?.count ?? 0,
    })))

  } catch (err) {
    console.error('GET /api/sessions error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
