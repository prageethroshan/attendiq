import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { deviceIdentity, setDeviceCookie } from '@/lib/security'

export async function POST(req: NextRequest) {
  try {
    const { sessionId, token } = await req.json()

    if (!sessionId || !token) {
      return NextResponse.json({ blocked: false })
    }

    const supabase = createServiceSupabaseClient()
    const { data: session } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('token', token)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (!session) return NextResponse.json({ blocked: false }, { status: 404 })

    const device = await deviceIdentity(req)

    const { data } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('session_id', sessionId)
      .eq('device_fp', device.id)
      .limit(1)
      .maybeSingle()

    return setDeviceCookie(NextResponse.json({ blocked: !!data }), device.cookie)

  } catch {
    return NextResponse.json({ error: 'Device check unavailable.' }, { status: 503 })
  }
}
