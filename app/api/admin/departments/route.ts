import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi } from '@/lib/auth'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

const departmentSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required.').max(160),
})

export async function GET(req: Request) {
  try {
    const admin = await requireAdminApi()
    if (admin.error) return admin.error

    const { searchParams } = new URL(req.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const service = createServiceSupabaseClient()
    let query = service
      .from('departments')
      .select('name, is_active, created_at')
      .order('name', { ascending: true })

    if (!includeInactive) query = query.eq('is_active', true)

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('GET /api/admin/departments error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdminApi()
    if (admin.error) return admin.error

    const parsed = departmentSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid department.' },
        { status: 400 }
      )
    }

    const service = createServiceSupabaseClient()
    const { data, error } = await service
      .from('departments')
      .upsert({ name: parsed.data.name, is_active: true }, { onConflict: 'name' })
      .select('name, is_active, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('POST /api/admin/departments error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
