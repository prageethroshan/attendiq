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
    if (typeof body.is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active must be a boolean.' }, { status: 400 })
    }
    const service = createServiceSupabaseClient()

    const { data, error } = await service
      .from('sessions')
      .update({ is_active: body.is_active })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('PATCH /api/admin/sessions/[id] error:', err)
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
    const service = createServiceSupabaseClient()

    const { data: session, error: sessionError } = await service
      .from('sessions')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 })
    }

    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }

    const { error: attendanceError } = await service
      .from('attendance_records')
      .delete()
      .eq('session_id', id)

    if (attendanceError) {
      return NextResponse.json({ error: attendanceError.message }, { status: 500 })
    }

    const { error } = await service
      .from('sessions')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/admin/sessions/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
