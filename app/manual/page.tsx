import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type PageProps = {
  searchParams: Promise<{ code?: string }>
}

export default async function ManualEntryPage({ searchParams }: PageProps) {
  const { code } = await searchParams
  const shortCode = code?.trim().toUpperCase() ?? ''
  const supabase = await createServerSupabaseClient()

  const { data: session } = shortCode
    ? await supabase
        .from('sessions')
        .select('token, subject_code, subject_name, is_active, expires_at')
        .eq('short_code', shortCode)
        .single()
    : { data: null }

  const isExpired = session ? new Date(session.expires_at) < new Date() : false
  const canOpen = Boolean(session?.is_active && !isExpired)

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
        <h1 style={{ color: 'var(--text)', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
          Enter session code
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 22 }}>
          Use the short code shown on the lecturer's screen.
        </p>

        <form action="/manual" style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <input
            name="code"
            defaultValue={shortCode}
            className="input"
            placeholder="ABC123"
            maxLength={6}
            style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.14em' }}
          />
          <button className="btn-primary" style={{ width: 'auto', paddingLeft: 18, paddingRight: 18 }}>
            Go
          </button>
        </form>

        {shortCode && !session && (
          <p style={{ color: 'var(--danger)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            No active session was found for that code. Check the code and try again.
          </p>
        )}

        {session && !canOpen && (
          <p style={{ color: 'var(--danger)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            That session has ended or expired.
          </p>
        )}

        {session && canOpen && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 14,
          }}>
            <div className="field-label">Matched session</div>
            <div style={{ color: 'var(--text)', fontWeight: 800, marginBottom: 4 }}>
              {session.subject_code}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
              {session.subject_name}
            </div>
            <Link href={`/session/${session.token}`} className="btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Open session
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}
