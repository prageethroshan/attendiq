'use client'

import { useCallback, useEffect, useState } from 'react'

interface AttendanceRow {
  id: string
  session_id: string
  student_id: string
  student_name: string
  year: string
  department: string | null
  status: string
  device_fp: string | null
  geo_verified: boolean | null
  dist_metres: number | null
  marked_at: string
  sessions: {
    subject_code: string
    subject_name: string
    created_at: string
  }
}

interface SessionOption {
  id: string
  subject_code: string
  subject_name: string
  created_at: string
  is_active: boolean
}

export default function LogPage() {
  const [records, setRecords] = useState<AttendanceRow[]>([])
  const [sessions, setSessions] = useState<SessionOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState('')
  const [searchId, setSearchId] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(data => setSessions(Array.isArray(data) ? data : []))
  }, [])

  const loadRecords = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedSession) params.set('session_id', selectedSession)
    if (searchId.trim()) params.set('student_id', searchId.trim().toUpperCase())
    params.set('page', String(page))

    const res = await fetch(`/api/attendance?${params}`)
    const data = await res.json()

    if (res.ok) {
      setRecords(data.records ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    }
    setLoading(false)
  }, [selectedSession, searchId, page])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useEffect(() => {
    setPage(1)
  }, [selectedSession, searchId])

  function exportCSV() {
    if (records.length === 0) return
    const headers = [
      'Student ID', 'Name', 'Year', 'Department',
      'Subject Code', 'Subject Name', 'Status',
      'Geo Verified', 'Distance (m)', 'Marked At',
    ]
    const rows = records.map(r => [
      r.student_id,
      r.student_name,
      r.year,
      r.department ?? '',
      r.sessions?.subject_code ?? '',
      r.sessions?.subject_name ?? '',
      r.status,
      r.geo_verified === null ? 'N/A' : r.geo_verified ? 'Yes' : 'No',
      r.dist_metres ?? '',
      new Date(r.marked_at).toLocaleString('en-LK'),
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendiq-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function isFlagged(r: AttendanceRow) {
    return r.geo_verified === false
  }

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 24,
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            Attendance Log
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {total > 0 ? `${total} record${total !== 1 ? 's' : ''}` : 'No records yet'}
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={records.length === 0}
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export CSV
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
        marginBottom: 16,
      }}>
        <div>
          <label className="field-label">Filter by session</label>
          <select
            value={selectedSession}
            onChange={e => setSelectedSession(e.target.value)}
            className="input"
            style={{ fontSize: 13, cursor: 'pointer' }}
          >
            <option value="">All sessions</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.subject_code} - {new Date(s.created_at).toLocaleDateString('en-LK')}
                {s.is_active ? ' live' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Search student ID</label>
          <input
            type="text"
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            placeholder="e.g. BBA/2022/001"
            className="input"
            style={{ fontSize: 13 }}
          />
        </div>
      </div>

      <div className="glass" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto', display: 'block' }}>
              <circle cx="12" cy="12" r="10" stroke="var(--text-dim)" strokeWidth="3"/>
              <path fill="var(--em)" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12 }}>Loading records...</p>
          </div>
        ) : records.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48,
              background: 'var(--em-glow)',
              border: '1px solid var(--em-border)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--em)" strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              No attendance records found.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {[
                    'Student ID', 'Name', 'Year', 'Subject',
                    'Status', 'Geo', 'Distance', 'Time',
                  ].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: 11,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      background: 'rgba(255,255,255,0.02)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => {
                  const flagged = isFlagged(r)
                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: flagged
                          ? 'rgba(248,113,113,0.04)'
                          : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                        transition: 'background 0.1s',
                      }}
                    >
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          color: 'var(--em)',
                          fontSize: 12,
                        }}>
                          {r.student_id}
                        </span>
                      </td>

                      <td style={{ padding: '10px 14px', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                        {r.student_name}
                        {flagged && (
                          <span style={{
                            marginLeft: 6,
                            background: 'rgba(248,113,113,0.12)',
                            border: '1px solid rgba(248,113,113,0.25)',
                            color: 'var(--danger)',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '1px 5px',
                          }}>
                            flagged
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        Year {r.year}
                      </td>

                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                          {r.sessions?.subject_code}
                        </span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 12 }}>
                          {r.sessions?.subject_name}
                        </span>
                      </td>

                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          background: r.status === 'Present'
                            ? 'var(--em-glow)' : 'rgba(251,191,36,0.1)',
                          border: `1px solid ${r.status === 'Present'
                            ? 'var(--em-border)' : 'rgba(251,191,36,0.25)'}`,
                          color: r.status === 'Present'
                            ? 'var(--em)' : 'var(--warning)',
                          borderRadius: 5,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 7px',
                        }}>
                          {r.status}
                        </span>
                      </td>

                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {r.geo_verified === null ? (
                          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>N/A</span>
                        ) : r.geo_verified ? (
                          <span style={{ color: 'var(--em)', fontSize: 12 }}>Yes</span>
                        ) : (
                          <span style={{ color: 'var(--danger)', fontSize: 12 }}>No</span>
                        )}
                      </td>

                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {r.dist_metres !== null ? `${r.dist_metres}m` : '-'}
                      </td>

                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {new Date(r.marked_at).toLocaleString('en-LK', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 16,
        }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-ghost"
            style={{ padding: '6px 14px', fontSize: 13 }}
          >
            Prev
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-ghost"
            style={{ padding: '6px 14px', fontSize: 13 }}
          >
            Next
          </button>
        </div>
      )}

      <div style={{
        marginTop: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        fontSize: 12,
        color: 'var(--text-dim)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            display: 'inline-block', width: 10, height: 10,
            background: 'rgba(248,113,113,0.15)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 2,
          }}/>
          Flagged - geo verification failed
        </span>
        <span>50 records per page</span>
      </div>
    </div>
  )
}
