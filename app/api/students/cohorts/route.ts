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
    const { data, error } = await service
      .from('students')
      .select('academic_year, department')
      .not('academic_year', 'is', null)
      .not('department', 'is', null)

    if (error) {
      return NextResponse.json({ error: 'Failed to load student cohorts.' }, { status: 500 })
    }

    const counts = new Map<string, Cohort>()
    for (const student of data ?? []) {
      const department = student.department?.trim()
      if (!student.academic_year || !department) continue
      const key = `${student.academic_year}:${department}`
      const cohort = counts.get(key) ?? {
        academic_year: student.academic_year,
        department,
        student_count: 0,
      }
      cohort.student_count++
      counts.set(key, cohort)
    }

    return NextResponse.json(
      Array.from(counts.values()).sort((a, b) =>
        b.academic_year - a.academic_year || a.department.localeCompare(b.department)
      )
    )
  } catch (error) {
    console.error('GET /api/students/cohorts error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
