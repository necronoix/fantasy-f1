import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fantasy F1 | Asta & Lega',
  description: 'Fantasy Formula 1 con sistema asta per leghe private',
  manifest: '/manifest.json',
  themeColor: '#15151E',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it" className="dark">
      <body className="bg-f1-black min-h-screen antialiased">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#1E1E2E',
              color: '#FFFFFF',
              border: '1px solid #3A3A4A',
            },
            success: {
              iconTheme: {
                primary: '#E8002D',
                secondary: '#FFFFFF',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
