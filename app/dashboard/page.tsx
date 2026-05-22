'use client'

import { useState } from 'react'
import NewSessionModal from '@/components/NewSessionModal'

type Session = {
  id: string
  subject_code: string
  subject_name: string
  short_code: string
}

export default function SessionsPage() {
  const [showModal, setShowModal] = useState(false)
  const [activeSessions, setActiveSessions] = useState<Session[]>([])

  function handleCreated(session: Session) {
    setActiveSessions(prev => [session, ...prev])
    setShowModal(false)
  }

  return (
    <>
      {showModal && (
        <NewSessionModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      <div>
        {/* Page header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}>
          <div>
            <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
              Sessions
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Create and manage your attendance sessions
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Session
          </button>
        </div>

        {/* Active sessions */}
        {activeSessions.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {activeSessions.map(session => (
              <div key={session.id} className="glass" style={{
                padding: 20,
                marginBottom: 12,
                borderColor: 'var(--em-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="badge-em">● Live</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                    {session.subject_code} — {session.subject_name}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 'auto' }}>
                    Code: <strong style={{ color: 'var(--em)', fontFamily: 'monospace', letterSpacing: '0.15em' }}>{session.short_code}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {activeSessions.length === 0 && (
          <div className="glass" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56,
              background: 'var(--em-glow)',
              border: '1px solid var(--em-border)',
              borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--em)" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <h2 style={{ color: 'var(--text)', fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
              No active sessions
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 300, margin: '0 auto 20px' }}>
              Click <strong style={{ color: 'var(--text)' }}>New Session</strong> to start taking attendance for a class.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 24px', margin: '0 auto' }}
            >
              + New Session
            </button>
          </div>
        )}
      </div>
    </>
  )
}
