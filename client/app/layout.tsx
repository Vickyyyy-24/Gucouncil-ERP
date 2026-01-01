import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import 'react-toastify/dist/ReactToastify.css' 

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dynamic CRM System',
  description: 'Full-stack CRM with role-based authentication',
}

/* ===========================
   CLIENT PROVIDERS (INLINE)
   =========================== */
function ClientProviders({ children }: { children: React.ReactNode }) {
  'use client'

  const { ToastContainer } = require('react-toastify')
  const { AuthProvider } = require('@/contexts/AuthContext')

  return (
    <AuthProvider>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        pauseOnHover
      />
    </AuthProvider>
  )
}

/* ===========================
   ROOT LAYOUT (SERVER)
   =========================== */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className={`${inter.className} h-full antialiased`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
