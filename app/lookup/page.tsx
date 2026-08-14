'use client'

import { useState } from 'react'

interface AttendanceRecord {
  status: string
  marked_at: string
  sessions: {
    subject_code: string
    subject_name: string
    created_at: string
  }
}

interface SubjectGroup {
  subject_code: string
  subject_name: string
  records: AttendanceRecord[]
  attendanceRate: number
}

export default function LookupPage() {
  const [studentId, setStudentId] = useState('')
  const [searched, setSearched] = useState('')
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  async function handleSearch() {
    const id = studentId.trim().toUpperCase()
    if (!id) {
      setError('Please enter your Student ID.')
      return
    }

    setLoading(true)
    setError('')
    setHasSearched(false)

    const res = await fetch(`/api/lookup?student_id=${encodeURIComponent(id)}`)
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    setRecords(data.records ?? [])
    setSearched(id)
    setHasSearched(true)
    setLoading(false)
  }

  function groupBySubject(records: AttendanceRecord[]): SubjectGroup[] {
    const map = new Map<string, AttendanceRecord[]>()

    for (const r of records) {
      const key = r.sessions?.subject_code ?? 'Unknown'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }

    return Array.from(map.entries()).map(([code, recs]) => ({
      subject_code: code,
      subject_name: recs[0].sessions?.subject_name ?? '',
      records: recs.sort((a, b) =>
        new Date(b.marked_at).getTime() - new Date(a.marked_at).getTime()
      ),
      attendanceRate: Math.round(
        (recs.filter(r => r.status === 'Present').length / recs.length) * 100
      ),
    }))
  }

  const groups = groupBySubject(records)
  const totalPresent = records.filter(r => r.status === 'Present').length
  const overallRate = records.length > 0
    ? Math.round((totalPresent / records.length) * 100)
    : 0

  return (
    <div style={{
      minHeight: '100vh',
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="logo-gem" style={{
            width: 48, height: 48,
            borderRadius: 14, fontSize: 20,
            margin: '0 auto 14px',
          }}>
            A
          </div>
          <h1 style={{
            color: 'var(--text)', fontSize: 22,
            fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6,
          }}>
            Attend<span style={{ color: 'var(--em)' }}>IQ</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Check your attendance record
          </p>
        </div>

        <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
          <label className="field-label">Your Student ID</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <input
              type="text"
              value={studentId}
              onChange={e => {
                setStudentId(e.target.value.toUpperCase())
                setError('')
              }}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. MGT/2025/001"
              autoCapitalize="characters"
              autoComplete="off"
              className="input"
              style={{ flex: 1, fontSize: 16 }}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="btn-primary"
              style={{ width: 'auto', padding: '0 20px', flexShrink: 0 }}
            >
              {loading ? (
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" opacity="0.75"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              )}
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: 10,
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 8, padding: '8px 12px',
              fontSize: 13, color: 'var(--danger)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}
        </div>

        {hasSearched && records.length === 0 && (
          <div className="glass" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48,
              background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <h2 style={{ color: 'var(--text)', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              No records found
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 300, margin: '0 auto' }}>
              No attendance records found for <strong style={{ color: 'var(--text)' }}>{searched}</strong>.
              Check your Student ID and try again.
            </p>
          </div>
        )}

        {hasSearched && records.length > 0 && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              marginBottom: 20,
            }}>
              {[
                {
                  label: 'Total Sessions',
                  value: records.length,
                  color: 'var(--text)',
                },
                {
                  label: 'Present',
                  value: totalPresent,
                  color: 'var(--em)',
                },
                {
                  label: 'Overall Rate',
                  value: `${overallRate}%`,
                  color: overallRate >= 75
                    ? 'var(--em)'
                    : overallRate >= 50
                    ? 'var(--warning)'
                    : 'var(--danger)',
                },
              ].map(stat => (
                <div key={stat.label} className="glass" style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 6 }}>
                    {stat.label.toUpperCase()}
                  </div>
                  <div style={{ color: stat.color, fontSize: 24, fontWeight: 800 }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {overallRate < 75 && (
              <div style={{
                background: overallRate < 50
                  ? 'rgba(248,113,113,0.08)'
                  : 'rgba(251,191,36,0.08)',
                border: `1px solid ${overallRate < 50
                  ? 'rgba(248,113,113,0.2)'
                  : 'rgba(251,191,36,0.2)'}`,
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                color: overallRate < 50 ? 'var(--danger)' : 'var(--warning)',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                {overallRate < 50
                  ? 'Your attendance is critically low. Please contact your lecturer immediately.'
                  : 'Your attendance is below 75%. You may be barred from sitting examinations.'}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {groups.map(group => (
                <div key={group.subject_code} className="glass" style={{ overflow: 'hidden' }}>
                  <div style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span className="badge-em">{group.subject_code}</span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                        {group.subject_name}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                          {group.records.filter(r => r.status === 'Present').length} / {group.records.length} sessions
                        </div>
                        <div style={{
                          width: 100, height: 6,
                          background: 'rgba(255,255,255,0.08)',
                          borderRadius: 3, overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${group.attendanceRate}%`,
                            borderRadius: 3,
                            background: group.attendanceRate >= 75
                              ? 'var(--em)'
                              : group.attendanceRate >= 50
                              ? 'var(--warning)'
                              : 'var(--danger)',
                            transition: 'width 0.4s ease',
                          }}/>
                        </div>
                      </div>
                      <div style={{
                        fontSize: 18, fontWeight: 800,
                        color: group.attendanceRate >= 75
                          ? 'var(--em)'
                          : group.attendanceRate >= 50
                          ? 'var(--warning)'
                          : 'var(--danger)',
                        minWidth: 48,
                        textAlign: 'right',
                      }}>
                        {group.attendanceRate}%
                      </div>
                    </div>
                  </div>

                  <div>
                    {group.records.map((r, i) => (
                      <div key={`${r.marked_at}-${i}`} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 18px',
                        borderBottom: i < group.records.length - 1
                          ? '1px solid var(--border)' : 'none',
                        background: i % 2 === 0
                          ? 'transparent'
                          : 'rgba(255,255,255,0.01)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                            background: r.status === 'Present'
                              ? 'var(--em)' : 'var(--danger)',
                          }}/>
                          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                            {new Date(r.marked_at).toLocaleDateString('en-LK', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                            {new Date(r.marked_at).toLocaleTimeString('en-LK', {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 7px',
                            borderRadius: 5,
                            background: r.status === 'Present'
                              ? 'var(--em-glow)' : 'rgba(248,113,113,0.1)',
                            border: `1px solid ${r.status === 'Present'
                              ? 'var(--em-border)' : 'rgba(248,113,113,0.2)'}`,
                            color: r.status === 'Present'
                              ? 'var(--em)' : 'var(--danger)',
                          }}>
                            {r.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 20, textAlign: 'center',
              color: 'var(--text-dim)', fontSize: 12,
              lineHeight: 1.6,
            }}>
              This is a read-only record. If you believe there is an error,
              please contact your lecturer directly.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
