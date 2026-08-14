'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Session } from '@/lib/supabase/types'

interface Student {
  student_id: string
  name: string
  year: string
  department: string
  already_marked?: boolean
}

interface MarkedEntry {
  studentId: string
  studentName: string
  markedAt: string
}

interface Props {
  session: Session
  onClose: () => void
}

export default function ManualAttendanceModal({ session, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Student[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Student | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [marked, setMarked] = useState<MarkedEntry[]>([])

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const searchStudents = useCallback(async (value: string) => {
    if (value.trim().length < 2) {
      setResults([])
      return
    }

    setSearching(true)
    const res = await fetch(
      `/api/students/search?q=${encodeURIComponent(value)}&session_id=${session.id}`
    )
    const data = await res.json()
    setResults(Array.isArray(data) ? data : [])
    setSearching(false)
  }, [session.id])

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQuery(value)
    setSelected(null)
    setError('')

    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => searchStudents(value), 300)
  }

  async function handleMark(student?: Student) {
    setError('')
    setSubmitting(true)

    if (!student) return
    const payload = {
      sessionId: session.id,
      studentId: student.student_id,
    }

    const res = await fetch('/api/attendance/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to mark attendance.')
      setSubmitting(false)
      return
    }

    setMarked(prev => [{
      studentId: data.studentId,
      studentName: data.studentName,
      markedAt: data.markedAt,
    }, ...prev])

    setQuery('')
    setResults([])
    setSelected(null)
    setSubmitting(false)
    inputRef.current?.focus()
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
        }}
      />

      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        maxWidth: 520,
        maxHeight: '90vh',
        overflowY: 'auto',
        zIndex: 101,
        padding: '0 16px',
      }}>
        <div style={{
          padding: 24,
          background: 'rgba(7,20,16,0.98)',
          border: '1px solid rgba(255,255,255,0.16)',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}>
            <div>
              <h2 style={{ color: 'var(--text)', fontSize: 17, fontWeight: 700 }}>
                Manual Attendance Entry
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                {session.subject_code} - {session.subject_name}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {marked.length > 0 && (
            <div style={{
              background: 'var(--em-glow)',
              border: '1px solid var(--em-border)',
              borderRadius: 8,
              padding: '8px 12px',
              marginBottom: 14,
              fontSize: 13,
              color: 'var(--em)',
              fontWeight: 600,
            }}>
              {marked.length} student{marked.length !== 1 ? 's' : ''} marked manually this session
            </div>
          )}

          <div style={{ position: 'relative', marginBottom: 10 }}>
            <label className="field-label">Search Student</label>
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleQueryChange}
                placeholder="Type student ID or name..."
                autoComplete="off"
                className="input"
                style={{ fontSize: 15, paddingRight: 36 }}
              />
              {searching && (
                <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="var(--text-dim)" strokeWidth="3"/>
                    <path fill="var(--em)" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                </div>
              )}
            </div>

            {results.length > 0 && !selected && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                zIndex: 10,
                background: 'var(--bg-1)',
                border: '1px solid var(--border-md)',
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)',
              }}>
                {results.map((student, index) => (
                  <div
                    key={student.student_id}
                    onClick={() => {
                      if (!student.already_marked) {
                        setSelected(student)
                        setQuery(student.student_id)
                        setResults([])
                      }
                    }}
                    style={{
                      padding: '10px 14px',
                      borderBottom: index < results.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: student.already_marked ? 'not-allowed' : 'pointer',
                      opacity: student.already_marked ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                    onMouseEnter={e => {
                      if (!student.already_marked) e.currentTarget.style.background = 'var(--surface-hover)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          color: 'var(--em)',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          fontSize: 13,
                        }}>
                          {student.student_id}
                        </span>
                        {student.already_marked && (
                          <span style={{
                            background: 'var(--em-glow)',
                            border: '1px solid var(--em-border)',
                            color: 'var(--em)',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '1px 5px',
                          }}>
                            Already marked
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 1 }}>
                        {student.name} - Year {student.year}
                        {student.department && ` - ${student.department}`}
                      </div>
                    </div>
                    {!student.already_marked && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <div style={{
              background: 'var(--em-glow)',
              border: '1px solid var(--em-border)',
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}>
              <div>
                <div style={{ color: 'var(--em)', fontFamily: 'monospace', fontWeight: 700, fontSize: 14, marginBottom: 3 }}>
                  {selected.student_id}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  {selected.name} - Year {selected.year}
                  {selected.department && ` - ${selected.department}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => { setSelected(null); setQuery(''); inputRef.current?.focus() }}
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: '5px 10px' }}
                >
                  Clear
                </button>
                <button
                  onClick={() => handleMark(selected)}
                  disabled={submitting}
                  className="btn-primary"
                  style={{ fontSize: 12, padding: '5px 14px', width: 'auto' }}
                >
                  {submitting ? 'Marking...' : 'Mark Present'}
                </button>
              </div>
            </div>
          )}

          <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 14, textAlign: 'center' }}>
            Only students in this session&apos;s uploaded roster can be marked manually.
          </p>

          {error && (
            <div style={{
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 8,
              padding: '10px 12px',
              marginTop: 12,
              fontSize: 13,
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {marked.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p className="field-label" style={{ marginBottom: 8 }}>
                Marked this session
              </p>
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: 8,
                overflow: 'hidden',
                maxHeight: 180,
                overflowY: 'auto',
              }}>
                {marked.map((entry, index) => (
                  <div key={entry.studentId} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderBottom: index < marked.length - 1 ? '1px solid var(--border)' : 'none',
                    background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    gap: 10,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ color: 'var(--em)', fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>
                        {entry.studentId}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>
                        {entry.studentName}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{
                        background: 'var(--em-glow)',
                        border: '1px solid var(--em-border)',
                        color: 'var(--em)',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '1px 5px',
                      }}>
                        Manual
                      </span>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                        {new Date(entry.markedAt).toLocaleTimeString('en-LK', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
