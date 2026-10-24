import type { Metadata } from 'next'
import './globals.css'
import TelemetryTracker from '@/components/TelemetryTracker'

export const metadata: Metadata = {
  title: 'TrustlessWork | Decentralized Freelance Escrow Protocol',
  description: 'Objective, AI-governed freelance milestone escrow and deliverable verification protocol built on GenLayer.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased selection:bg-slate-200 selection:text-slate-900">
        <TelemetryTracker />
        {children}
      </body>
    </html>
  )
}
