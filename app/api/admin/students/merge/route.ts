import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi } from '@/lib/auth'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { studentIdSchema } from '@/lib/validation'

const mergeSchema = z.object({
  source_student_id: studentIdSchema,
  target_student_id: studentIdSchema,
}).refine(value => value.source_student_id !== value.target_student_id, {
  message: 'Source and target student IDs must be different.',
})

export async function POST(req: Request) {
  try {
    const admin = await requireAdminApi()
    if (admin.error) return admin.error

    const parsed = mergeSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid merge request.' },
        { status: 400 }
      )
    }

    const service = createServiceSupabaseClient()
    const { data, error } = await service.rpc('merge_students', {
      p_source_student_id: parsed.data.source_student_id,
      p_target_student_id: parsed.data.target_student_id,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      moved: data ?? 0,
      source_student_id: parsed.data.source_student_id,
      target_student_id: parsed.data.target_student_id,
    })
  } catch (err) {
    console.error('POST /api/admin/students/merge error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
