'use client'

import { useState, useEffect } from 'react'
import type { Session } from '@/lib/supabase/types'

interface Props {
  session: Session
  onEnded: (id: string) => void
  onOpen: (session: Session) => void
  onUpload: (session: Session) => void
  onManual: (session: Session) => void
}

export default function SessionCard({ session, onEnded, onOpen, onUpload, onManual }: Props) {
  const [ending, setEnding] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [isExpiringSoon, setIsExpiringSoon] = useState(false)

  // Live countdown to expiry
  useEffect(() => {
    function tick() {
      const diff = new Date(session.expires_at).getTime() - Date.now()
      setIsExpiringSoon(diff < 5 * 60 * 1000)
      if (diff <= 0) { setTimeLeft('Expired'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session.expires_at])

  async function handleEnd() {
    if (!confirmed) {
      setConfirmed(true)
      // Auto-reset confirm state after 4 seconds if not clicked
      setTimeout(() => setConfirmed(false), 4000)
      return
    }
    setEnding(true)
    const res = await fetch(`/api/sessions/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    })
    if (res.ok) {
      onEnded(session.id)
    } else {
      setEnding(false)
      setConfirmed(false)
    }
  }

  return (
    <div
      className="glass"
      style={{
        padding: 20,
        marginBottom: 12,
        borderColor: 'var(--em-border)',
        transition: 'opacity 0.3s',
        opacity: ending ? 0.5 : 1,
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="badge-em">
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--em)',
                display: 'inline-block',
                animation: 'pulse-dot 1.5s infinite',
              }}/>
              Live
            </span>
            {isExpiringSoon && (
              <span style={{
                background: 'rgba(251,191,36,0.12)',
                border: '1px solid rgba(251,191,36,0.25)',
                color: 'var(--warning)',
                borderRadius: 6, fontSize: 11, fontWeight: 600,
                padding: '2px 8px',
              }}>
                Expiring soon
              </span>
            )}
          </div>
          <h3 style={{ color: 'var(--text)', fontWeight: 700, fontSize: 16, marginBottom: 2 }}>
            {session.subject_code}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {session.subject_name}
          </p>
        </div>

        {/* Short code */}
        <div style={{
          background: 'var(--em-glow)',
          border: '1px solid var(--em-border)',
          borderRadius: 10,
          padding: '8px 14px',
          textAlign: 'center',
          flexShrink: 0,
        }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 3 }}>
            SHORT CODE
          </div>
          <div style={{
            color: 'var(--em)',
            fontFamily: 'monospace',
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: '0.2em',
          }}>
            {session.short_code}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        marginBottom: 14,
      }}>
        {[
          {
            label: 'Expires in',
            value: timeLeft,
            color: isExpiringSoon ? 'var(--warning)' : 'var(--text)',
          },
          {
            label: 'Geo verify',
            value: session.geo_lat ? `${session.geo_radius_m}m radius` : 'Off',
            color: session.geo_lat ? 'var(--em)' : 'var(--text-muted)',
          },
          {
            label: 'Enrolled',
            value: session.enrolled_ids?.length
              ? `${session.enrolled_ids.length} students`
              : 'Open',
            color: 'var(--text)',
          },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '8px 10px',
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 3 }}>
              {stat.label.toUpperCase()}
            </div>
            <div style={{ color: stat.color, fontSize: 13, fontWeight: 600 }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onOpen(session)}
          className="btn-primary"
          style={{ flex: 2, padding: '9px 16px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          Open QR Panel
        </button>

        <button
          onClick={() => onUpload(session)}
          className="btn-ghost"
          style={{
            flex: 1,
            padding: '9px 16px',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
          title="Upload enrollment list"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="16 16 12 12 8 16"/>
            <line x1="12" y1="12" x2="12" y2="21"/>
            <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
          </svg>
          Enroll
        </button>

        <button
          onClick={() => onManual(session)}
          className="btn-ghost"
          style={{
            flex: 1,
            padding: '9px 16px',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
          title="Mark attendance manually"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Manual
        </button>

        <button
          onClick={handleEnd}
          disabled={ending}
          style={{
            flex: 1,
            padding: '9px 16px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 10,
            border: '1px solid',
            cursor: ending ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            ...(confirmed ? {
              background: 'rgba(248,113,113,0.15)',
              borderColor: 'rgba(248,113,113,0.4)',
              color: 'var(--danger)',
            } : {
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-muted)',
            }),
          }}
        >
          {ending ? 'Ending…' : confirmed ? 'Confirm end?' : 'End Session'}
        </button>
      </div>
    </div>
  )
}
