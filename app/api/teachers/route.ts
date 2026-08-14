import { NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { requireAdminApi } from '@/lib/auth'

export async function GET() {
  try {
    const admin = await requireAdminApi()
    if (admin.error) return admin.error

    const service = createServiceSupabaseClient()

    const { data, error } = await service
      .from('profiles')
      .select('id, full_name, email, department, role, is_active, created_at')
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
    const admin = await requireAdminApi()
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
