import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import StudentScanForm from './StudentScanForm'

interface Props {
  params: Promise<{ token: string }>
}

export default async function SessionPage({ params }: Props) {
  const { token } = await params
  const supabase = await createServerSupabaseClient()

  const { data: session } = await supabase
    .from('sessions')
    .select(`
      id,
      token,
      subject_code,
      subject_name,
      teacher_name,
      is_active,
      expires_at,
      enrolled_ids,
      geo_lat,
      geo_lng,
      geo_radius_m
    `)
    .eq('token', token)
    .single()

  if (!session) return notFound()

  const isExpired = new Date(session.expires_at) < new Date()

  if (!session.is_active || isExpired) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}>
        <div className="glass" style={{ padding: 36, maxWidth: 360, width: '100%', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56,
            borderRadius: '50%',
            background: 'rgba(251,191,36,0.1)',
            border: '1px solid rgba(251,191,36,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>

          <h1 style={{ color: 'var(--text)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Session Ended
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            This QR code has expired or the session was ended by your lecturer.
          </p>
          <div style={{
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 13,
            color: 'var(--warning)',
          }}>
            Ask your lecturer for the current QR code or short code.
          </div>
        </div>
      </div>
    )
  }

  return (
    <StudentScanForm
      sessionId={session.id}
      token={session.token}
      subjectCode={session.subject_code}
      subjectName={session.subject_name}
      teacherName={session.teacher_name}
      enrolledIds={session.enrolled_ids ?? []}
      geoConfig={
        session.geo_lat !== null
          ? {
              lat: session.geo_lat,
              lng: session.geo_lng!,
              radiusM: session.geo_radius_m!,
            }
          : null
      }
    />
  )
}
