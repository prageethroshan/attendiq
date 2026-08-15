import { NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { requireAdminApi } from '@/lib/auth'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminApi()
    if (admin.error) return admin.error

    const { id } = await params
    const body = await req.json()
    const service = createServiceSupabaseClient()
    const cleanDepartment = typeof body.department === 'string' ? body.department.trim() : body.department

    if (body.new_password && (typeof body.new_password !== 'string' || body.new_password.length < 8)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      )
    }
    if ('is_active' in body && typeof body.is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active must be a boolean.' }, { status: 400 })
    }
    if ('department' in body && cleanDepartment) {
      const { data: knownDepartment } = await service
        .from('departments')
        .select('name')
        .eq('name', cleanDepartment)
        .eq('is_active', true)
        .maybeSingle()

      if (!knownDepartment) {
        return NextResponse.json(
          { error: 'Select an active department from the controlled department list.' },
          { status: 400 }
        )
      }
    }

    const profileUpdates: Record<string, unknown> = {}
    if ('full_name' in body) profileUpdates.full_name = body.full_name
    if ('department' in body) profileUpdates.department = cleanDepartment || null
    if ('is_active' in body) profileUpdates.is_active = body.is_active

    if ('is_active' in body) {
      const { error } = await service.auth.admin.updateUserById(id, {
        ban_duration: body.is_active ? 'none' : '87600h',
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    if (body.new_password) {
      const { error } = await service.auth.admin.updateUserById(id, {
        password: body.new_password,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await service
        .from('profiles')
        .update(profileUpdates)
        .eq('id', id)

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
    const admin = await requireAdminApi()
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
