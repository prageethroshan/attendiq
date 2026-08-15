import { NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { requireAdminApi } from '@/lib/auth'

export async function GET() {
  try {
    const admin = await requireAdminApi()
    if (admin.error) return admin.error

    const service = createServiceSupabaseClient()
    const { data, error } = await service.rpc('get_admin_analytics')

    if (error) {
      console.error('Admin analytics RPC error:', error)
      return NextResponse.json({ error: 'Failed to load analytics.' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('GET /api/admin/analytics error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
