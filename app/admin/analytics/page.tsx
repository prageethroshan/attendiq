'use client'

import { useEffect, useState } from 'react'
import { exportAnalyticsXLSX } from '@/lib/export'

interface AdminAnalytics {
  summary: { totalTeachers: number; totalSessions: number; activeSessions: number; totalRecords: number; flaggedRecords: number }
  byTeacher: Array<{
    profile: { id: string; full_name: string; email: string; department: string | null }
    sessionCount: number; activeCount: number; scanCount: number
  }>
  bySubject: Array<{ code: string; name: string; scans: number; count: number }>
  dailyActivity?: Array<{ date: string; count: number }>
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(response => response.json())
      .then(result => {
        setData(result)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 14px', display: 'block' }}>
          <circle cx="12" cy="12" r="10" stroke="var(--text-dim)" strokeWidth="3"/>
          <path fill="var(--em)" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading analytics...</p>
      </div>
    )
  }

  if (!data) return <p style={{ color: 'var(--danger)' }}>Analytics could not be loaded.</p>
  const { summary, byTeacher, bySubject } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            Department Analytics
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Attendance overview across all teachers and subjects
          </p>
        </div>
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { label: 'Teachers', value: summary.totalTeachers, color: 'var(--text)' },
          { label: 'Total Sessions', value: summary.totalSessions, color: 'var(--text)' },
          { label: 'Active Now', value: summary.activeSessions, color: 'var(--em)' },
          { label: 'Total Scans', value: summary.totalRecords, color: 'var(--em)' },
          { label: 'Flagged Records', value: summary.flaggedRecords, color: summary.flaggedRecords > 0 ? 'var(--danger)' : 'var(--text-muted)' },
        ].map(card => (
          <div key={card.label} className="glass" style={{ padding: '14px 18px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>
              {card.label.toUpperCase()}
            </div>
            <div style={{ color: card.color, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="glass" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700 }}>By Teacher</h2>
        </div>
        {byTeacher.map((teacher, index) => (
          <div key={teacher.profile.id} style={{
            padding: '12px 20px',
            borderBottom: index < byTeacher.length - 1 ? '1px solid var(--border)' : 'none',
            display: 'flex', alignItems: 'center', gap: 14,
            background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--em-glow)',
              border: '1px solid var(--em-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: 'var(--em)', flexShrink: 0,
            }}>
              {teacher.profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>{teacher.profile.full_name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 1 }}>{teacher.profile.department ?? teacher.profile.email}</div>
            </div>
            <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
              {[
                { label: 'Sessions', value: teacher.sessionCount },
                { label: 'Active', value: teacher.activeCount, color: teacher.activeCount > 0 ? 'var(--em)' : undefined },
                { label: 'Total scans', value: teacher.scanCount },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{ color: stat.color ?? 'var(--text)', fontSize: 18, fontWeight: 700 }}>{stat.value}</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="glass" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700 }}>Top Subjects by Attendance</h2>
        </div>
        {bySubject.map((subject, index) => (
          <div key={subject.code} style={{
            padding: '12px 20px',
            borderBottom: index < bySubject.length - 1 ? '1px solid var(--border)' : 'none',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span className="badge-em" style={{ fontSize: 11, flexShrink: 0 }}>{subject.code}</span>
            <div style={{ flex: 1, color: 'var(--text-muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {subject.name}
            </div>
            <div style={{ color: 'var(--em)', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
              {subject.scans} scans
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 12, flexShrink: 0 }}>
              {subject.count} sessions
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
