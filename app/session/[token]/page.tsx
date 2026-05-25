import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function SessionEntryPage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createServerSupabaseClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('subject_code, subject_name, short_code, teacher_name, is_active, expires_at')
    .eq('token', token)
    .single()

  const isExpired = session ? new Date(session.expires_at) < new Date() : false
  const isAvailable = Boolean(session?.is_active && !isExpired)

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <section className="glass" style={{ width: '100%', maxWidth: 440, padding: 28 }}>
        <div className="logo-gem" style={{ marginBottom: 18 }}>A</div>

        {!session && (
          <>
            <h1 style={{ color: 'var(--text)', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
              Session not found
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              This QR link is invalid or the session token has already rotated. Ask your lecturer to show the latest QR code.
            </p>
            <Link href="/manual" className="btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Enter short code
            </Link>
          </>
        )}

        {session && (
          <>
            <span className={isAvailable ? 'badge-em' : 'badge-danger'}>
              {isAvailable ? 'Live session' : 'Session closed'}
            </span>
            <h1 style={{ color: 'var(--text)', fontSize: 24, fontWeight: 800, marginTop: 14, marginBottom: 4 }}>
              {session.subject_code}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>
              {session.subject_name}
            </p>

            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 14,
              marginBottom: 20,
            }}>
              <div className="field-label">Lecturer</div>
              <div style={{ color: 'var(--text)', fontWeight: 700 }}>{session.teacher_name}</div>
              <div className="field-label" style={{ marginTop: 12 }}>Short code</div>
              <div style={{ color: 'var(--em)', fontFamily: 'monospace', fontSize: 22, fontWeight: 900, letterSpacing: '0.18em' }}>
                {session.short_code}
              </div>
            </div>

            {isAvailable ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                Attendance capture for students needs a public submission endpoint. This page is now routed correctly and ready for that form.
              </p>
            ) : (
              <p style={{ color: 'var(--danger)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                This session is no longer accepting attendance.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  )
}
