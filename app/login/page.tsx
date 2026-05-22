'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientSupabaseClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleLogin() {
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClientSupabaseClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (authError) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="logo-gem mx-auto mb-4" style={{ width: 56, height: 56, borderRadius: 16, fontSize: 22 }}>
            A
          </div>
          <h1 style={{ color: 'var(--text)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Attend<span style={{ color: 'var(--em)' }}>IQ</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Teacher portal — sign in to continue
          </p>
        </div>

        {/* Card */}
        <div className="glass" style={{ padding: 28 }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>

            {/* Email */}
            <div>
              <label className="field-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="you@rusl.ac.lk"
                autoComplete="email"
                className="input"
              />
            </div>

            {/* Password */}
            <div>
              <label className="field-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                autoComplete="current-password"
                className="input"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: 'var(--danger)',
            }}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" opacity="0.75"/>
                </svg>
                Signing in…
              </span>
            ) : 'Sign in →'}
          </button>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, marginTop: 20 }}>
          Rajarata University of Sri Lanka · Dept. of Accountancy &amp; Finance
        </p>
      </div>
    </div>
  )
}