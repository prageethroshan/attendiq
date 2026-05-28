'use client'

import { useEffect, useState } from 'react'

interface GeoConfig {
  lat: number
  lng: number
  radiusM: number
}

interface Props {
  sessionId: string
  token: string
  subjectCode: string
  subjectName: string
  teacherName: string
  enrolledIds: string[]
  geoConfig: GeoConfig | null
}

type FormState = 'idle' | 'submitting' | 'success' | 'error'
type GeoStatus = 'pending' | 'locating' | 'ok' | 'denied' | 'skipped'

function hashFingerprint(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}

export default function StudentScanForm({
  sessionId, token,
  subjectCode, subjectName, teacherName,
  enrolledIds, geoConfig,
}: Props) {
  const [studentId, setStudentId] = useState('')
  const [studentName, setStudentName] = useState('')
  const [year, setYear] = useState('')
  const [department, setDepartment] = useState('')

  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState<any>(null)

  const [deviceFp, setDeviceFp] = useState('')
  const [deviceBlocked, setDeviceBlocked] = useState(false)
  const [deviceCheckDone, setDeviceCheckDone] = useState(false)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>(geoConfig ? 'pending' : 'skipped')
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    const raw = [
      navigator.userAgent,
      navigator.language,
      `${screen.width}x${screen.height}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      String(navigator.hardwareConcurrency ?? ''),
    ].join('|')
    setDeviceFp(hashFingerprint(raw))
  }, [])

  useEffect(() => {
    if (!deviceFp || !sessionId) return

    fetch('/api/attendance/device-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, deviceFp }),
    })
      .then(response => response.json())
      .then(data => {
        setDeviceBlocked(data.blocked ?? false)
        setDeviceCheckDone(true)
      })
      .catch(() => setDeviceCheckDone(true))
  }, [deviceFp, sessionId])

  useEffect(() => {
    if (!geoConfig) return
    setGeoStatus('locating')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoStatus('ok')
      },
      () => setGeoStatus('denied'),
      { timeout: 10000, enableHighAccuracy: true }
    )
  }, [geoConfig])

  async function handleSubmit() {
    setErrorMsg('')
    setFormState('idle')

    if (!studentId.trim()) {
      setErrorMsg('Please enter your Student ID.')
      return
    }
    if (!studentName.trim()) {
      setErrorMsg('Please enter your full name.')
      return
    }
    if (!year) {
      setErrorMsg('Please select your year of study.')
      return
    }
    if (!department) {
      setErrorMsg('Please select your department.')
      return
    }

    setFormState('submitting')

    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        sessionId,
        studentId: studentId.trim().toUpperCase(),
        studentName: studentName.trim(),
        year,
        department,
        deviceFp,
        geo: geoCoords,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setFormState('error')
      if (data.code === 'DEVICE_BLOCKED') {
        setDeviceBlocked(true)
      } else {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
      }
      return
    }

    setResult(data)
    setFormState('success')
  }

  if (formState === 'success') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}>
        <div className="glass" style={{ padding: 32, maxWidth: 380, width: '100%' }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: '50%',
            background: 'rgba(52,211,153,0.1)',
            border: '2px solid var(--em)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--em)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          <h1 style={{ color: 'var(--em)', fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 6 }}>
            Attendance Marked!
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
            Your attendance has been recorded. You may close this page.
          </p>

          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            {[
              { label: 'Student ID', value: result?.studentId },
              { label: 'Name', value: result?.studentName },
              { label: 'Subject', value: `${subjectCode} - ${subjectName}` },
              { label: 'Lecturer', value: teacherName },
              { label: 'Department', value: result?.department },
              { label: 'Year', value: `Year ${result?.year}` },
              { label: 'Status', value: result?.status ?? 'Present', isStatus: true },
              { label: 'Time', value: new Date().toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }) },
            ].map(({ label, value, isStatus }, i) => (
              <div key={label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                borderBottom: i < 7 ? '1px solid var(--border)' : 'none',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
              }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</span>
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: isStatus ? 'var(--em)' : 'var(--text)',
                }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, marginTop: 16 }}>
            View your full attendance record at{' '}
            <a href="/lookup" style={{ color: 'var(--em)', textDecoration: 'none' }}>
              /lookup
            </a>
          </p>
        </div>
      </div>
    )
  }

  if (deviceCheckDone && deviceBlocked) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}>
        <div className="glass" style={{ padding: 32, maxWidth: 380, width: '100%', textAlign: 'center' }}>
          <div style={{
            width: 60, height: 60,
            borderRadius: '50%',
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <h1 style={{ color: 'var(--danger)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Device Already Used
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            Attendance has already been marked from this device for this session.
            Each device can only submit once per session.
          </p>

          <div style={{
            background: 'rgba(248,113,113,0.06)',
            border: '1px solid rgba(248,113,113,0.15)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 13,
            color: 'var(--text-muted)',
          }}>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{subjectCode}</span>
            {' - '}{subjectName}
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-dim)' }}>
              {teacherName}
            </div>
          </div>

          <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 16 }}>
            If you believe this is an error, speak to your lecturer directly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div className="glass" style={{ padding: 28, maxWidth: 400, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div className="logo-gem" style={{ width: 32, height: 32, borderRadius: 9, fontSize: 14 }}>
            A
          </div>
          <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: 16 }}>
            Attend<span style={{ color: 'var(--em)' }}>IQ</span>
          </span>
        </div>

        <div style={{
          background: 'var(--em-glow)',
          border: '1px solid var(--em-border)',
          borderRadius: 10,
          padding: '10px 14px',
          marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span className="badge-em" style={{ flexShrink: 0 }}>{subjectCode}</span>
          <div>
            <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>{subjectName}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{teacherName}</div>
          </div>
        </div>

        {geoConfig && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '7px 12px',
            marginBottom: 16,
            fontSize: 12,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background:
                geoStatus === 'ok' ? 'var(--em)' :
                geoStatus === 'denied' ? 'var(--danger)' :
                geoStatus === 'locating' ? 'var(--warning)' : 'var(--text-dim)',
              animation: geoStatus === 'locating' ? 'pulse-dot 1s infinite' : 'none',
            }}/>
            <span style={{ color: 'var(--text-muted)' }}>
              {geoStatus === 'ok' && 'Location verified'}
              {geoStatus === 'denied' && 'Location access denied - submission may be flagged'}
              {geoStatus === 'locating' && 'Getting your location...'}
              {geoStatus === 'pending' && 'Waiting for location...'}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
          <div>
            <label className="field-label">Student ID</label>
            <input
              type="text"
              value={studentId}
              onChange={e => setStudentId(e.target.value.toUpperCase())}
              placeholder="e.g. BBA/2022/001"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="input"
              style={{ fontSize: 16 }}
            />
          </div>

          <div>
            <label className="field-label">Full Name</label>
            <input
              type="text"
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              placeholder="As per university records"
              autoComplete="name"
              className="input"
              style={{ fontSize: 16 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="field-label">Year</label>
              <select
                value={year}
                onChange={e => setYear(e.target.value)}
                className="input"
                style={{ fontSize: 16, cursor: 'pointer' }}
              >
                <option value="">Select</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
            </div>
            <div>
              <label className="field-label">Department</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="input"
                style={{ fontSize: 16, cursor: 'pointer' }}
              >
                <option value="">Select</option>
                <option value="Accountancy & Finance">Accountancy &amp; Finance</option>
                <option value="Business Management">Business Management</option>
                <option value="Information Systems">Information Systems</option>
                <option value="Marketing Management">Marketing Management</option>
                <option value="Human Resource Management">Human Resource Management</option>
                <option value="Tourism & Hospitality">Tourism &amp; Hospitality</option>
              </select>
            </div>
          </div>
        </div>

        {(formState === 'error' || errorMsg) && (
          <div style={{
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 14,
            display: 'flex', alignItems: 'flex-start', gap: 8,
            fontSize: 13,
            color: 'var(--danger)',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {errorMsg}
          </div>
        )}

        <button
          onClick={() => {
            if (formState === 'error') setFormState('idle')
            handleSubmit()
          }}
          disabled={formState === 'submitting'}
          className="btn-primary"
        >
          {formState === 'submitting' ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" opacity="0.75"/>
              </svg>
              Submitting...
            </span>
          ) : formState === 'error' ? 'Try Again ->' : 'Mark My Attendance ->'}
        </button>

        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, marginTop: 12 }}>
          Works on any phone - No app needed
        </p>
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, marginTop: 6 }}>
          Check your attendance at{' '}
          <a
            href="/lookup"
            style={{ color: 'var(--em)', textDecoration: 'none' }}
          >
            /lookup
          </a>
        </p>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
