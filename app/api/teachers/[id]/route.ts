import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

async function requireAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorised.' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    if (admin.error) return admin.error

    const { id } = await params
    const body = await req.json()
    const service = createServiceSupabaseClient()

    const profileUpdates: Record<string, unknown> = {}
    if ('full_name' in body) profileUpdates.full_name = body.full_name
    if ('department' in body) profileUpdates.department = body.department
    if ('is_active' in body) profileUpdates.is_active = body.is_active

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await service
        .from('profiles')
        .update(profileUpdates)
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    if ('is_active' in body) {
      const { error } = await service.auth.admin.updateUserById(id, {
        ban_duration: body.is_active ? 'none' : '87600h',
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    if (body.new_password) {
      if (body.new_password.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters.' },
          { status: 400 }
        )
      }

      const { error } = await service.auth.admin.updateUserById(id, {
        password: body.new_password,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('PATCH /api/teachers/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    if (admin.error) return admin.error

    const { id } = await params

    if (id === admin.user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account.' },
        { status: 400 }
      )
    }

    const service = createServiceSupabaseClient()
    const { error } = await service.auth.admin.deleteUser(id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('DELETE /api/teachers/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
