import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

async function verifyAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = createServiceSupabaseClient()
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return profile?.role === 'admin' || user.user_metadata?.role === 'admin'
    ? user
    : null
}

export async function GET(req: Request) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter')
    const service = createServiceSupabaseClient()

    let query = service
      .from('sessions')
      .select(`
        *,
        profiles!teacher_id (
          full_name,
          email,
          department
        ),
        attendance_records(count)
      `)
      .order('created_at', { ascending: false })

    if (filter === 'active') query = query.eq('is_active', true)
    if (filter === 'history') query = query.eq('is_active', false)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('GET /api/admin/sessions error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
