import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

async function requireAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorised.' }, { status: 401 }) }
  }

  const service = createServiceSupabaseClient()
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin =
    profile?.role === 'admin' ||
    user.user_metadata?.role === 'admin'

  if (!isAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) }
  }

  return { user }
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 })
    }

    const service = createServiceSupabaseClient()

    const { data, error } = await service
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('GET /api/teachers error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])

  } catch (err) {
    console.error('GET /api/teachers error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin()
    if (admin.error) return admin.error

    const { full_name, email, password, department } = await req.json()

    if (!full_name?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: 'Full name, email and password are required.' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      )
    }

    const service = createServiceSupabaseClient()

    const { data: newUser, error: createError } =
      await service.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name.trim(),
          department: department?.trim() ?? '',
          role: 'teacher',
        },
      })

    if (createError) {
      if (createError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'A teacher with this email already exists.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      )
    }

    if (newUser.user) {
      await service
        .from('profiles')
        .upsert(
          {
            id: newUser.user.id,
            full_name: full_name.trim(),
            email: email.trim().toLowerCase(),
            department: department?.trim() ?? null,
            role: 'teacher',
            is_active: true,
          },
          { onConflict: 'id' }
        )
    }

    return NextResponse.json({ success: true, id: newUser.user?.id }, { status: 201 })

  } catch (err) {
    console.error('POST /api/teachers error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
