'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ManualPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [origin, setOrigin] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    inputRef.current?.focus()
    setOrigin(window.location.origin)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, 8)
    setCode(val)
    setError('')
  }

  async function handleSubmit() {
    if (code.length < 4) {
      setError('Please enter the full session code shown on the projector.')
      return
    }

    setLoading(true)
    setError('')

    const res = await fetch(`/api/lookup-code?code=${code}`)
    const data = await res.json()

    if (!res.ok || !data.token) {
      setLoading(false)
      setError(data.error ?? 'Code not found. Check the projector and try again.')
      return
    }

    router.push(`/session/${data.token}`)
  }

  const formatted = code.length > 0
    ? code.slice(0, 3) + (code.length > 3 ? ' . ' + code.slice(3) : '')
    : ''

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="logo-gem" style={{
            width: 52, height: 52,
            borderRadius: 15,
            fontSize: 22,
            margin: '0 auto 14px',
          }}>
            A
          </div>
          <h1 style={{
            color: 'var(--text)',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginBottom: 6,
          }}>
            Attend<span style={{ color: 'var(--em)' }}>IQ</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Enter the session code shown on the projector
          </p>
        </div>

        <div className="glass" style={{ padding: 28 }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: '50%',
            background: 'var(--em-glow)',
            border: '1px solid var(--em-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--em)" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <label className="field-label" style={{ display: 'block', textAlign: 'center', marginBottom: 10 }}>
            Session Code
          </label>

          <input
            ref={inputRef}
            type="text"
            value={formatted}
            onChange={handleChange}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder=". . . . . ."
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            className="input"
            style={{
              textAlign: 'center',
              fontSize: 28,
              fontFamily: 'monospace',
              fontWeight: 800,
              letterSpacing: '0.25em',
              padding: '14px 16px',
              marginBottom: 8,
            }}
          />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>
              Code rotates every 2 minutes - check the latest code
            </p>
            <span style={{
              color: code.length === 6 ? 'var(--em)' : 'var(--text-dim)',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'monospace',
              transition: 'color 0.15s',
            }}>
              {code.length}/6
            </span>
          </div>

          {error && (
            <div style={{
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              fontSize: 13,
              color: 'var(--danger)',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || code.length < 4}
            className="btn-primary"
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" opacity="0.75"/>
                </svg>
                Finding your class...
              </span>
            ) : 'Find My Class ->'}
          </button>
        </div>

        <div style={{
          marginTop: 20,
          textAlign: 'center',
        }}>
          <p style={{ color: 'var(--text-dim)', fontSize: 12, marginBottom: 8 }}>
            You can also scan the QR code directly with your camera
          </p>
          <p style={{ color: 'var(--text-dim)', fontSize: 11 }}>
            Or visit:{' '}
            <span style={{ color: 'var(--em)', fontFamily: 'monospace' }}>
              {origin}/session/[token]
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
