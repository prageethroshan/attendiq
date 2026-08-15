'use client'

import { useEffect, useMemo, useState } from 'react'

interface StudentRow {
  student_id: string
  name: string
  year: string
  department: string
  academic_year: number | null
  is_active: boolean
  created_at: string
  attendance_count: number
  enrollment_count: number
}

interface StudentResponse {
  students: StudentRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type EditState = {
  student_id: string
  name: string
  year: string
  department: string
  is_active: boolean
}

function studentPath(studentId: string) {
  return studentId.split('/').map(encodeURIComponent).join('/')
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [query, setQuery] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState('active')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [edit, setEdit] = useState<EditState | null>(null)
  const [mergeSource, setMergeSource] = useState('')
  const [mergeTarget, setMergeTarget] = useState('')

  const departments = useMemo(
    () => Array.from(new Set(students.map(student => student.department).filter(Boolean))).sort(),
    [students]
  )

  async function loadStudents(nextPage = page) {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: '50',
      status,
    })
    if (query.trim()) params.set('query', query.trim())
    if (academicYear) params.set('academic_year', academicYear)
    if (department) params.set('department', department)

    try {
      const response = await fetch(`/api/admin/students?${params.toString()}`)
      const data: StudentResponse & { error?: string } = await response.json()
      if (!response.ok) {
        setError(data.error ?? 'Failed to load students.')
        return
      }
      setStudents(data.students)
      setTotal(data.total)
      setPage(data.page)
      setTotalPages(Math.max(1, data.totalPages))
    } catch {
      setError('Failed to load students.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStudents(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  function startEdit(student: StudentRow) {
    setEdit({
      student_id: student.student_id,
      name: student.name,
      year: student.year,
      department: student.department,
      is_active: student.is_active,
    })
    setMergeSource(student.student_id)
    setError('')
  }

  async function saveEdit() {
    if (!edit) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/students/${studentPath(edit.student_id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: edit.name,
          year: edit.year,
          department: edit.department,
          is_active: edit.is_active,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? 'Failed to update student.')
        return
      }
      setEdit(null)
      await loadStudents(page)
    } catch {
      setError('Failed to update student.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStudent(student: StudentRow) {
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/students/${studentPath(student.student_id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !student.is_active }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? 'Failed to update student.')
        return
      }
      await loadStudents(page)
    } catch {
      setError('Failed to update student.')
    } finally {
      setSaving(false)
    }
  }

  async function mergeStudents() {
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/admin/students/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_student_id: mergeSource,
          target_student_id: mergeTarget,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? 'Failed to merge students.')
        return
      }
      setMergeTarget('')
      await loadStudents(page)
    } catch {
      setError('Failed to merge students.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          Students
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Maintain the central student database used for cohort sessions
        </p>
      </div>

      <div className="glass" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>SEARCH</span>
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Student ID or name"
              className="input"
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>ACADEMIC YEAR</span>
            <input
              value={academicYear}
              onChange={event => setAcademicYear(event.target.value)}
              placeholder="2025"
              className="input"
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>DEPARTMENT</span>
            <input
              value={department}
              onChange={event => setDepartment(event.target.value)}
              placeholder="Department"
              className="input"
              list="student-departments"
            />
            <datalist id="student-departments">
              {departments.map(item => <option key={item} value={item} />)}
            </datalist>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>STATUS</span>
            <select value={status} onChange={event => setStatus(event.target.value)} className="input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>
          </label>
          <button onClick={() => loadStudents(1)} className="btn-primary" disabled={loading}>
            Search
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 8,
          padding: '10px 12px',
          color: 'var(--danger)',
          fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <div className="glass" style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700 }}>
            Student Records
          </h2>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            {total} records
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No students found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#102820' }}>
                  {['Student ID', 'Name', 'Academic Year', 'Study Year', 'Department', 'History', 'Status', 'Actions'].map(header => (
                    <th key={header} style={{
                      padding: '9px 12px',
                      textAlign: 'left',
                      color: 'var(--text-muted)',
                      fontWeight: 700,
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      borderBottom: '1px solid var(--border)',
                      whiteSpace: 'nowrap',
                    }}>
                      {header.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={student.student_id} style={{
                    borderBottom: index < students.length - 1 ? '1px solid var(--border)' : 'none',
                    background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}>
                    <td style={{ padding: '9px 12px', color: 'var(--em)', fontFamily: 'monospace', fontWeight: 700 }}>
                      {student.student_id}
                    </td>
                    <td style={{ padding: '9px 12px', color: 'var(--text)', minWidth: 180 }}>
                      {student.name}
                    </td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>
                      {student.academic_year ?? '-'}
                    </td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>
                      Year {student.year}
                    </td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-muted)', minWidth: 160 }}>
                      {student.department}
                    </td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {student.attendance_count} scans / {student.enrollment_count} sessions
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{
                        color: student.is_active ? 'var(--em)' : 'var(--danger)',
                        background: student.is_active ? 'var(--em-glow)' : 'rgba(248,113,113,0.08)',
                        border: `1px solid ${student.is_active ? 'var(--em-border)' : 'rgba(248,113,113,0.2)'}`,
                        borderRadius: 6,
                        padding: '3px 7px',
                        fontSize: 11,
                        fontWeight: 700,
                      }}>
                        {student.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap' }}>
                        <button onClick={() => startEdit(student)} className="btn-ghost" style={{ fontSize: 12, padding: '6px 10px' }}>
                          Edit
                        </button>
                        <button onClick={() => toggleStudent(student)} className="btn-ghost" disabled={saving} style={{ fontSize: 12, padding: '6px 10px' }}>
                          {student.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          borderTop: '1px solid var(--border)',
        }}>
          <button onClick={() => loadStudents(page - 1)} className="btn-ghost" disabled={page <= 1 || loading}>
            Previous
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Page {page} of {totalPages}
          </span>
          <button onClick={() => loadStudents(page + 1)} className="btn-ghost" disabled={page >= totalPages || loading}>
            Next
          </button>
        </div>
      </div>

      {edit && (
        <div className="glass" style={{ padding: 18 }}>
          <h2 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
            Edit {edit.student_id}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 1.5fr auto', gap: 10, alignItems: 'end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>NAME</span>
              <input value={edit.name} onChange={event => setEdit({ ...edit, name: event.target.value })} className="input" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>YEAR</span>
              <input value={edit.year} onChange={event => setEdit({ ...edit, year: event.target.value })} className="input" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>DEPARTMENT</span>
              <input value={edit.department} onChange={event => setEdit({ ...edit, department: event.target.value })} className="input" />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13, paddingBottom: 10 }}>
              <input
                type="checkbox"
                checked={edit.is_active}
                onChange={event => setEdit({ ...edit, is_active: event.target.checked })}
              />
              Active
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={saveEdit} className="btn-primary" disabled={saving}>
              Save changes
            </button>
            <button onClick={() => setEdit(null)} className="btn-ghost" disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="glass" style={{ padding: 18 }}>
        <h2 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
          Merge Duplicate Student
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 14 }}>
          Moves attendance and session links from the duplicate ID to the correct ID, then deactivates the duplicate.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>DUPLICATE ID</span>
            <input
              value={mergeSource}
              onChange={event => setMergeSource(event.target.value.toUpperCase())}
              placeholder="MGT/2025/001"
              className="input"
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>CORRECT ID</span>
            <input
              value={mergeTarget}
              onChange={event => setMergeTarget(event.target.value.toUpperCase())}
              placeholder="MGT/2025/002"
              className="input"
            />
          </label>
          <button onClick={mergeStudents} className="btn-primary" disabled={saving || !mergeSource || !mergeTarget}>
            Merge
          </button>
        </div>
      </div>
    </div>
  )
}
