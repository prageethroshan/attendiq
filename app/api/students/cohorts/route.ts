import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

interface Cohort {
  academic_year: number
  department: string
  student_count: number
}

export async function GET() {
  try {
    const auth = await requireUser()
    if (auth.error) return auth.error

    const service = createServiceSupabaseClient()
    const { data, error } = await service.rpc('get_student_cohorts')

    if (error) {
      return NextResponse.json({ error: 'Failed to load student cohorts.' }, { status: 500 })
    }

    return NextResponse.json((data ?? []) as Cohort[])
  } catch (error) {
    console.error('GET /api/students/cohorts error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
