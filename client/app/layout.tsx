import type React from "react"
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import 'react-toastify/dist/ReactToastify.css'
import { Providers } from './ClientProviders'


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dynamic CRM System',
  description: 'Full-stack CRM with role-based authentication',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className={`${inter.className} h-full antialiased`}>
         <Providers>{children}</Providers>
      </body>
    </html>
  )
}