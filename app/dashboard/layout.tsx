import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import DashboardNav from '@/components/DashboardNav'
import LogoutButton from '@/components/LogoutButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const teacherName = user.user_metadata?.full_name ?? user.email ?? 'Teacher'
  const avatarLetter = teacherName.charAt(0).toUpperCase()

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ── Sticky top nav ── */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(7,20,16,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div className="logo-gem" style={{ width: 34, height: 34, borderRadius: 10, fontSize: 15 }}>
              A
            </div>
            <span style={{
              color: 'var(--text)',
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: '-0.02em',
            }}>
              Attend<span style={{ color: 'var(--em)' }}>IQ</span>
            </span>
          </div>

          {/* Centre tabs */}
          <DashboardNav />

          {/* Right — avatar + name + logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{
              width: 30, height: 30,
              borderRadius: '50%',
              background: 'var(--em-glow)',
              border: '1px solid var(--em-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'var(--em)',
            }}>
              {avatarLetter}
            </div>
            <span style={{
              color: 'var(--text-muted)',
              fontSize: 13,
              maxWidth: 160,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {teacherName}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {children}
      </main>
    </div>
  )
}
