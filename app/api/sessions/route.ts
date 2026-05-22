import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateToken, generateShortCode } from '@/lib/qr'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // ── Auth check ──
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 })
    }

    const body = await req.json()
    const {
      subject_code,
      subject_name,
      duration_minutes,
      enrolled_ids = [],
      geo_lat = null,
      geo_lng = null,
      geo_radius_m = null,
    } = body

    // ── Validate required fields ──
    if (!subject_code?.trim() || !subject_name?.trim() || !duration_minutes) {
      return NextResponse.json(
        { error: 'subject_code, subject_name and duration_minutes are required.' },
        { status: 400 }
      )
    }

    if (duration_minutes < 5 || duration_minutes > 480) {
      return NextResponse.json(
        { error: 'Duration must be between 5 and 480 minutes.' },
        { status: 400 }
      )
    }

    // ── Duplicate active session guard ──
    // Teacher cannot run two sessions at the same time
    const { data: existing } = await supabase
      .from('sessions')
      .select('id, subject_name')
      .eq('teacher_id', user.id)
      .eq('is_active', true)
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
    let inserted = false
    let attempts = 0

    while (!inserted && attempts < 5) {
      attempts++
      token = generateToken()
      short_code = generateShortCode()

      const expires_at = new Date(
        Date.now() + duration_minutes * 60 * 1000
      ).toISOString()

      const teacherName =
        user.user_metadata?.full_name ?? user.email ?? 'Unknown'

      const { error: insertError } = await supabase
        .from('sessions')
        .insert({
          token,
          short_code,
          subject_code: subject_code.trim().toUpperCase(),
          subject_name: subject_name.trim(),
          teacher_id: user.id,
          teacher_name: teacherName,
          is_active: true,
          expires_at,
          enrolled_ids,
          geo_lat,
          geo_lng,
          geo_radius_m,
        })

      if (!insertError) {
        inserted = true
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
    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('token', token)
      .single()

    return NextResponse.json(session, { status: 201 })

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

    let query = supabase
      .from('sessions')
      .select('*')
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

    return NextResponse.json(sessions)

  } catch (err) {
    console.error('GET /api/sessions error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
