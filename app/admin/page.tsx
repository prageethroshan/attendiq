'use client'

import { useEffect, useRef, useState } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase/client'

interface LiveSession {
  id: string
  subject_code: string
  subject_name: string
  teacher_name: string
  teacher_email: string
  department: string | null
  short_code: string
  expires_at: string
  enrolled_ids: string[]
  geo_lat: number | null
  is_active: boolean
  created_at: string
  scanCount: number
}

function TimeLeft({ expiresAt }: { expiresAt: string }) {
  const [text, setText] = useState('')
  const [warn, setWarn] = useState(false)

  useEffect(() => {
    function tick() {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setText('Expired')
        return
      }
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setText(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      setWarn(diff < 5 * 60 * 1000)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return (
    <span style={{ color: warn ? 'var(--warning)' : 'var(--em)', fontFamily: 'monospace', fontWeight: 700 }}>
      {text}
    </span>
  )
}

export default function AdminMonitorPage() {
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [endingId, setEndingId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [error, setError] = useState('')
  const scanCounts = useRef<Map<string, number>>(new Map())

  async function loadSessions() {
    try {
      const res = await fetch('/api/admin/sessions?filter=active')
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? 'Failed to load sessions.')
        setLoading(false)
        return
      }

      if (!Array.isArray(data)) {
        setError('Unexpected response format from server.')
        setLoading(false)
        return
      }

      const mapped: LiveSession[] = data.map((session: any) => ({
        id: session.id,
        subject_code: session.subject_code,
        subject_name: session.subject_name,
        teacher_name: session.profiles?.full_name ?? session.teacher_name ?? 'Unknown',
        teacher_email: session.profiles?.email ?? '',
        department: session.profiles?.department ?? null,
        short_code: session.short_code,
        expires_at: session.expires_at,
        enrolled_ids: session.enrolled_ids ?? [],
        geo_lat: session.geo_lat,
        is_active: session.is_active,
        created_at: session.created_at,
        scanCount: session.attendance_records?.[0]?.count ?? scanCounts.current.get(session.id) ?? 0,
      }))

      mapped.forEach(session => scanCounts.current.set(session.id, session.scanCount))
      setSessions(mapped)
      setLastUpdate(new Date())
      setError('')
    } catch {
      setError('Network error loading sessions.')
    }

    setLoading(false)
  }

  useEffect(() => {
    loadSessions()
    const id = setInterval(loadSessions, 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const supabase = createClientSupabaseClient()

    const channel = supabase
      .channel('admin-monitor')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'attendance_records',
      }, (payload: { new: { session_id: string } }) => {
        const sessionId = payload.new.session_id as string
        setSessions(prev => prev.map(session =>
          session.id === sessionId
            ? { ...session, scanCount: session.scanCount + 1 }
            : session
        ))
        scanCounts.current.set(sessionId, (scanCounts.current.get(sessionId) ?? 0) + 1)
        setLastUpdate(new Date())
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const supabase = createClientSupabaseClient()

    const channel = supabase
      .channel('admin-sessions')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
      }, (payload: { new: { id: string; is_active: boolean } }) => {
        if (payload.new.is_active === false) {
          setSessions(prev => prev.filter(session => session.id !== payload.new.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function handleEndSession(sessionId: string) {
    if (confirming !== sessionId) {
      setConfirming(sessionId)
      setTimeout(() => setConfirming(null), 4000)
      return
    }

    setEndingId(sessionId)
    setConfirming(null)

    await fetch(`/api/admin/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    })

    setSessions(prev => prev.filter(session => session.id !== sessionId))
    setEndingId(null)
  }

  const totalScans = sessions.reduce((sum, session) => sum + session.scanCount, 0)
  const totalEnrolled = sessions.reduce((sum, session) => sum + (session.enrolled_ids?.length ?? 0), 0)

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            Live Monitor
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {sessions.length > 0
              ? `${sessions.length} active session${sessions.length !== 1 ? 's' : ''} across all teachers`
              : 'No active sessions right now'}
            {lastUpdate && (
              <span style={{ color: 'var(--text-dim)', marginLeft: 8 }}>
                - Updated {lastUpdate.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={loadSessions}
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {sessions.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12, marginBottom: 20,
        }}>
          {[
            { label: 'Active Sessions', value: sessions.length, color: 'var(--em)' },
            { label: 'Total Scans', value: totalScans, color: 'var(--em)' },
            { label: 'Total Enrolled', value: totalEnrolled || '-', color: 'var(--text)' },
            {
              label: 'Last Activity',
              value: lastUpdate?.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) ?? '-',
              color: 'var(--text-muted)',
            },
          ].map(card => (
            <div key={card.label} className="glass" style={{ padding: '14px 18px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>
                {card.label.toUpperCase()}
              </div>
              <div style={{ color: card.color, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          color: 'var(--danger)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{error}</span>
          <button
            onClick={() => {
              setError('')
              loadSessions()
            }}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'var(--danger)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              padding: 0,
            }}
          >
            Retry -&gt;
          </button>
        </div>
      )}

      {loading && (
        <div className="glass" style={{ padding: 48, textAlign: 'center' }}>
          <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 14px', display: 'block' }}>
            <circle cx="12" cy="12" r="10" stroke="var(--text-dim)" strokeWidth="3"/>
            <path fill="var(--em)" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading live sessions...</p>
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <div className="glass" style={{ padding: 56, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56,
            background: 'var(--em-glow)',
            border: '1px solid var(--em-border)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--em)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h2 style={{ color: 'var(--text)', fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
            No active sessions
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Sessions will appear here in real time as teachers start them.
          </p>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 14,
        }}>
          {sessions.map(session => {
            const rate = session.enrolled_ids?.length > 0
              ? Math.round((session.scanCount / session.enrolled_ids.length) * 100)
              : null

            return (
              <div
                key={session.id}
                className="glass"
                style={{
                  padding: 20,
                  borderColor: 'var(--em-border)',
                  opacity: endingId === session.id ? 0.4 : 1,
                  transition: 'opacity 0.3s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="badge-em" style={{ fontSize: 10 }}>
                        <span style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: 'var(--em)', display: 'inline-block',
                          marginRight: 4, animation: 'pulse-dot 1.5s infinite',
                        }}/>
                        Live
                      </span>
                      {session.geo_lat && (
                        <span style={{
                          background: 'rgba(96,165,250,0.12)',
                          border: '1px solid rgba(96,165,250,0.25)',
                          color: 'var(--info)', borderRadius: 5,
                          fontSize: 10, fontWeight: 600, padding: '1px 6px',
                        }}>
                          Geo
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                      {session.subject_code}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {session.subject_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'var(--em-glow)',
                        border: '1px solid var(--em-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700, color: 'var(--em)',
                        flexShrink: 0,
                      }}>
                        {session.teacher_name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {session.teacher_name}
                      </span>
                      {session.department && (
                        <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                          - {session.department}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{
                    background: 'var(--em-glow)',
                    border: '1px solid var(--em-border)',
                    borderRadius: 8, padding: '6px 10px',
                    textAlign: 'center', flexShrink: 0,
                  }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 2 }}>
                      CODE
                    </div>
                    <div style={{ color: 'var(--em)', fontFamily: 'monospace', fontWeight: 800, fontSize: 16, letterSpacing: '0.15em' }}>
                      {session.short_code}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                  gap: 8, marginBottom: 14,
                }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 10px', textAlign: 'center',
                  }}>
                    <div style={{ color: 'var(--em)', fontSize: 20, fontWeight: 800, lineHeight: 1 }}>
                      {session.scanCount}
                    </div>
                    <div style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 3 }}>
                      scanned
                      {session.enrolled_ids?.length > 0 && ` / ${session.enrolled_ids.length}`}
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 10px', textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: 20, fontWeight: 800, lineHeight: 1,
                      color: rate === null ? 'var(--text-muted)'
                        : rate >= 75 ? 'var(--em)'
                        : rate >= 50 ? 'var(--warning)'
                        : 'var(--danger)',
                    }}>
                      {rate !== null ? `${rate}%` : '-'}
                    </div>
                    <div style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 3 }}>
                      rate
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 10px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1, marginBottom: 3 }}>
                      <TimeLeft expiresAt={session.expires_at} />
                    </div>
                    <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                      remaining
                    </div>
                  </div>
                </div>

                {session.enrolled_ids?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{
                      height: 6, background: 'rgba(255,255,255,0.06)',
                      borderRadius: 3, overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, Math.round((session.scanCount / session.enrolled_ids.length) * 100))}%`,
                        background: 'var(--em)',
                        borderRadius: 3,
                        transition: 'width 0.5s ease',
                      }}/>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{
                    flex: 1, fontSize: 11,
                    color: 'var(--text-dim)',
                    display: 'flex', alignItems: 'center',
                  }}>
                    Started {new Date(session.created_at).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  <button
                    onClick={() => handleEndSession(session.id)}
                    disabled={endingId === session.id}
                    style={{
                      padding: '7px 14px', borderRadius: 8,
                      border: '1px solid', fontSize: 12,
                      fontWeight: 600,
                      cursor: endingId === session.id ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                      ...(confirming === session.id ? {
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
                    {endingId === session.id
                      ? 'Ending...'
                      : confirming === session.id
                      ? 'Confirm end?'
                      : 'End Session'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
