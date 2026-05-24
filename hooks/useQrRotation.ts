'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { buildSessionUrl, QR_ROTATION_MS, QR_WARNING_MS } from '@/lib/qr'

interface QrState {
  token: string
  shortCode: string
  sessionUrl: string
  timeLeft: number
  isWarning: boolean
  isRotating: boolean
  error: string
}

export function useQrRotation(sessionId: string, initialToken: string, initialShortCode: string) {
  const [state, setState] = useState<QrState>({
    token: initialToken,
    shortCode: initialShortCode,
    sessionUrl: buildSessionUrl(initialToken),
    timeLeft: QR_ROTATION_MS,
    isWarning: false,
    isRotating: false,
    error: '',
  })

  const rotationTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAt = useRef<number>(0)

  const rotate = useCallback(async () => {
    setState(prev => ({ ...prev, isRotating: true, error: '' }))

    try {
      const res = await fetch('/api/qr-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setState(prev => ({
          ...prev,
          isRotating: false,
          error: data.error ?? 'Token rotation failed.',
        }))
        return
      }

      startedAt.current = Date.now()

      setState(prev => ({
        ...prev,
        token: data.token,
        shortCode: data.short_code,
        sessionUrl: buildSessionUrl(data.token),
        timeLeft: QR_ROTATION_MS,
        isWarning: false,
        isRotating: false,
        error: '',
      }))
    } catch {
      setState(prev => ({
        ...prev,
        isRotating: false,
        error: 'Network error during token rotation.',
      }))
    }
  }, [sessionId])

  // Countdown tick — updates every second
  useEffect(() => {
    startedAt.current = Date.now()
    countdownTimer.current = setInterval(() => {
      const elapsed = Date.now() - startedAt.current
      const timeLeft = Math.max(0, QR_ROTATION_MS - elapsed)
      setState(prev => ({
        ...prev,
        timeLeft,
        isWarning: timeLeft <= QR_WARNING_MS,
      }))
    }, 1000)

    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current)
    }
  }, [])

  // Rotation trigger — fires every 2 minutes
  useEffect(() => {
    rotationTimer.current = setInterval(rotate, QR_ROTATION_MS)
    return () => {
      if (rotationTimer.current) clearInterval(rotationTimer.current)
    }
  }, [rotate])

  // Format mm:ss for display
  const timeFormatted = (() => {
    const total = Math.ceil(state.timeLeft / 1000)
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  })()

  return { ...state, timeFormatted, rotate }
}
