import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('year', { ascending: true })
      .order('semester', { ascending: true })
      .order('code', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])

  } catch (err) {
    console.error('GET /api/subjects error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 })
    }

    const { code, name, year, semester } = await req.json()

    if (!code?.trim() || !name?.trim()) {
      return NextResponse.json(
        { error: 'Subject code and name are required.' },
        { status: 400 }
      )
    }

    if (code.trim().length > 20) {
      return NextResponse.json(
        { error: 'Subject code must be 20 characters or less.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        year: year ? parseInt(year) : null,
        semester: semester ? parseInt(semester) : null,
        is_custom: true,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `Subject code "${code.trim().toUpperCase()}" already exists.` },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })

  } catch (err) {
    console.error('POST /api/subjects error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
