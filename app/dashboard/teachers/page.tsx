'use client'

import { useEffect, useState } from 'react'

interface Profile {
  id: string
  full_name: string
  email: string
  department: string | null
  is_active: boolean
  created_at: string
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [department, setDepartment] = useState('')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [pageError, setPageError] = useState('')

  async function loadTeachers() {
    setLoading(true)
    const res = await fetch('/api/teachers')
    const data = await res.json()

    if (!res.ok) {
      setPageError(data.error ?? 'Failed to load teacher accounts.')
      setTeachers([])
    } else {
      setPageError('')
      setTeachers(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadTeachers()
  }, [])

  async function handleCreate() {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setFormError('Full name, email and password are required.')
      return
    }

    setCreating(true)
    setFormError('')
    setFormSuccess('')

    const res = await fetch('/api/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, email, password, department }),
    })
    const data = await res.json()

    if (!res.ok) {
      setFormError(data.error ?? 'Failed to create teacher.')
      setCreating(false)
      return
    }

    setFormSuccess(`Account created for ${fullName}. They can now log in.`)
    setFullName('')
    setEmail('')
    setPassword('')
    setDepartment('')
    setCreating(false)
    loadTeachers()
  }

  async function toggleActive(teacher: Profile) {
    setActionId(teacher.id)
    const res = await fetch(`/api/teachers/${teacher.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !teacher.is_active }),
    })

    if (res.ok) {
      setTeachers(prev => prev.map(t =>
        t.id === teacher.id ? { ...t, is_active: !t.is_active } : t
      ))
    }
    setActionId(null)
  }

  async function resetPassword(id: string, name: string) {
    const newPassword = prompt(`Enter new password for ${name} (min 8 characters):`)
    if (!newPassword || newPassword.length < 8) return

    const res = await fetch(`/api/teachers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_password: newPassword }),
    })
    if (res.ok) alert(`Password updated for ${name}.`)
    else alert('Failed to update password.')
  }

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 28,
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            Teacher Accounts
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {teachers.length} account{teachers.length !== 1 ? 's' : ''} - Department of Accountancy & Finance
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
          style={{
            width: 'auto', padding: '10px 20px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Teacher
        </button>
      </div>

      {pageError && (
        <div style={{
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 8,
          color: 'var(--danger)',
          fontSize: 13,
          padding: '10px 12px',
          marginBottom: 16,
        }}>
          {pageError}
        </div>
      )}

      <div className="glass" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto', display: 'block' }}>
              <circle cx="12" cy="12" r="10" stroke="var(--text-dim)" strokeWidth="3"/>
              <path fill="var(--em)" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
        ) : teachers.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              No teacher accounts yet. Click <strong style={{ color: 'var(--text)' }}>Add Teacher</strong> to create one.
            </p>
          </div>
        ) : (
          teachers.map((teacher, i) => (
            <div key={teacher.id} style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: i < teachers.length - 1 ? '1px solid var(--border)' : 'none',
              gap: 12, flexWrap: 'wrap',
              background: !teacher.is_active ? 'rgba(248,113,113,0.03)' : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: teacher.is_active ? 'var(--em-glow)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${teacher.is_active ? 'var(--em-border)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                  color: teacher.is_active ? 'var(--em)' : 'var(--text-dim)',
                  flexShrink: 0,
                }}>
                  {teacher.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>
                      {teacher.full_name}
                    </span>
                    {!teacher.is_active && (
                      <span style={{
                        background: 'rgba(248,113,113,0.12)',
                        border: '1px solid rgba(248,113,113,0.25)',
                        color: 'var(--danger)',
                        borderRadius: 5, fontSize: 10,
                        fontWeight: 600, padding: '1px 6px',
                      }}>
                        Deactivated
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                    {teacher.email}
                    {teacher.department && (
                      <span style={{ color: 'var(--text-dim)', marginLeft: 8 }}>
                        - {teacher.department}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                  Added {new Date(teacher.created_at).toLocaleDateString('en-LK', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <button
                  onClick={() => resetPassword(teacher.id, teacher.full_name)}
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: '5px 10px' }}
                  title="Reset password"
                >
                  Reset PW
                </button>
                <button
                  onClick={() => toggleActive(teacher)}
                  disabled={actionId === teacher.id}
                  style={{
                    fontSize: 12, padding: '5px 10px',
                    borderRadius: 7, border: '1px solid', cursor: 'pointer',
                    fontWeight: 600, transition: 'all 0.15s',
                    ...(teacher.is_active ? {
                      background: 'rgba(248,113,113,0.08)',
                      borderColor: 'rgba(248,113,113,0.2)',
                      color: 'var(--danger)',
                    } : {
                      background: 'var(--em-glow)',
                      borderColor: 'var(--em-border)',
                      color: 'var(--em)',
                    }),
                  }}
                >
                  {actionId === teacher.id
                    ? '...'
                    : teacher.is_active ? 'Deactivate' : 'Reactivate'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <>
          <div
            onClick={() => { setShowModal(false); setFormError(''); setFormSuccess('') }}
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
            width: '100%', maxWidth: 440,
            zIndex: 101, padding: '0 16px',
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
                justifyContent: 'space-between', marginBottom: 22,
              }}>
                <div>
                  <h2 style={{ color: 'var(--text)', fontSize: 17, fontWeight: 700 }}>
                    Add Teacher
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                    They can log in immediately after creation
                  </p>
                </div>
                <button
                  onClick={() => { setShowModal(false); setFormError(''); setFormSuccess('') }}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="field-label">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Prageeth Roshan"
                    className="input"
                    style={{ fontSize: 14 }}
                  />
                </div>

                <div>
                  <label className="field-label">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="teacher@rusl.ac.lk"
                    autoComplete="off"
                    className="input"
                    style={{ fontSize: 14 }}
                  />
                </div>

                <div>
                  <label className="field-label">Temporary Password</label>
                  <input
                    type="text"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    autoComplete="new-password"
                    className="input"
                    style={{ fontSize: 14, fontFamily: 'monospace' }}
                  />
                  <p style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 4 }}>
                    Share this with the teacher - they should change it after first login.
                  </p>
                </div>

                <div>
                  <label className="field-label">Department (optional)</label>
                  <select
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="input"
                    style={{ fontSize: 14, cursor: 'pointer' }}
                  >
                    <option value="">- Select -</option>
                    <option value="Accountancy & Finance">Accountancy &amp; Finance</option>
                    <option value="Business Management">Business Management</option>
                    <option value="Information Systems">Information Systems</option>
                    <option value="Marketing Management">Marketing Management</option>
                    <option value="Human Resource Management">Human Resource Management</option>
                    <option value="Tourism & Hospitality">Tourism &amp; Hospitality</option>
                  </select>
                </div>

                {formError && (
                  <div style={{
                    background: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.2)',
                    borderRadius: 8, padding: '9px 12px',
                    fontSize: 13, color: 'var(--danger)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div style={{
                    background: 'var(--em-glow)',
                    border: '1px solid var(--em-border)',
                    borderRadius: 8, padding: '9px 12px',
                    fontSize: 13, color: 'var(--em)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {formSuccess}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button
                    onClick={() => { setShowModal(false); setFormError(''); setFormSuccess('') }}
                    className="btn-ghost"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="btn-primary"
                    style={{ flex: 2 }}
                  >
                    {creating ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                          <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" opacity="0.75"/>
                        </svg>
                        Creating...
                      </span>
                    ) : 'Create Account ->'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
