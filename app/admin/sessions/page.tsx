'use client'

import { useEffect, useState } from 'react'

interface AdminSession {
  id: string; subject_code: string; subject_name: string; is_active: boolean
  created_at: string; expires_at: string
  profiles?: { full_name?: string; email?: string; department?: string | null }
  attendance_records?: Array<{ count: number }>
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'history'>('all')
  const [searchTeacher, setSearch] = useState('')

  function loadSessions() {
    setLoading(true)
    setError('')
    const params = filter !== 'all' ? `?filter=${filter}` : ''
    fetch(`/api/admin/sessions${params}`)
      .then(response => response.json())
      .then(data => {
        setSessions(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load sessions.')
        setLoading(false)
      })
  }

  useEffect(() => {
    loadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function deleteSession(session: AdminSession) {
    const confirmed = window.confirm(
      `Delete ${session.subject_code} - ${session.subject_name}?\n\nThis permanently removes the session, its attendance records, and its enrolled roster snapshot.`
    )
    if (!confirmed) return

    setDeletingId(session.id)
    setError('')
    try {
      const response = await fetch(`/api/admin/sessions/${session.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? 'Failed to delete session.')
        return
      }
      setSessions(prev => prev.filter(item => item.id !== session.id))
    } catch {
      setError('Failed to delete session.')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = sessions.filter(session =>
    !searchTeacher ||
    session.profiles?.full_name?.toLowerCase().includes(searchTeacher.toLowerCase()) ||
    session.profiles?.email?.toLowerCase().includes(searchTeacher.toLowerCase())
  )

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          All Sessions
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Every session across all teachers
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'active', 'history'] as const).map(option => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              style={{
                padding: '7px 14px', borderRadius: 8,
                border: '1px solid', fontSize: 13,
                fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.15s',
                ...(filter === option ? {
                  background: 'var(--em-glow)',
                  borderColor: 'var(--em-border)',
                  color: 'var(--em)',
                } : {
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-muted)',
                }),
              }}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={searchTeacher}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search by teacher..."
          className="input"
          style={{ fontSize: 13, maxWidth: 220, flex: 1 }}
        />
      </div>

      {error && (
        <div style={{
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 8,
          color: 'var(--danger)',
          fontSize: 13,
          padding: '10px 12px',
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      <div className="glass" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto', display: 'block' }}>
              <circle cx="12" cy="12" r="10" stroke="var(--text-dim)" strokeWidth="3"/>
              <path fill="var(--em)" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No sessions found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                  {['Subject', 'Teacher', 'Department', 'Status', 'Scans', 'Started', 'Expires', 'Actions'].map(header => (
                    <th key={header} style={{
                      padding: '10px 14px', textAlign: 'left',
                      color: 'var(--text-muted)', fontWeight: 600,
                      fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((session, index) => (
                  <tr key={session.id} style={{
                    borderBottom: index < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                    background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ color: 'var(--text)', fontWeight: 600 }}>{session.subject_code}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 1 }}>{session.subject_name}</div>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                      {session.profiles?.full_name ?? '-'}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12 }}>
                      {session.profiles?.department ?? '-'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {session.is_active ? (
                        <span className="badge-em" style={{ fontSize: 11 }}>Active</span>
                      ) : (
                        <span style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-muted)',
                          borderRadius: 5, fontSize: 11,
                          fontWeight: 600, padding: '2px 7px',
                        }}>
                          Ended
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--em)', fontWeight: 700 }}>
                      {session.attendance_records?.[0]?.count ?? 0}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(session.created_at).toLocaleString('en-LK', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(session.expires_at).toLocaleTimeString('en-LK', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => deleteSession(session)}
                        disabled={deletingId === session.id}
                        style={{
                          fontSize: 12,
                          padding: '5px 10px',
                          borderRadius: 7,
                          border: '1px solid rgba(248,113,113,0.2)',
                          background: 'rgba(248,113,113,0.08)',
                          color: 'var(--danger)',
                          cursor: deletingId === session.id ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        {deletingId === session.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
