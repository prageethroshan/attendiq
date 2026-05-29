import Link from 'next/link'

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(7,20,16,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          padding: '0 24px', height: 60,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="logo-gem" style={{ width: 34, height: 34, borderRadius: 10, fontSize: 15 }}>
              A
            </div>
            <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>
              Attend<span style={{ color: 'var(--em)' }}>IQ</span>
            </span>
          </div>

          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ width: 'auto', padding: '9px 22px', fontSize: 14 }}>
              Teacher Sign In -&gt;
            </button>
          </Link>
        </div>
      </header>

      <section style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px 60px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ maxWidth: 680, position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--em-glow)',
            border: '1px solid var(--em-border)',
            borderRadius: 20, padding: '5px 14px',
            fontSize: 12, fontWeight: 600, color: 'var(--em)',
            marginBottom: 28,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--em)',
              animation: 'pulse-dot 1.5s infinite',
            }}/>
            Rajarata University of Sri Lanka - Dept. of Accountancy &amp; Finance
          </div>

          <h1 style={{
            color: 'var(--text)',
            fontSize: 'clamp(32px, 6vw, 56px)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: 20,
          }}>
            Attendance made{' '}
            <span style={{ color: 'var(--em)', position: 'relative' }}>
              effortless
            </span>
          </h1>

          <p style={{
            color: 'var(--text-muted)',
            fontSize: 18, lineHeight: 1.7,
            maxWidth: 520, margin: '0 auto 40px',
          }}>
            Students scan a QR code on the projector. Attendance is marked in seconds.
            No app downloads, no paper registers, no manual entry.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{
                width: 'auto', padding: '13px 28px',
                fontSize: 15, borderRadius: 12,
              }}>
                Sign in as Teacher -&gt;
              </button>
            </Link>
            <Link href="/lookup" style={{ textDecoration: 'none' }}>
              <button className="btn-ghost" style={{
                padding: '13px 28px',
                fontSize: 15, borderRadius: 12,
              }}>
                Check my attendance
              </button>
            </Link>
          </div>

          <div style={{
            display: 'flex', gap: 0,
            justifyContent: 'center',
            border: '1px solid var(--border)',
            borderRadius: 14,
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.02)',
            maxWidth: 480, margin: '0 auto',
          }}>
            {[
              { value: '~150', label: 'Students / session' },
              { value: '2 min', label: 'QR rotation' },
              { value: '100%', label: 'Server validated' },
            ].map((stat, index) => (
              <div key={stat.label} style={{
                flex: 1, padding: '16px 12px', textAlign: 'center',
                borderRight: index < 2 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ color: 'var(--em)', fontSize: 20, fontWeight: 800, marginBottom: 3 }}>
                  {stat.value}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '60px 24px', background: 'rgba(255,255,255,0.015)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{
            color: 'var(--text)', fontSize: 28, fontWeight: 700,
            textAlign: 'center', marginBottom: 8,
          }}>
            How it works
          </h2>
          <p style={{
            color: 'var(--text-muted)', fontSize: 15,
            textAlign: 'center', marginBottom: 48,
          }}>
            Three steps. Under 10 seconds per student.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
          }}>
            {[
              {
                step: '01',
                title: 'Teacher starts a session',
                desc: 'Select the subject, set duration, and click Start. A QR code and 6-character short code appear instantly.',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--em)" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'Students scan or type the code',
                desc: 'Students scan the QR with their phone camera or visit /manual and type the 6-character code shown on the projector.',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--em)" strokeWidth="2" strokeLinecap="round">
                    <rect x="5" y="2" width="14" height="20" rx="2"/>
                    <line x1="12" y1="18" x2="12.01" y2="18"/>
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Attendance is recorded',
                desc: 'The server validates the submission - checking enrollment, duplicates, and location. The teacher sees the live count update in real time.',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--em)" strokeWidth="2" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ),
              },
            ].map(item => (
              <div key={item.step} className="glass" style={{ padding: 24 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: 'var(--em-glow)',
                    border: '1px solid var(--em-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.icon}
                  </div>
                  <span style={{
                    color: 'var(--text-dim)', fontSize: 12,
                    fontWeight: 800, fontFamily: 'monospace',
                  }}>
                    {item.step}
                  </span>
                </div>
                <h3 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                  {item.title}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.65 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{
            color: 'var(--text)', fontSize: 28, fontWeight: 700,
            textAlign: 'center', marginBottom: 8,
          }}>
            Everything you need
          </h2>
          <p style={{
            color: 'var(--text-muted)', fontSize: 15,
            textAlign: 'center', marginBottom: 48,
          }}>
            Built specifically for Rajarata University classroom conditions.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {[
              { title: 'Rotating QR codes', desc: 'Token changes every 2 minutes - prevents students sharing the link after class.' },
              { title: 'Manual short code', desc: 'If camera scanning fails, students type the 6-character code shown on the projector.' },
              { title: 'Device lock', desc: 'One phone can only mark attendance once per session. Proxy attendance is blocked.' },
              { title: 'Geo verification', desc: 'Optional location check confirms students are physically in the classroom.' },
              { title: 'Live scan counter', desc: 'Teachers see the attendance count update in real time as students submit.' },
              { title: 'Enrollment lists', desc: 'Upload a CSV of enrolled students - only listed students can mark attendance.' },
              { title: 'Analytics & exports', desc: 'Attendance rates by subject, suspicious submission reports, Excel register export.' },
              { title: 'Student lookup portal', desc: 'Students check their own attendance at /lookup - self-service before appealing.' },
            ].map(feature => (
              <div key={feature.title} className="glass" style={{ padding: '16px 18px' }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--em)', marginBottom: 10,
                }}/>
                <h3 style={{ color: 'var(--text)', fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                  {feature.title}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6 }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{
        padding: '60px 24px',
        background: 'rgba(255,255,255,0.015)',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--text)', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Are you a student?
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
            You don&apos;t need to sign in. Scan the QR code in your classroom,
            or use one of the links below.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/manual" style={{ textDecoration: 'none' }}>
              <div className="glass" style={{
                padding: '16px 24px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'border-color 0.15s',
                minWidth: 220,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: 'var(--em-glow)',
                  border: '1px solid var(--em-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--em)" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
                    Enter session code
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 1 }}>
                    Type the code from the projector
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/lookup" style={{ textDecoration: 'none' }}>
              <div className="glass" style={{
                padding: '16px 24px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'border-color 0.15s',
                minWidth: 220,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: 'var(--em-glow)',
                  border: '1px solid var(--em-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--em)" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
                    Check my attendance
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 1 }}>
                    View your attendance record
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '24px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8, marginBottom: 8,
        }}>
          <div className="logo-gem" style={{ width: 24, height: 24, borderRadius: 7, fontSize: 11 }}>
            A
          </div>
          <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>
            Attend<span style={{ color: 'var(--em)' }}>IQ</span>
          </span>
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>
          Rajarata University of Sri Lanka - Department of Accountancy &amp; Finance
        </p>
      </footer>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
