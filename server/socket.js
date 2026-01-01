const { Server } = require('socket.io')

let io

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id)

    /**
     * Join room by committee or role
     * frontend emits after login
     */
    socket.on('join', ({ role, committee }) => {
      if (role) socket.join(`role:${role}`)
      if (committee) socket.join(`committee:${committee}`)

      console.log(
        `👥 Joined rooms → role:${role} committee:${committee}`
      )
    })

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected:', socket.id)
    })
  })

  return io
}

/* ================= EMITTERS ================= */

function emitAttendanceUpdate(data) {
  if (!io) {
    console.warn('⚠️ Socket not initialized')
    return
  }

  // send to all OR specific committee
  io.emit('attendance:update', data)
}

function emitLeaveUpdate(payload) {
  if (!io) {
    console.warn('⚠️ Socket not initialized')
    return
  }

  /**
   * payload should contain committee_name
   * Example:
   * { type, leaveId, committee, userId }
   */

  if (payload.committee) {
    io.to(`committee:${payload.committee}`).emit(
      'leave_update',
      payload
    )
  } else {
    io.emit('leave_update', payload)
  }
}

module.exports = {
  initSocket,
  emitAttendanceUpdate,
  emitLeaveUpdate,
}
