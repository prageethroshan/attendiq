'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { exportAttendanceXLSX, exportSessionReportXLSX, exportSubjectRegisterXLSX } from '@/lib/export'

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
  manual_entry: boolean
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
  const pathname = usePathname()
  const isAdminLog = pathname.startsWith('/admin')
  const sessionsEndpoint = isAdminLog ? '/api/admin/sessions' : '/api/sessions'
  const attendanceEndpoint = isAdminLog ? '/api/admin/attendance' : '/api/attendance'

  const [records, setRecords] = useState<AttendanceRow[]>([])
  const [sessions, setSessions] = useState<SessionOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState('')
  const [searchId, setSearchId] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [showExportMenu, setShowExportMenu] = useState(false)

  useEffect(() => {
    fetch(sessionsEndpoint)
      .then(r => r.json())
      .then(data => setSessions(Array.isArray(data) ? data : []))
  }, [sessionsEndpoint])

  const loadRecords = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedSession) params.set('session_id', selectedSession)
    if (searchId.trim()) params.set('student_id', searchId.trim().toUpperCase())
    params.set('page', String(page))

    const res = await fetch(`${attendanceEndpoint}?${params}`)
    const data = await res.json()

    if (res.ok) {
      setRecords(data.records ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    }
    setLoading(false)
  }, [attendanceEndpoint, selectedSession, searchId, page])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useEffect(() => {
    setPage(1)
  }, [selectedSession, searchId])

  function isFlagged(r: AttendanceRow) {
    return r.geo_verified === false && !r.manual_entry
  }

  async function exportSelectedSessionReport() {
    if (!selectedSession) return
    const endpoint = isAdminLog ? '/api/admin/reports/session' : '/api/reports/session'
    const response = await fetch(`${endpoint}?session_id=${encodeURIComponent(selectedSession)}`)
    if (!response.ok) {
      alert('Failed to export session report.')
      return
    }
    const data = await response.json()
    await exportSessionReportXLSX(data)
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
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowExportMenu(prev => !prev)}
            disabled={records.length === 0}
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <polyline points="8 13 12 17 16 13"/>
              <line x1="12" y1="17" x2="12" y2="7"/>
            </svg>
            Export
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showExportMenu && (
            <>
              <div
                onClick={() => setShowExportMenu(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 10 }}
              />
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 6,
                zIndex: 20,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                overflow: 'hidden',
                minWidth: 220,
                boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
              }}>
                <button
                  onClick={() => {
                    exportAttendanceXLSX(records)
                    setShowExportMenu(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '11px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={event => { event.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={event => { event.currentTarget.style.background = 'none' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--em)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <div>
                    <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
                      Full Attendance Log
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                      All records - Student summary - Flagged
                    </div>
                  </div>
                </button>

                <button
                  onClick={async () => {
                    setShowExportMenu(false)
                    await exportSubjectRegisterXLSX(isAdminLog ? '/api/admin/attendance' : '/api/attendance')
                  }}
                  style={{
                    width: '100%',
                    padding: '11px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={event => { event.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={event => { event.currentTarget.style.background = 'none' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--em)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="3" y1="15" x2="21" y2="15"/>
                    <line x1="9" y1="3" x2="9" y2="21"/>
                  </svg>
                  <div>
                    <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
                      Subject Register
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                      One sheet per subject - Students x sessions grid
                    </div>
                  </div>
                </button>

                {selectedSession && (
                  <button
                    onClick={async () => {
                      setShowExportMenu(false)
                      await exportSelectedSessionReport()
                    }}
                    style={{
                      width: '100%',
                      padding: '11px 16px',
                      background: 'none',
                      border: 'none',
                      borderTop: '1px solid var(--border)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={event => { event.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={event => { event.currentTarget.style.background = 'none' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--em)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                      <path d="M9 11l3 3L22 4"/>
                      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                    </svg>
                    <div>
                      <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
                        Session Absent Report
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                        Complete register with absent students, scan time, and distance
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
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
            placeholder="e.g. MGT/2025/001"
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
                        {r.manual_entry && (
                          <span style={{
                            marginLeft: 6,
                            background: 'rgba(96,165,250,0.12)',
                            border: '1px solid rgba(96,165,250,0.25)',
                            color: 'var(--info)',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '1px 5px',
                          }}>
                            Manual
                          </span>
                        )}
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
