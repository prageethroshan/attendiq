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
