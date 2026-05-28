import { NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('student_id')?.trim().toUpperCase()

    if (!studentId || studentId.length < 3) {
      return NextResponse.json(
        { error: 'Please enter a valid Student ID.' },
        { status: 400 }
      )
    }

    const supabase = createServiceSupabaseClient()

    const { data: records, error } = await supabase
      .from('attendance_records')
      .select(`
        id,
        session_id,
        student_id,
        student_name,
        year,
        department,
        status,
        geo_verified,
        marked_at,
        sessions(
          subject_code,
          subject_name,
          created_at
        )
      `)
      .eq('student_id', studentId)
      .order('marked_at', { ascending: false })

    if (error) {
      console.error('Lookup error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch records. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ records: records ?? [] })

  } catch (err) {
    console.error('GET /api/lookup error:', err)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
