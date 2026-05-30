'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@/lib/supabase/types'

interface Subject {
  id: string
  code: string
  name: string
  year: number | null
  semester: number | null
  is_custom: boolean
}

interface SubjectGroup {
  label: string
  subjects: Subject[]
}

const DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hrs', value: 90 },
  { label: '2 hours', value: 120 },
  { label: '2.5 hrs', value: 150 },
  { label: '3 hours', value: 180 },
]

interface Props {
  onClose: () => void
  onCreated: (session: Session) => void
}

export default function NewSessionModal({ onClose, onCreated }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [subjectCode, setSubjectCode] = useState('')
  const [duration, setDuration] = useState(60)
  const [geoEnabled, setGeoEnabled] = useState(false)
  const [geoRadius, setGeoRadius] = useState(100)
  const [locating, setLocating] = useState(false)
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoError, setGeoError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [conflictSessionId, setConflictSessionId] = useState<string | null>(null)
  const [endingConflict, setEndingConflict] = useState(false)

  const [showAddSubject, setShowAddSubject] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newYear, setNewYear] = useState('')
  const [newSemester, setNewSemester] = useState('')
  const [addingSubject, setAddingSubject] = useState(false)
  const [addSubjectError, setAddSubjectError] = useState('')

  const router = useRouter()

  useEffect(() => {
    fetch('/api/subjects')
      .then(r => r.json())
      .then(data => {
        setSubjects(Array.isArray(data) ? data : [])
        setSubjectsLoading(false)
      })
      .catch(() => setSubjectsLoading(false))
  }, [])

  function groupSubjects(subjects: Subject[]): SubjectGroup[] {
    const standard = subjects.filter(s => !s.is_custom && s.year && s.semester)
    const custom = subjects.filter(s => s.is_custom)
    const other = subjects.filter(s => !s.is_custom && (!s.year || !s.semester))
    const grouped = new Map<string, Subject[]>()

    for (const subject of standard) {
      const key = `Year ${subject.year} - Semester ${subject.semester}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(subject)
    }

    const result: SubjectGroup[] = []
    const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
      const [ay, as_] = a.match(/\d+/g)!.map(Number)
      const [by, bs] = b.match(/\d+/g)!.map(Number)
      return ay !== by ? ay - by : as_ - bs
    })

    for (const key of sortedKeys) {
      result.push({ label: key, subjects: grouped.get(key)! })
    }
    if (other.length > 0) result.push({ label: 'Other', subjects: other })
    if (custom.length > 0) result.push({ label: 'Custom Subjects', subjects: custom })

    return result
  }

  const selectedSubject = subjects.find(subject => subject.code === subjectCode)
  const groups = groupSubjects(subjects)

  async function handleAddSubject() {
    if (!newCode.trim() || !newName.trim()) {
      setAddSubjectError('Code and name are required.')
      return
    }

    setAddingSubject(true)
    setAddSubjectError('')

    const res = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: newCode,
        name: newName,
        year: newYear || null,
        semester: newSemester || null,
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setAddSubjectError(data.error ?? 'Failed to add subject.')
      setAddingSubject(false)
      return
    }

    setSubjects(prev => [...prev, data])
    setSubjectCode(data.code)
    setNewCode('')
    setNewName('')
    setNewYear('')
    setNewSemester('')
    setShowAddSubject(false)
    setAddingSubject(false)
  }

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
    if (!subjectCode || !selectedSubject) {
      setError('Please select a subject.')
      return
    }
    if (geoEnabled && !geoCoords) {
      setError('Please capture your classroom location first.')
      return
    }

    setLoading(true)
    setError('')
    setConflictSessionId(null)

    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject_code: selectedSubject.code,
        subject_name: selectedSubject.name,
        duration_minutes: duration,
        geo_lat: geoEnabled ? geoCoords?.lat : null,
        geo_lng: geoEnabled ? geoCoords?.lng : null,
        geo_radius_m: geoEnabled ? geoRadius : null,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      if (res.status === 409 && data.existing_session_id) {
        setConflictSessionId(data.existing_session_id)
      }
      setError(data.error ?? 'Failed to create session.')
      setLoading(false)
      return
    }

    onCreated(data)
    router.refresh()
  }

  async function handleEndConflict() {
    if (!conflictSessionId) return
    setEndingConflict(true)

    const res = await fetch(`/api/sessions/${conflictSessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    })

    if (res.ok) {
      setConflictSessionId(null)
      setError('')
      setEndingConflict(false)
      handleCreate()
    } else {
      setError('Failed to end existing session. Please close it from the dashboard first.')
      setEndingConflict(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
        }}
      />

      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 500,
        zIndex: 101,
        padding: '0 16px',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <div
          className="glass"
          style={{
            padding: 28,
            background: 'rgba(7, 20, 16, 0.96)',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.75)',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 24,
          }}>
            <div>
              <h2 style={{ color: 'var(--text)', fontSize: 18, fontWeight: 700 }}>
                New Session
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
                Students scan a QR code to mark attendance
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 6,
              }}>
                <label className="field-label" style={{ margin: 0 }}>Subject</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSubject(prev => !prev)
                    setAddSubjectError('')
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 600,
                    color: showAddSubject ? 'var(--text-muted)' : 'var(--em)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  {showAddSubject ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      Cancel
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Add new subject
                    </>
                  )}
                </button>
              </div>

              {showAddSubject && (
                <div style={{
                  background: '#102820',
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 10,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
                }}>
                  <p style={{ color: 'var(--em)', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
                    New subject will be saved to your subject list permanently.
                  </p>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: '0 0 130px' }}>
                      <label className="field-label">Code</label>
                      <input
                        type="text"
                        value={newCode}
                        onChange={e => setNewCode(e.target.value.toUpperCase())}
                        placeholder="e.g. ACF 43013"
                        maxLength={20}
                        className="input"
                        style={{ fontSize: 13, background: '#0b1e18' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="field-label">Subject Name</label>
                      <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="e.g. Advanced Corporate Law"
                        className="input"
                        style={{ fontSize: 13, background: '#0b1e18' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label className="field-label">Year (optional)</label>
                      <select
                        value={newYear}
                        onChange={e => setNewYear(e.target.value)}
                        className="input"
                        style={{ fontSize: 13, cursor: 'pointer', background: '#0b1e18' }}
                      >
                        <option value="">-</option>
                        <option value="1">Year 1</option>
                        <option value="2">Year 2</option>
                        <option value="3">Year 3</option>
                        <option value="4">Year 4</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="field-label">Semester (optional)</label>
                      <select
                        value={newSemester}
                        onChange={e => setNewSemester(e.target.value)}
                        className="input"
                        style={{ fontSize: 13, cursor: 'pointer', background: '#0b1e18' }}
                      >
                        <option value="">-</option>
                        <option value="1">Semester 1</option>
                        <option value="2">Semester 2</option>
                      </select>
                    </div>
                  </div>

                  {addSubjectError && (
                    <div style={{
                      background: 'rgba(248,113,113,0.1)',
                      border: '1px solid rgba(248,113,113,0.25)',
                      borderRadius: 7, padding: '7px 10px',
                      fontSize: 12, color: 'var(--danger)',
                      marginBottom: 10,
                    }}>
                      {addSubjectError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddSubject}
                    disabled={addingSubject || !newCode.trim() || !newName.trim()}
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: 13 }}
                  >
                    {addingSubject ? 'Saving...' : 'Save Subject ->'}
                  </button>
                </div>
              )}

              {subjectsLoading ? (
                <div className="input" style={{ color: 'var(--text-dim)', fontSize: 13 }}>
                  Loading subjects...
                </div>
              ) : (
                <select
                  value={subjectCode}
                  onChange={e => setSubjectCode(e.target.value)}
                  className="input"
                  style={{ cursor: 'pointer', fontSize: 13 }}
                >
                  <option value="">- Select a subject -</option>
                  {groups.map(group => (
                    <optgroup key={group.label} label={group.label}>
                      {group.subjects.map(subject => (
                        <option key={subject.code} value={subject.code}>
                          {subject.code} - {subject.name}
                          {subject.is_custom ? ' *' : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}

              {selectedSubject && (
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
                  {selectedSubject.name}
                  {selectedSubject.is_custom && (
                    <span style={{
                      marginLeft: 6,
                      background: 'var(--em-glow)',
                      border: '1px solid var(--em-border)',
                      color: 'var(--em)',
                      borderRadius: 4, fontSize: 10,
                      fontWeight: 600, padding: '1px 5px',
                    }}>
                      Custom
                    </span>
                  )}
                </p>
              )}
            </div>

            <div>
              <label className="field-label">Session Duration</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DURATIONS.map(durationOption => (
                  <button
                    key={durationOption.value}
                    type="button"
                    onClick={() => setDuration(durationOption.value)}
                    style={{
                      padding: '7px 14px', borderRadius: 8,
                      border: '1px solid', fontSize: 13,
                      fontWeight: 500, cursor: 'pointer',
                      transition: 'all 0.15s',
                      ...(duration === durationOption.value ? {
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
                    {durationOption.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12, padding: 14,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: geoEnabled ? 12 : 0,
              }}>
                <div>
                  <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
                    Location verification
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                    Students must be physically in the classroom
                  </div>
                </div>
                <div
                  onClick={() => { setGeoEnabled(!geoEnabled); setGeoCoords(null); setGeoError('') }}
                  style={{
                    width: 40, height: 22, borderRadius: 11,
                    cursor: 'pointer', transition: 'background 0.2s',
                    background: geoEnabled ? 'var(--em-deep)' : 'rgba(255,255,255,0.1)',
                    position: 'relative', flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3,
                    left: geoEnabled ? 21 : 3,
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }}/>
                </div>
              </div>

              {geoEnabled && (
                <div>
                  <div style={{ marginBottom: 10 }}>
                    <label className="field-label" style={{ marginBottom: 8 }}>
                      Allowed radius: {geoRadius}m
                    </label>
                    <input
                      type="range" min={30} max={300} step={10}
                      value={geoRadius}
                      onChange={e => setGeoRadius(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--em)' }}
                    />
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: 11, color: 'var(--text-dim)', marginTop: 2,
                    }}>
                      <span>30m</span><span>300m</span>
                    </div>
                  </div>

                  {geoCoords ? (
                    <div style={{
                      background: 'var(--em-glow)',
                      border: '1px solid var(--em-border)',
                      borderRadius: 8, padding: '8px 12px',
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 12, color: 'var(--em)',
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Location captured ({geoCoords.lat.toFixed(4)}, {geoCoords.lng.toFixed(4)})
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={getLocation}
                      disabled={locating}
                      className="btn-ghost"
                      style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {locating ? 'Getting location...' : 'Capture classroom location'}
                    </button>
                  )}

                  {geoError && (
                    <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>
                      {geoError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div style={{
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.2)',
                borderRadius: 8, padding: '12px 14px',
                fontSize: 13, color: 'var(--danger)',
              }}>
                <div style={{ marginBottom: conflictSessionId ? 10 : 0 }}>
                  {error}
                </div>

                {conflictSessionId && (
                  <button
                    type="button"
                    onClick={handleEndConflict}
                    disabled={endingConflict}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(248,113,113,0.15)',
                      border: '1px solid rgba(248,113,113,0.3)',
                      borderRadius: 7, padding: '7px 12px',
                      fontSize: 12, fontWeight: 600,
                      color: 'var(--danger)',
                      cursor: endingConflict ? 'not-allowed' : 'pointer',
                      transition: 'opacity 0.15s',
                      opacity: endingConflict ? 0.6 : 1,
                    }}
                  >
                    {endingConflict ? (
                      <>
                        <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                          <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" opacity="0.75"/>
                        </svg>
                        Ending session...
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <line x1="9" y1="9" x2="15" y2="15"/>
                          <line x1="15" y1="9" x2="9" y2="15"/>
                        </svg>
                        End existing session &amp; start new one
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                type="button"
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
                    Creating...
                  </span>
                ) : 'Start Session ->'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
