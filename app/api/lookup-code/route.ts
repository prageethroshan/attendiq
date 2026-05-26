import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')?.toUpperCase().trim()

    if (!code || code.length < 4) {
      return NextResponse.json(
        { error: 'Please enter a valid session code.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { data: session } = await supabase
      .from('sessions')
      .select('token, is_active, expires_at, subject_code, subject_name')
      .eq('short_code', code)
      .single()

    if (!session) {
      return NextResponse.json(
        { error: 'Code not found. Make sure you typed it correctly - codes are case-insensitive.' },
        { status: 404 }
      )
    }

    if (!session.is_active) {
      return NextResponse.json(
        { error: `The session for "${session.subject_name}" has been ended by your lecturer.` },
        { status: 410 }
      )
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { error: `The session for "${session.subject_name}" has expired. Ask your lecturer for the new code.` },
        { status: 410 }
      )
    }

    return NextResponse.json({
      token: session.token,
      subject_code: session.subject_code,
      subject_name: session.subject_name,
    })

  } catch (err) {
    console.error('GET /api/lookup-code error:', err)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
