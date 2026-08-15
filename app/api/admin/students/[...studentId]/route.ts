import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi } from '@/lib/auth'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

const updateStudentSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  year: z.coerce.string().trim().regex(/^\d{1,2}$/, 'Year must be numeric.').optional(),
  department: z.string().trim().min(1, 'Department is required.').max(160).optional(),
  is_active: z.boolean().optional(),
}).refine(value => Object.keys(value).length > 0, {
  message: 'No valid fields to update.',
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ studentId: string[] }> }
) {
  try {
    const admin = await requireAdminApi()
    if (admin.error) return admin.error

    const { studentId } = await params
    const id = decodeURIComponent(studentId.join('/')).toUpperCase()
    const parsed = updateStudentSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid student update.' },
        { status: 400 }
      )
    }

    const service = createServiceSupabaseClient()
    const { data, error } = await service
      .from('students')
      .update(parsed.data)
      .eq('student_id', id)
      .select('student_id, name, year, department, academic_year, is_active, created_at')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('PATCH /api/admin/students/[...studentId] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
