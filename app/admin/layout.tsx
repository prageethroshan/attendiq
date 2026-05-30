import { requireAdmin } from '@/lib/admin'
import AdminNav from '@/components/AdminNav'
import LogoutButton from '@/components/LogoutButton'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin()

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(7,20,16,0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1400, margin: '0 auto',
          padding: '0 24px', minHeight: 60,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div className="logo-gem" style={{ width: 34, height: 34, borderRadius: 10, fontSize: 15 }}>
              A
            </div>
            <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>
              Attend<span style={{ color: 'var(--em)' }}>IQ</span>
            </span>
            <span style={{
              background: 'rgba(248,113,113,0.12)',
              border: '1px solid rgba(248,113,113,0.3)',
              color: 'var(--danger)',
              borderRadius: 6, fontSize: 10,
              fontWeight: 700, padding: '2px 8px',
              letterSpacing: '0.08em',
            }}>
              ADMIN
            </span>
          </div>

          <AdminNav />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{
              color: 'var(--text-muted)',
              fontSize: 13,
              maxWidth: 180,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        {children}
      </main>
    </div>
  )
}
