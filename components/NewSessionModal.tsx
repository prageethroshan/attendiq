'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SUBJECT_GROUPS = [
  {
    label: 'Year 1 · Semester 1',
    subjects: [
      { code: 'ACF 11023', name: 'Financial Accounting and Reporting' },
      { code: 'ELT 11062', name: 'English Communication Skills' },
      { code: 'ITM 11053', name: 'Fundamentals of ICT' },
      { code: 'MGT 11013', name: 'Principles of Management' },
      { code: 'MGT 11033', name: 'Business Economics' },
      { code: 'MGT 11043', name: 'Business Mathematics' },
    ],
  },
  {
    label: 'Year 1 · Semester 2',
    subjects: [
      { code: 'ACF 12024', name: 'Corporate Financial Accounting' },
      { code: 'ACF 12061', name: 'Professional Skills Development I' },
      { code: 'ELT 12052', name: 'Business English' },
      { code: 'MGT 12013', name: 'Organizational Behavior' },
      { code: 'MGT 12033', name: 'Introduction to Data Analytics' },
      { code: 'MGT 12043', name: 'Business Statistics' },
    ],
  },
  {
    label: 'Year 2 · Semester 1',
    subjects: [
      { code: 'ACF 21013', name: 'Management Accounting' },
      { code: 'ACF 21023', name: 'Taxation' },
      { code: 'ITM 21052', name: 'Management Information Systems' },
      { code: 'MGT 21033', name: 'Corporate and Business Law' },
      { code: 'MKT 21043', name: 'Marketing Management' },
    ],
  },
  {
    label: 'Year 2 · Semester 2',
    subjects: [
      { code: 'ACF 22013', name: 'Auditing and Assurance' },
      { code: 'ACF 22023', name: 'Advanced Management Accounting' },
      { code: 'ACF 22033', name: 'Operational Research' },
      { code: 'ACF 22043', name: 'Financial Management' },
      { code: 'ACF 22061', name: 'Professional Skills Development II' },
      { code: 'HRM 22053', name: 'Human Resource Management' },
    ],
  },
  {
    label: 'Year 3 · Semester 1',
    subjects: [
      { code: 'ACF 31013', name: 'Research Methodology' },
      { code: 'ACF 31023', name: 'Investment and Portfolio Management' },
      { code: 'ACF 31033', name: 'Computer Based Accounting and ERP' },
      { code: 'ACF 31043', name: 'Advanced Accounting Theory' },
      { code: 'ACF 31053', name: 'Sustainability Accounting and Environmental Reporting' },
      { code: 'ACF 31063', name: 'Behavioural Finance' },
      { code: 'ACF 31073', name: 'Financial Derivatives and Risk Management' },
      { code: 'ACF 31081', name: 'Essentials of Mindfulness and Resilience' },
    ],
  },
  {
    label: 'Year 3 · Semester 2',
    subjects: [
      { code: 'ACF 32013', name: 'Data Analytics and Visualization' },
      { code: 'ACF 32023', name: 'Financial Modeling and Forecasting' },
      { code: 'ACF 32033', name: 'Advanced Corporate Reporting' },
      { code: 'ACF 32053', name: 'Financial Econometrics' },
      { code: 'ACF 32063', name: 'Artificial Intelligence in Accounting and Finance' },
      { code: 'ACF 32073', name: 'Contemporary Accounting in Blockchain and Digital Finance' },
      { code: 'ACF 32081', name: 'Professional Skills Development III' },
      { code: 'MGT 32043', name: 'Strategic Management' },
    ],
  },
  {
    label: 'Year 4 · Semester 1',
    subjects: [
      { code: 'ACF 41013', name: 'Advanced Audit, Governance and Risk' },
      { code: 'ACF 41023', name: 'Strategic Management Accounting' },
      { code: 'ACF 41033', name: 'Forensic Accounting and Fraud Analysis' },
      { code: 'ACF 41043', name: 'Bank and Credit Management' },
      { code: 'ACF 41053', name: 'Financial Securities and Capital Markets' },
      { code: 'ACF 41066', name: 'Research Project in Accounting and Finance' },
      { code: 'ACF 41073', name: 'Industrial Training I' },
    ],
  },
  {
    label: 'Year 4 · Semester 2',
    subjects: [
      { code: 'ACF 42013', name: 'Financial Statement Analysis' },
      { code: 'ACF 42023', name: 'Advanced Taxation' },
      { code: 'ACF 42033', name: 'Business Valuation' },
      { code: 'ACF 42047', name: 'Industrial Training II' },
    ],
  },
]

const SUBJECTS = SUBJECT_GROUPS.flatMap(group => group.subjects)

const DURATIONS = [
  { label: '30 min',  value: 30  },
  { label: '1 hour',  value: 60  },
  { label: '1.5 hrs', value: 90  },
  { label: '2 hours', value: 120 },
  { label: '2.5 hrs', value: 150 },
  { label: '3 hours', value: 180 },
]

type CreatedSession = {
  id?: string
  subject_code?: string
  subject_name?: string
  short_code?: string
}

interface Props {
  onClose: () => void
  onCreated: (session: CreatedSession) => void
}

export default function NewSessionModal({ onClose, onCreated }: Props) {
  const [subjectCode, setSubjectCode] = useState('')
  const [customCode, setCustomCode] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [duration, setDuration] = useState(60)
  const [geoEnabled, setGeoEnabled] = useState(false)
  const [geoRadius, setGeoRadius] = useState(100)
  const [locating, setLocating] = useState(false)
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoError, setGeoError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const selectedSubject = SUBJECTS.find(s => s.code === subjectCode)
  const isCustom = subjectCode === '__custom__'
  const finalSubjectCode = isCustom ? customCode.trim() : subjectCode
  const subjectName = isCustom ? customSubject : selectedSubject?.name ?? ''

  async function getLocation() {
    setLocating(true)
    setGeoError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setGeoError('Could not get location. Check browser permissions.')
        setLocating(false)
      },
      { timeout: 8000 }
    )
  }

  async function handleCreate() {
    if (!finalSubjectCode) {
      setError('Please select or enter a subject code.')
      return
    }
    if (!subjectName.trim()) {
      setError('Please enter a subject name.')
      return
    }
    if (geoEnabled && !geoCoords) {
      setError('Please capture your classroom location first.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_code: finalSubjectCode.toUpperCase(),
          subject_name: subjectName.trim(),
          duration_minutes: duration,
          geo_lat: geoEnabled ? geoCoords?.lat : null,
          geo_lng: geoEnabled ? geoCoords?.lng : null,
          geo_radius_m: geoEnabled ? geoRadius : null,
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to create session.')
        setLoading(false)
        return
      }

      onCreated(data)
      router.refresh()
    } catch {
      setError('Failed to create session.')
      setLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 480,
        zIndex: 101,
        padding: '0 16px',
      }}>
        <div className="glass" style={{ padding: 28 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h2 style={{ color: 'var(--text)', fontSize: 18, fontWeight: 700 }}>
                New Session
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
                Students will scan a QR code to mark attendance
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32,
                borderRadius: 8,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Subject selector */}
            <div>
              <label className="field-label">Subject</label>
              <select
                value={subjectCode}
                onChange={e => { setSubjectCode(e.target.value); setCustomCode(''); setCustomSubject('') }}
                className="input"
                style={{ cursor: 'pointer' }}
              >
                <option value="">— Select a subject —</option>
                {SUBJECT_GROUPS.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.subjects.map(subject => (
                      <option key={subject.code} value={subject.code}>
                        {subject.code} · {subject.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <optgroup label="Other">
                  <option value="__custom__">Enter manually…</option>
                </optgroup>
              </select>
            </div>

            {/* Custom subject fields */}
            {isCustom && (
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: '0 0 130px' }}>
                  <label className="field-label">Code</label>
                  <input
                    type="text"
                    placeholder="e.g. ACC 4401"
                    className="input"
                    value={customCode}
                    onChange={e => setCustomCode(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="field-label">Subject name</label>
                  <input
                    type="text"
                    placeholder="e.g. Advanced Taxation"
                    className="input"
                    value={customSubject}
                    onChange={e => setCustomSubject(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Duration */}
            <div>
              <label className="field-label">Session Duration</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DURATIONS.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDuration(d.value)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 8,
                      border: '1px solid',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      ...(duration === d.value ? {
                        background: 'var(--em-glow)',
                        borderColor: 'var(--em-border)',
                        color: 'var(--em)',
                      } : {
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-muted)',
                      })
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Geo toggle */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: geoEnabled ? 12 : 0 }}>
                <div>
                  <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
                    Location verification
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                    Students must be physically in the classroom
                  </div>
                </div>
                {/* Toggle */}
                <div
                  onClick={() => { setGeoEnabled(!geoEnabled); setGeoCoords(null); setGeoError('') }}
                  style={{
                    width: 40, height: 22,
                    borderRadius: 11,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    background: geoEnabled ? 'var(--em-deep)' : 'rgba(255,255,255,0.1)',
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 3, left: geoEnabled ? 21 : 3,
                    width: 16, height: 16,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }}/>
                </div>
              </div>

              {geoEnabled && (
                <div>
                  {/* Radius picker */}
                  <div style={{ marginBottom: 10 }}>
                    <label className="field-label" style={{ marginBottom: 8 }}>
                      Allowed radius: {geoRadius}m
                    </label>
                    <input
                      type="range"
                      min={30} max={300} step={10}
                      value={geoRadius}
                      onChange={e => setGeoRadius(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--em)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                      <span>30m</span><span>300m</span>
                    </div>
                  </div>

                  {/* Capture location button */}
                  {geoCoords ? (
                    <div style={{
                      background: 'var(--em-glow)',
                      border: '1px solid var(--em-border)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      color: 'var(--em)',
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Location captured ({geoCoords.lat.toFixed(4)}, {geoCoords.lng.toFixed(4)})
                    </div>
                  ) : (
                    <button
                      onClick={getLocation}
                      disabled={locating}
                      className="btn-ghost"
                      style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {locating ? (
                        <>
                          <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                            <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" opacity="0.75"/>
                          </svg>
                          Getting location…
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                          </svg>
                          Capture classroom location
                        </>
                      )}
                    </button>
                  )}

                  {geoError && (
                    <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{geoError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.2)',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 13,
                color: 'var(--danger)',
              }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button
                onClick={onClose}
                className="btn-ghost"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="btn-primary"
                style={{ flex: 2 }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                      <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" opacity="0.75"/>
                    </svg>
                    Creating…
                  </span>
                ) : 'Start Session →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
