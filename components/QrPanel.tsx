'use client'

import { useEffect, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { useQrRotation } from '@/hooks/useQrRotation'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import type { Session } from '@/lib/supabase/types'

interface Props {
  session: Session
  onSessionEnded?: () => void
}

export default function QrPanel({ session }: Props) {
  const {
    shortCode, sessionUrl,
    timeLeft, timeFormatted,
    isWarning, isRotating, error,
  } = useQrRotation(session.id, session.token, session.short_code)

  const [scanCount, setScanCount] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // ── Live scan counter via Supabase Realtime ──
  useEffect(() => {
    const supabase = createClientSupabaseClient()

    // Get initial count
    supabase
      .from('attendance_records')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session.id)
      .then(({ count }: { count: number | null }) => setScanCount(count ?? 0))

    // Subscribe to new inserts
    const channel = supabase
      .channel(`attendance:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_records',
          filter: `session_id=eq.${session.id}`,
        },
        () => setScanCount(prev => prev + 1)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session.id])

  // ── Fullscreen toggle ──
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      panelRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    function onFsChange() {
      if (!document.fullscreenElement) setIsFullscreen(false)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Progress ring — SVG circle that drains as time runs out
  const ROTATION_MS = 2 * 60 * 1000
  const progress = timeLeft / ROTATION_MS
  const RADIUS = 20
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const strokeDash = progress * CIRCUMFERENCE

  return (
    <div
      ref={panelRef}
      style={{
        background: isFullscreen ? '#071410' : 'transparent',
        minHeight: isFullscreen ? '100vh' : 'auto',
        display: 'flex',
        alignItems: isFullscreen ? 'center' : 'stretch',
        justifyContent: isFullscreen ? 'center' : 'stretch',
        padding: isFullscreen ? 40 : 0,
      }}
    >
      <div
        className={isFullscreen ? '' : 'glass'}
        style={{
          padding: isFullscreen ? 48 : 28,
          width: isFullscreen ? 480 : '100%',
          textAlign: 'center',
          ...(isFullscreen ? {
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            borderRadius: 24,
          } : {}),
        }}
      >
        {/* Header */}
        {!isFullscreen && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15 }}>
                {session.subject_code}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                {session.subject_name}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Fullscreen button */}
              <button
                onClick={toggleFullscreen}
                className="btn-ghost"
                style={{ padding: '6px 10px' }}
                title="Fullscreen projector mode"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="15 3 21 3 21 9"/>
                  <polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/>
                  <line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* QR Code */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
          borderRadius: 16,
          padding: isFullscreen ? 20 : 14,
          marginBottom: 20,
          position: 'relative',
          opacity: isRotating ? 0.5 : 1,
          transition: 'opacity 0.2s',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <QRCodeCanvas
            value={sessionUrl}
            size={isFullscreen ? 240 : 180}
            level="M"
            bgColor="#ffffff"
            fgColor="#071410"
          />
          {isRotating && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 16,
              background: 'rgba(7,20,16,0.6)',
            }}>
              <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" opacity="0.2"/>
                <path fill="white" d="M4 12a8 8 0 018-8v8z" opacity="0.8"/>
              </svg>
            </div>
          )}
        </div>

        {/* Short code */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>
            OR TYPE THIS CODE AT attendiq.vercel.app/manual
          </div>
          <div style={{
            color: 'var(--em)',
            fontFamily: 'monospace',
            fontWeight: 900,
            fontSize: isFullscreen ? 56 : 36,
            letterSpacing: '0.3em',
            lineHeight: 1,
          }}>
            {shortCode}
          </div>
        </div>

        {/* Permanent URL */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '8px 12px',
          marginBottom: 16,
          fontSize: 11,
          color: 'var(--text-muted)',
          wordBreak: 'break-all',
        }}>
          <span style={{ color: 'var(--text-dim)' }}>Can&apos;t scan? Visit: </span>
          <span style={{ color: 'var(--em)', fontFamily: 'monospace' }}>{sessionUrl}</span>
        </div>

        {/* Countdown + scan count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>

          {/* Countdown ring */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ position: 'relative', width: 48, height: 48 }}>
              <svg width="48" height="48" viewBox="0 0 48 48">
                {/* Track */}
                <circle
                  cx="24" cy="24" r={RADIUS}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="4"
                />
                {/* Progress */}
                <circle
                  cx="24" cy="24" r={RADIUS}
                  fill="none"
                  stroke={isWarning ? 'var(--warning)' : 'var(--em)'}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${strokeDash} ${CIRCUMFERENCE}`}
                  transform="rotate(-90 24 24)"
                  style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.3s' }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                color: isWarning ? 'var(--warning)' : 'var(--em)',
                fontFamily: 'monospace',
              }}>
                {timeFormatted}
              </div>
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>Rotates</div>
          </div>

          {/* Scan count */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 48, height: 48,
              background: 'var(--em-glow)',
              border: '1px solid var(--em-border)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800,
              color: 'var(--em)',
            }}>
              {scanCount}
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>Scanned</div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 12,
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            color: 'var(--danger)',
          }}>
            {error}
          </div>
        )}

        {/* Fullscreen exit hint */}
        {isFullscreen && (
          <div style={{ marginTop: 24, color: 'var(--text-dim)', fontSize: 12 }}>
            Press Esc to exit fullscreen
          </div>
        )}
      </div>
    </div>
  )
}
