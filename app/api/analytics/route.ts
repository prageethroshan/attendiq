import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 })
    }

    const service = createServiceSupabaseClient()
    const { data, error } = await service.rpc('get_teacher_analytics', {
      p_teacher_id: user.id,
    })

    if (error) {
      console.error('Teacher analytics RPC error:', error)
      return NextResponse.json({ error: 'Failed to load analytics.' }, { status: 500 })
    }

    return NextResponse.json(data)

  } catch (err) {
    console.error('GET /api/analytics error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
