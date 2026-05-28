import { NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export async function POST(req: Request) {
  try {
    const { sessionId, deviceFp } = await req.json()

    if (!sessionId || !deviceFp) {
      return NextResponse.json({ blocked: false })
    }

    const supabase = createServiceSupabaseClient()

    const { data } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('session_id', sessionId)
      .eq('device_fp', deviceFp)
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ blocked: !!data })

  } catch {
    return NextResponse.json({ blocked: false })
  }
}
