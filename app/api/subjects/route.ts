import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { subjectSchema, validationError } from '@/lib/validation'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('subjects')
      .select('id, code, name, year, semester, is_custom, created_by')
      .or(`is_custom.eq.false,created_by.eq.${user.id}`)
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

    const parsed = subjectSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: validationError(parsed.error) }, { status: 400 })
    }
    const { code, name, year, semester } = parsed.data

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        code,
        name,
        year: year ?? null,
        semester: semester ?? null,
        is_custom: true,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `Subject code "${code}" already exists.` },
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
