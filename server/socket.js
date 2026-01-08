const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')

let io

function initSocket(server) {
  const FRONTEND_URL = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

  io = new Server(server, {
    cors: {
      origin: FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Authentication error'))
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
      socket.user = user
      next()
    } catch (err) {
      next(new Error('Authentication error'))
    }
  })

  io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id, 'user:', socket.user?.councilId)

    socket.on('join', ({ role, committee }) => {
      if (role) socket.join(`role:${role}`)
      if (committee) socket.join(`committee:${committee}`)

      console.log(
        `👥 Joined rooms → role:${role || '-'} committee:${committee || '-'}`
      )
    })

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected:', socket.id)
    })
  })

  return io
}

/* ================= EMITTERS ================= */

/**
 * Attendance updates
 * → visible to GS + Admin + Committee Head
 */
function emitAttendanceUpdate(data) {
  if (!io) return

  io.emit('attendance:update', data)
}

/**
 * Leave updates
 * → committee specific
 */
function emitLeaveUpdate(payload) {
  if (!io) return

  const event = 'leave:update'

  if (payload.committee) {
    io.to(`committee:${payload.committee}`).emit(event, payload)
  } else {
    io.emit(event, payload)
  }
}

/**
 * System logs (optional)
 */
function emitSystemLog(payload) {
  if (!io) return
  io.emit('system:log', payload)
}
emitSystemLog({
  action: 'LOGIN',
  description: 'User logged in',
  created_at: new Date()
})

module.exports = {
  initSocket,
  emitAttendanceUpdate,
  emitLeaveUpdate,
  emitSystemLog,
}
