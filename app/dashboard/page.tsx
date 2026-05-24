'use client'

import { useState, useEffect } from 'react'
import NewSessionModal from '@/components/NewSessionModal'
import SessionCard from '@/components/SessionCard'
import QrPanel from '@/components/QrPanel'
import type { Session } from '@/lib/supabase/types'

export default function SessionsPage() {
  const [showModal, setShowModal] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [qrSession, setQrSession] = useState<Session | null>(null)

  // Load active sessions on mount
  useEffect(() => {
    async function load() {
      const res = await fetch('/api/sessions?filter=active')
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      }
      setLoadingSessions(false)
    }
    load()
  }, [])

  function handleCreated(session: Session) {
    setSessions(prev => [session, ...prev])
    setShowModal(false)
  }

  function handleEnded(id: string) {
    setSessions(prev => prev.filter(s => s.id !== id))
    if (qrSession?.id === id) setQrSession(null)
  }

  function handleOpen(session: Session) {
    setQrSession(session)
  }

  return (
    <>
      {/* ── New Session Modal ── */}
      {showModal && (
        <NewSessionModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {/* ── QR Panel Modal ── */}
      {qrSession && (
        <>
          <div
            onClick={() => setQrSession(null)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(6px)',
              zIndex: 100,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%', maxWidth: 420,
            zIndex: 101,
            padding: '0 16px',
          }}>
            <QrPanel
              session={qrSession}
              onSessionEnded={() => {
                handleEnded(qrSession.id)
                setQrSession(null)
              }}
            />
          </div>
        </>
      )}

      {/* ── Page content ── */}
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
              {sessions.length > 0
                ? `${sessions.length} active session${sessions.length > 1 ? 's' : ''}`
                : 'No active sessions'}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            style={{
              width: 'auto', padding: '10px 20px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Session
          </button>
        </div>

        {/* Loading skeletons */}
        {loadingSessions && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2].map(i => (
              <div key={i} className="glass" style={{
                padding: 20, height: 160,
                background: 'rgba(255,255,255,0.02)',
                animation: 'shimmer 1.5s infinite',
              }}/>
            ))}
          </div>
        )}

        {/* Session cards */}
        {!loadingSessions && sessions.length > 0 && (
          <div>
            {sessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                onEnded={handleEnded}
                onOpen={handleOpen}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loadingSessions && sessions.length === 0 && (
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
              Click <strong style={{ color: 'var(--text)' }}>New Session</strong> to start taking attendance.
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

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.7; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </>
  )
}
