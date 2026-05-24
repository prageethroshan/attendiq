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

    const { session_id } = await req.json()

    if (!session_id) {
      return NextResponse.json({ error: 'session_id is required.' }, { status: 400 })
    }

    // ── Confirm session belongs to this teacher and is still active ──
    const { data: session } = await supabase
      .from('sessions')
      .select('id, teacher_id, is_active, expires_at')
      .eq('id', session_id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }

    if (session.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    if (!session.is_active) {
      return NextResponse.json({ error: 'Session has ended.' }, { status: 410 })
    }

    if (new Date(session.expires_at) < new Date()) {
      // Auto-close expired session
      await supabase
        .from('sessions')
        .update({ is_active: false })
        .eq('id', session_id)

      return NextResponse.json({ error: 'Session has expired.' }, { status: 410 })
    }

    // ── Generate new token + short code with collision retry ──
    let token = ''
    let short_code = ''
    let updated = false
    let attempts = 0

    while (!updated && attempts < 5) {
      attempts++
      token = generateToken()
      short_code = generateShortCode()

      const { error: updateError } = await supabase
        .from('sessions')
        .update({ token, short_code })
        .eq('id', session_id)

      if (!updateError) {
        updated = true
      } else if (!updateError.message.includes('unique')) {
        console.error('Token rotation error:', updateError)
        return NextResponse.json(
          { error: 'Failed to rotate token.' },
          { status: 500 }
        )
      }
    }

    if (!updated) {
      return NextResponse.json(
        { error: 'Could not generate unique token after retries.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      token,
      short_code,
      rotated_at: new Date().toISOString(),
    })

  } catch (err) {
    console.error('POST /api/qr-token error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
