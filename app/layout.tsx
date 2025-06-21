import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AlgoPulse',
  description: '2AlgoPulse is a platform for learning algorithms and data structures through interactive coding challenges.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
