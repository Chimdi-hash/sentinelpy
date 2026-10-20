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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        <TelemetryTracker />
        {children}
      </body>
    </html>
  )
}
