'use client'

import { io, Socket } from 'socket.io-client'

const API =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005'

let socket: Socket | null = null

export function getSocket() {
  if (!socket) {
    socket = io(API, {
      auth: {
        token: typeof window !== 'undefined' ? localStorage.getItem('token') : null
      },
      transports: ['websocket'],      // ✅ stable transport
      autoConnect: false,             // ✅ manual control
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
  }
  return socket
}

/**
 * ✅ SAFE CONNECT
 * Call ONLY after login is confirmed
 */
export function connectSocket() {
  const s = getSocket()

  if (!s.connected) {
    s.connect()
  }
}

/**
 * ✅ SAFE DISCONNECT
 * Call on logout
 */
export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect()
  }
}
