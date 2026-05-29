'use client'

import { useCallback, useRef, useState } from 'react'
import Papa from 'papaparse'

interface Student {
  student_id: string
  name: string
  year: string
  department: string
}

interface Props {
  sessionId?: string
  onComplete?: (studentIds: string[]) => void
  onClose: () => void
}

type UploadState = 'idle' | 'preview' | 'uploading' | 'done' | 'error'

export default function EnrollmentUpload({ sessionId, onComplete, onClose }: Props) {
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [students, setStudents] = useState<Student[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [uploadResult, setUploadResult] = useState<{ inserted: number; errors: string[] } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function parseCSV(file: File) {
    setParseErrors([])
    setErrorMsg('')

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.trim(),
      complete: result => {
        const rows = result.data as any[]
        const errors: string[] = []
        const parsed: Student[] = []

        for (let index = 0; index < rows.length; index++) {
          const row = rows[index]

          const studentId = (
            row['Student ID'] ?? row.student_id ??
            row.StudentID ?? row.ID ?? ''
          ).toString().trim().toUpperCase()

          const name = (
            row['Full Name'] ?? row.full_name ??
            row.Name ?? row.name ?? ''
          ).toString().trim()

          const year = (
            row.Year ?? row.year ?? ''
          ).toString().trim().replace(/[^0-9]/g, '')

          const department = (
            row.Department ?? row.department ??
            row.Dept ?? ''
          ).toString().trim()

          if (!studentId) {
            errors.push(`Row ${index + 2}: Missing Student ID`)
            continue
          }

          if (!name) {
            errors.push(`Row ${index + 2}: Missing Full Name for ${studentId}`)
            continue
          }

          if (!year) {
            errors.push(`Row ${index + 2}: Missing Year for ${studentId}`)
            continue
          }

          parsed.push({ student_id: studentId, name, year, department })
        }

        if (parsed.length === 0) {
          setErrorMsg('No valid rows found. Check your CSV format.')
          return
        }

        setStudents(parsed)
        setParseErrors(errors)
        setUploadState('preview')
      },
      error: () => {
        setErrorMsg('Failed to read the file. Make sure it is a valid CSV.')
      },
    })
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) parseCSV(file)
  }

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file && file.name.toLowerCase().endsWith('.csv')) {
      parseCSV(file)
    } else {
      setErrorMsg('Please drop a .csv file.')
    }
  }, [])

  async function handleUpload() {
    setUploadState('uploading')
    setErrorMsg('')

    const res = await fetch('/api/students/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        students,
        session_id: sessionId ?? null,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setErrorMsg(data.error ?? 'Upload failed.')
      setUploadState('error')
      return
    }

    setUploadResult({ inserted: data.inserted, errors: data.errors ?? [] })
    setUploadState('done')
    onComplete?.(data.studentIds ?? [])
  }

  function downloadTemplate() {
    const csv = [
      'Student ID,Full Name,Year,Department',
      'MGT/2025/001,Kasun Perera,1,Business Management',
      'ACF/2025/002,Nimali Fernando,1,Accountancy & Finance',
      'MGT/2024/047,Ashan Silva,2,Business Management',
      'ACF/2023/089,Dilini Jayawardena,3,Accountancy & Finance',
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'AttendIQ-Enrollment-Template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.78)',
          backdropFilter: 'blur(6px)',
          zIndex: 100,
        }}
      />

      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 560,
        maxHeight: '90vh',
        overflowY: 'auto',
        zIndex: 101,
        padding: '0 16px',
      }}>
        <div style={{
          padding: 28,
          background: '#0b1e18',
          border: '1px solid rgba(255,255,255,0.16)',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.75)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 22,
          }}>
            <div>
              <h2 style={{ color: 'var(--text)', fontSize: 18, fontWeight: 700 }}>
                Upload Enrollment List
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
                {sessionId
                  ? 'Students will be enrolled in this session'
                  : 'Students will be added to the system'}
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

          {uploadState === 'idle' && (
            <>
              <div
                onDragOver={event => { event.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? 'var(--em)' : 'var(--border)'}`,
                  borderRadius: 12,
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: dragging ? 'var(--em-glow)' : 'transparent',
                  marginBottom: 14,
                }}
              >
                <div style={{
                  width: 44, height: 44,
                  background: 'var(--em-glow)',
                  border: '1px solid var(--em-border)',
                  borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--em)" strokeWidth="2" strokeLinecap="round">
                    <polyline points="16 16 12 12 8 16"/>
                    <line x1="12" y1="12" x2="12" y2="21"/>
                    <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
                  </svg>
                </div>
                <p style={{ color: 'var(--text)', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  Drop your CSV here or click to browse
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  .csv files only - max 500 students
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {errorMsg && (
                <div style={{
                  background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: 8, padding: '9px 12px',
                  fontSize: 13, color: 'var(--danger)', marginBottom: 14,
                }}>
                  {errorMsg}
                </div>
              )}

              <div style={{
                background: '#102820',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: 14, marginBottom: 14,
              }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                  Required CSV format:
                </p>
                <code style={{
                  display: 'block',
                  color: 'var(--em)',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  lineHeight: 1.8,
                  whiteSpace: 'pre',
                  overflowX: 'auto',
                }}>
{`Student ID,Full Name,Year,Department
MGT/2025/001,Kasun Perera,1,Business Management
ACF/2025/002,Nimali Fernando,1,Accountancy & Finance`}
                </code>
              </div>

              <button
                onClick={downloadTemplate}
                className="btn-ghost"
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6,
                  fontSize: 13,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download CSV Template
              </button>
            </>
          )}

          {uploadState === 'preview' && (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{
                  flex: 1, background: 'var(--em-glow)',
                  border: '1px solid var(--em-border)',
                  borderRadius: 8, padding: '10px 14px', textAlign: 'center',
                }}>
                  <div style={{ color: 'var(--em)', fontSize: 22, fontWeight: 800 }}>
                    {students.length}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                    Students ready
                  </div>
                </div>
                {parseErrors.length > 0 && (
                  <div style={{
                    flex: 1,
                    background: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.2)',
                    borderRadius: 8, padding: '10px 14px', textAlign: 'center',
                  }}>
                    <div style={{ color: 'var(--danger)', fontSize: 22, fontWeight: 800 }}>
                      {parseErrors.length}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                      Rows skipped
                    </div>
                  </div>
                )}
              </div>

              {parseErrors.length > 0 && (
                <div style={{
                  background: 'rgba(248,113,113,0.06)',
                  border: '1px solid rgba(248,113,113,0.15)',
                  borderRadius: 8, padding: '10px 12px',
                  marginBottom: 14, fontSize: 12,
                }}>
                  <p style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: 6 }}>
                    Skipped rows:
                  </p>
                  {parseErrors.slice(0, 5).map((error, index) => (
                    <p key={index} style={{ color: 'var(--text-muted)', marginBottom: 2 }}>
                      {error}
                    </p>
                  ))}
                  {parseErrors.length > 5 && (
                    <p style={{ color: 'var(--text-dim)', marginTop: 4 }}>
                      +{parseErrors.length - 5} more
                    </p>
                  )}
                </div>
              )}

              <div style={{
                background: '#102820',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, overflow: 'hidden',
                marginBottom: 16, maxHeight: 240,
                overflowY: 'auto',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#143428' }}>
                      {['Student ID', 'Name', 'Year', 'Department'].map(header => (
                        <th key={header} style={{
                          padding: '8px 12px', textAlign: 'left',
                          color: 'var(--text-muted)', fontWeight: 600,
                          fontSize: 10, letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid var(--border)',
                          position: 'sticky', top: 0,
                          background: '#143428',
                        }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => (
                      <tr key={student.student_id} style={{
                        borderBottom: index < students.length - 1
                          ? '1px solid var(--border)' : 'none',
                        background: index % 2 === 0
                          ? 'transparent' : 'rgba(255,255,255,0.01)',
                      }}>
                        <td style={{ padding: '7px 12px', color: 'var(--em)', fontFamily: 'monospace', fontWeight: 600 }}>
                          {student.student_id}
                        </td>
                        <td style={{ padding: '7px 12px', color: 'var(--text)' }}>
                          {student.name}
                        </td>
                        <td style={{ padding: '7px 12px', color: 'var(--text-muted)' }}>
                          Year {student.year}
                        </td>
                        <td style={{ padding: '7px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                          {student.department || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => {
                    setUploadState('idle')
                    setStudents([])
                    setParseErrors([])
                  }}
                  className="btn-ghost"
                  style={{ flex: 1 }}
                >
                  Upload different file
                </button>
                <button
                  onClick={handleUpload}
                  className="btn-primary"
                  style={{ flex: 2 }}
                >
                  Confirm & Upload {students.length} Students
                </button>
              </div>
            </>
          )}

          {uploadState === 'uploading' && (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 14px', display: 'block' }}>
                <circle cx="12" cy="12" r="10" stroke="var(--text-dim)" strokeWidth="3"/>
                <path fill="var(--em)" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                Uploading {students.length} students...
              </p>
            </div>
          )}

          {uploadState === 'done' && uploadResult && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56,
                borderRadius: '50%',
                background: 'rgba(52,211,153,0.1)',
                border: '2px solid var(--em)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--em)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>

              <h3 style={{ color: 'var(--em)', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                Upload Complete
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
                {uploadResult.inserted} student{uploadResult.inserted !== 1 ? 's' : ''} enrolled successfully.
                {sessionId && ' Session enrollment list updated.'}
              </p>

              {uploadResult.errors.length > 0 && (
                <div style={{
                  background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: 8, padding: '10px 12px',
                  marginBottom: 16, fontSize: 12,
                  color: 'var(--danger)', textAlign: 'left',
                }}>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>
                    {uploadResult.errors.length} rows had errors and were skipped.
                  </p>
                  {uploadResult.errors.map((error, index) => (
                    <p key={index} style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{error}</p>
                  ))}
                </div>
              )}

              <button onClick={onClose} className="btn-primary">
                Done
              </button>
            </div>
          )}

          {uploadState === 'error' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52,
                borderRadius: '50%',
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h3 style={{ color: 'var(--danger)', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                Upload Failed
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
                {errorMsg}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setUploadState('preview')}
                  className="btn-ghost"
                  style={{ flex: 1 }}
                >
                  Try Again
                </button>
                <button onClick={onClose} className="btn-primary" style={{ flex: 1 }}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
