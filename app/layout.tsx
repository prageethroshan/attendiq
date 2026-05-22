import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AttendIQ',
  description: 'QR-based attendance management — Rajarata University of Sri Lanka',
}

export const viewport: Viewport = {
  themeColor: '#071410',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
