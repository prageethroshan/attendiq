import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi } from '@/lib/auth'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

const updateDepartmentSchema = z.object({
  is_active: z.boolean(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ name: string[] }> }
) {
  try {
    const admin = await requireAdminApi()
    if (admin.error) return admin.error

    const { name } = await params
    const departmentName = decodeURIComponent(name.join('/'))
    const parsed = updateDepartmentSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'is_active must be a boolean.' }, { status: 400 })
    }

    const service = createServiceSupabaseClient()
    const { data, error } = await service
      .from('departments')
      .update({ is_active: parsed.data.is_active })
      .eq('name', departmentName)
      .select('name, is_active, created_at')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Department not found.' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('PATCH /api/admin/departments/[...name] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
