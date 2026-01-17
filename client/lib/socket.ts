'use client'

import { io, Socket } from 'socket.io-client'

const API = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5005'

let socket: Socket | null = null
let isInitializing = false

/**
 * Get or create socket instance
 */
export function getSocket(): Socket {
  if (!socket) {
    // Get token from localStorage (should be available by now)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    console.log('🔌 Creating socket instance with token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN')

    socket = io(API, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    // Setup event listeners
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket?.id)
    })

    socket.on('connect_error', (error: any) => {
      console.error('❌ Socket connection error:', error.message)
    })

    socket.on('disconnect', (reason: string) => {
      console.log('⚠️ Socket disconnected:', reason)
    })

    socket.on('error', (error: any) => {
      console.error('❌ Socket error:', error)
    })

    socket.on('reconnect_attempt', () => {
      console.log('🔄 Attempting to reconnect...')
    })

    socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect')
    })
  }

  return socket
}

/**
 * Connect to socket server
 * Call ONLY after login/authentication confirmed
 */
export async function connectSocket(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (isInitializing) {
        console.log('⏳ Socket already initializing...')
        return resolve()
      }

      const s = getSocket()

      if (s.connected) {
        console.log('✅ Socket already connected')
        return resolve()
      }

      isInitializing = true

      // Set timeout for connection attempt
      const timeout = setTimeout(() => {
        isInitializing = false
        reject(new Error('Socket connection timeout'))
      }, 10000)

      // Listen for successful connection
      s.once('connect', () => {
        isInitializing = false
        clearTimeout(timeout)
        console.log('✅ Socket successfully connected')
        resolve()
      })

      // Listen for connection errors
      s.once('connect_error', (error: any) => {
        isInitializing = false
        clearTimeout(timeout)
        console.error('❌ Socket connection error:', error.message)
        reject(error)
      })

      // Initiate connection
      console.log('🔌 Initiating socket connection...')
      s.connect()
    } catch (error) {
      isInitializing = false
      reject(error)
    }
  })
}

/**
 * Disconnect socket
 * Call on logout
 */
export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect()
    console.log('✅ Socket disconnected')
  }
  socket = null
  isInitializing = false
}

/**
 * Listen to socket events
 * Returns unsubscribe function
 */
export function onSocketEvent(
  event: string,
  callback: (data: any) => void
): () => void {
  const s = getSocket()

  s.on(event, callback)

  // Return unsubscribe function
  return () => {
    s.off(event, callback)
  }
}

/**
 * Emit socket event
 */
export function emitSocket(event: string, data?: any): void {
  const s = getSocket()

  if (!s.connected) {
    console.warn('Socket not connected. Cannot emit:', event)
    return
  }

  s.emit(event, data)
}

/**
 * Emit socket event with acknowledgment
 */
export function emitSocketWithAck(
  event: string,
  data?: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const s = getSocket()

    if (!s.connected) {
      reject(new Error('Socket not connected'))
      return
    }

    const timeout = setTimeout(() => {
      reject(new Error(`No acknowledgment for event: ${event}`))
    }, 5000)

    s.emit(event, data, (response: any) => {
      clearTimeout(timeout)
      resolve(response)
    })
  })
}

/**
 * Get socket connection status
 */
export function getSocketStatus(): {
  connected: boolean
  socketId: string | null
} {
  const s = getSocket()
  return {
    connected: s.connected,
    socketId: s.id || null,
  }
}

/**
 * Reset socket (for testing/logout)
 */
export function resetSocket(): void {
  disconnectSocket()
  socket = null
  isInitializing = false
}