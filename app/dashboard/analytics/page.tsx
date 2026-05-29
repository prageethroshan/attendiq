'use client'

import { useEffect, useState } from 'react'
import { exportAnalyticsXLSX } from '@/lib/export'

interface Summary {
  totalSessions: number
  totalRecords: number
  avgRate: number
  flaggedCount: number
}

interface SubjectStat {
  subject_code: string
  subject_name: string
  sessionCount: number
  presentCount: number
  totalCount: number
  attendanceRate: number
}

interface RecentSession {
  id: string
  subject_code: string
  subject_name: string
  created_at: string
  is_active: boolean
  scanned: number
  enrolled: number
  rate: number | null
}

interface DailyActivity {
  date: string
  count: number
}

interface DeviceFlag {
  device_fp: string
  studentIds: string[]
  count: number
}

interface GeoFailRate {
  subject_code: string
  subject_name: string
  total: number
  failed: number
  failRate: number
}

interface AnalyticsData {
  summary: Summary
  bySubject: SubjectStat[]
  recentSessions: RecentSession[]
  dailyActivity: DailyActivity[]
  deviceFlags: DeviceFlag[]
  geoFailRate: GeoFailRate[]
}

function BarChart({ data }: { data: DailyActivity[] }) {
  if (data.length === 0) return null

  const max = Math.max(...data.map(day => day.count), 1)
  const width = 600
  const height = 80
  const barW = Math.max(4, Math.floor(width / data.length) - 2)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height: 80, overflow: 'visible' }}
    >
      {data.map((day, index) => {
        const barH = Math.max(2, (day.count / max) * (height - 16))
        const x = (index / data.length) * width
        const y = height - barH
        const isToday = day.date === new Date().toISOString().slice(0, 10)

        return (
          <g key={day.date}>
            <rect
              x={x} y={y}
              width={barW} height={barH}
              rx={2}
              fill={isToday ? '#34d399' : 'rgba(52,211,153,0.35)'}
            />
            <title>{day.date}: {day.count} scans</title>
          </g>
        )
      })}
    </svg>
  )
}

function rateColor(rate: number) {
  if (rate >= 75) return 'var(--em)'
  if (rate >= 50) return 'var(--warning)'
  return 'var(--danger)'
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/analytics')
      .then(response => response.json())
      .then(result => {
        if (result.error) setError(result.error)
        else setData(result)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load analytics.')
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ textAlign: 'center' }}>
          <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px', display: 'block' }}>
            <circle cx="12" cy="12" r="10" stroke="var(--text-dim)" strokeWidth="3"/>
            <path fill="var(--em)" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass" style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>
      </div>
    )
  }

  if (!data || data.summary.totalSessions === 0) {
    return (
      <div>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            Analytics
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Attendance trends and session insights
          </p>
        </div>
        <div className="glass" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52,
            background: 'var(--em-glow)',
            border: '1px solid var(--em-border)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--em)" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <h2 style={{ color: 'var(--text)', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            No data yet
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Analytics will appear once you have run sessions and students have marked attendance.
          </p>
        </div>
      </div>
    )
  }

  const { summary, bySubject, recentSessions, dailyActivity, deviceFlags, geoFailRate } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            Analytics
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Attendance trends and session insights
          </p>
        </div>
        {data && data.summary.totalSessions > 0 && (
          <button
            onClick={() => exportAnalyticsXLSX(data)}
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <polyline points="8 13 12 17 16 13"/>
              <line x1="12" y1="17" x2="12" y2="7"/>
            </svg>
            Export Excel
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Total Sessions', value: summary.totalSessions, color: 'var(--text)' },
          { label: 'Total Scans', value: summary.totalRecords, color: 'var(--em)' },
          { label: 'Avg Rate', value: `${summary.avgRate}%`, color: rateColor(summary.avgRate) },
          { label: 'Flagged Records', value: summary.flaggedCount, color: summary.flaggedCount > 0 ? 'var(--danger)' : 'var(--text-muted)' },
        ].map(card => (
          <div key={card.label} className="glass" style={{ padding: '16px 18px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
              {card.label.toUpperCase()}
            </div>
            <div style={{ color: card.color, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {dailyActivity.length > 0 && (
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700 }}>
              Daily Activity
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
              Scans per day - last 30 days
            </p>
          </div>
          <BarChart data={dailyActivity} />
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: 6, fontSize: 11, color: 'var(--text-dim)',
          }}>
            <span>{dailyActivity[0]?.date}</span>
            <span>Today</span>
          </div>
        </div>
      )}

      <div className="glass" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700 }}>
            Attendance by Subject
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
            Across all sessions you have run
          </p>
        </div>
        {bySubject.map((subject, index) => (
          <div key={subject.subject_code} style={{
            padding: '13px 20px',
            borderBottom: index < bySubject.length - 1 ? '1px solid var(--border)' : 'none',
            display: 'flex', alignItems: 'center', gap: 14,
            background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span className="badge-em" style={{ fontSize: 10, flexShrink: 0 }}>
                  {subject.subject_code}
                </span>
                <span style={{
                  color: 'var(--text)', fontSize: 13, fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {subject.subject_name}
                </span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                {subject.sessionCount} session{subject.sessionCount !== 1 ? 's' : ''} - {subject.totalCount} scans
              </div>
            </div>

            <div style={{ width: 140, flexShrink: 0 }}>
              <div style={{
                height: 6, background: 'rgba(255,255,255,0.07)',
                borderRadius: 3, overflow: 'hidden', marginBottom: 4,
              }}>
                <div style={{
                  height: '100%',
                  width: `${subject.attendanceRate}%`,
                  background: rateColor(subject.attendanceRate),
                  borderRadius: 3,
                  transition: 'width 0.5s ease',
                }}/>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                {subject.presentCount} / {subject.totalCount} present
              </div>
            </div>

            <div style={{
              width: 52, flexShrink: 0,
              fontSize: 18, fontWeight: 800,
              color: rateColor(subject.attendanceRate),
              textAlign: 'right',
            }}>
              {subject.attendanceRate}%
            </div>
          </div>
        ))}
      </div>

      <div className="glass" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700 }}>
            Recent Sessions
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
            Last 10 sessions
          </p>
        </div>
        {recentSessions.map((session, index) => (
          <div key={session.id} style={{
            padding: '12px 20px',
            borderBottom: index < recentSessions.length - 1 ? '1px solid var(--border)' : 'none',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 12,
            background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                {session.is_active && (
                  <span className="badge-em" style={{ fontSize: 10, padding: '1px 6px' }}>
                    Live
                  </span>
                )}
                <span style={{
                  color: 'var(--text)', fontSize: 13, fontWeight: 600,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {session.subject_code} - {session.subject_name}
                </span>
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                {new Date(session.created_at).toLocaleDateString('en-LK', {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--em)', fontSize: 16, fontWeight: 700 }}>
                  {session.scanned}
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                  scanned
                  {session.enrolled > 0 && ` / ${session.enrolled}`}
                </div>
              </div>
              {session.rate !== null && (
                <div style={{
                  width: 44, height: 44,
                  borderRadius: '50%',
                  background: `conic-gradient(${rateColor(session.rate)} ${session.rate * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  color: rateColor(session.rate),
                }}>
                  {session.rate}%
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {deviceFlags.length > 0 && (
        <div className="glass" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div>
              <h2 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700 }}>
                Suspicious Submissions
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                Same device used for multiple student IDs - possible proxy attendance
              </p>
            </div>
            <span style={{
              marginLeft: 'auto', flexShrink: 0,
              background: 'rgba(248,113,113,0.12)',
              border: '1px solid rgba(248,113,113,0.25)',
              color: 'var(--danger)',
              borderRadius: 6, fontSize: 12, fontWeight: 700,
              padding: '3px 10px',
            }}>
              {deviceFlags.length} device{deviceFlags.length !== 1 ? 's' : ''}
            </span>
          </div>
          {deviceFlags.map((flag, index) => (
            <div key={flag.device_fp} style={{
              padding: '12px 20px',
              borderBottom: index < deviceFlags.length - 1 ? '1px solid var(--border)' : 'none',
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{
                width: 32, height: 32, flexShrink: 0,
                borderRadius: 8,
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  {flag.count} student IDs from one device
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {flag.studentIds.map(id => (
                    <span key={id} style={{
                      background: 'rgba(248,113,113,0.08)',
                      border: '1px solid rgba(248,113,113,0.2)',
                      color: 'var(--danger)',
                      borderRadius: 5, fontSize: 11,
                      fontFamily: 'monospace',
                      padding: '2px 7px',
                    }}>
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {geoFailRate.length > 0 && (
        <div className="glass" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700 }}>
              Geo Verification Failures
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
              Students outside the classroom radius per subject
            </p>
          </div>
          {geoFailRate.map((subject, index) => (
            <div key={subject.subject_code} style={{
              padding: '12px 20px',
              borderBottom: index < geoFailRate.length - 1 ? '1px solid var(--border)' : 'none',
              display: 'flex', alignItems: 'center', gap: 14,
              background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 500 }}>
                  {subject.subject_code}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 1 }}>
                  {subject.failed} failed out of {subject.total} geo-verified submissions
                </div>
              </div>
              <div style={{
                fontSize: 17, fontWeight: 700,
                color: subject.failRate > 20 ? 'var(--danger)' : subject.failRate > 5 ? 'var(--warning)' : 'var(--em)',
              }}>
                {subject.failRate}% fail
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
