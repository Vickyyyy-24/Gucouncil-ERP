'use client'

import { useEffect, useState, createContext, useContext, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket'

// Create context to track socket readiness
interface SocketContextType {
  isReady: boolean
}

const SocketContext = createContext<SocketContextType>({ isReady: false })

export function useSocketReady() {
  return useContext(SocketContext)
}

/* =====================================================
   SOCKET INITIALIZER (CORE)
   ===================================================== */
export function SocketInitializer({
  children,
}: {
  children: ReactNode
}) {
  const { token, loading } = useAuth()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) {
      console.log('⏳ SocketInitializer: Waiting for auth to load...')
      return
    }

    if (!token) {
      console.log('⛔ SocketInitializer: No token, disconnecting socket')
      disconnectSocket()
      setIsReady(false)
      return
    }

    console.log('✅ SocketInitializer: Token available, connecting socket')

    const initSocket = async () => {
      try {
        // Connect the socket with token
        await connectSocket()
        console.log('✅ Socket successfully connected and authenticated')
        setIsReady(true)
      } catch (error) {
        console.error('❌ Socket connection failed:', error)
        setIsReady(false)
      }
    }

    initSocket()

    // Cleanup on unmount or token change
    return () => {
      console.log('🧹 SocketInitializer: Cleanup')
    }
  }, [token, loading])

  return (
    <SocketContext.Provider value={{ isReady }}>
      {children}
    </SocketContext.Provider>
  )
}

/* =====================================================
   STATUS BADGE (UI ONLY)
   ===================================================== */
export function SocketStatusBadge() {
  const { token } = useAuth()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!token) {
      setConnected(false)
      return
    }

    try {
      const socket = getSocket()

      if (!socket) {
        console.warn('⛔ SocketStatusBadge: Socket not available')
        setConnected(false)
        return
      }

      // Set initial state
      setConnected(socket.connected)
      console.log('📡 SocketStatusBadge: Initial socket state:', socket.connected)

      // Setup listeners
      const onConnect = () => {
        console.log('✅ Socket connected (badge)')
        setConnected(true)
      }

      const onDisconnect = () => {
        console.log('⚠️ Socket disconnected (badge)')
        setConnected(false)
      }

      socket.on('connect', onConnect)
      socket.on('disconnect', onDisconnect)

      // Cleanup
      return () => {
        socket.off('connect', onConnect)
        socket.off('disconnect', onDisconnect)
      }
    } catch (error) {
      console.error('❌ SocketStatusBadge error:', error)
      setConnected(false)
    }
  }, [token])

  // Don't render if not authenticated
  if (!token) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-900 text-white rounded-md shadow">
        <span
          className={`w-2 h-2 rounded-full ${
            connected ? 'bg-green-500' : 'bg-yellow-500'
          }`}
        />
        <span className="text-xs">
          {connected ? 'Connected' : 'Connecting'}
        </span>
      </div>
    </div>
  )
}