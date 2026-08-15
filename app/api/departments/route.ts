import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export async function GET() {
  try {
    const auth = await requireUser()
    if (auth.error) return auth.error

    const service = createServiceSupabaseClient()
    const { data, error } = await service
      .from('departments')
      .select('name, is_active, created_at')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to load departments.' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('GET /api/departments error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
