'use client'
import 'react-toastify/dist/ReactToastify.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { SocketInitializer, SocketStatusBadge } from '@/components/SocketInitializer'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      
      <SocketInitializer>
        {children}
        <SocketStatusBadge />
      </SocketInitializer>
    </AuthProvider>
  )
}

// "use client"

// import { AuthProvider } from '@/contexts/AuthContext'

// export function Providers({ children }: { children: React.ReactNode }) {
//   return <AuthProvider>{children}</AuthProvider>
// }