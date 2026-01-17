const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')

let io

// ============================================================
// Initialize Socket.IO Server
// ============================================================
function initSocket(server) {
  const FRONTEND_URL = process.env.CLIENT_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

  console.log('🔌 Initializing Socket.IO with CORS origin:', FRONTEND_URL)

  io = new Server(server, {
    cors: {
      origin: FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // ✅ Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token

    console.log('🔐 Socket auth attempt:', {
      socketId: socket.id,
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
    })

    if (!token) {
      console.warn('❌ No token provided in socket handshake')
      return next(new Error('Authentication error: Token required'))
    }

    try {
      const user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')

      console.log('✅ Token verified for user:', user.councilId)

      socket.user = user
      socket.userId = user.userId
      socket.councilId = user.councilId
      socket.role = user.role

      next()
    } catch (err) {
      console.error('❌ Token verification failed:', err.message)
      next(new Error(`Authentication error: ${err.message}`))
    }
  })

  // ✅ Connection handler
  io.on('connection', (socket) => {
    console.log('✅ Socket connected:', {
      socketId: socket.id,
      userId: socket.userId,
      councilId: socket.councilId,
      role: socket.role,
    })

    // Allow clients to join specific rooms
    socket.on('join', ({ role, committee }) => {
      if (role) socket.join(`role:${role}`)
      if (committee) socket.join(`committee:${committee}`)

      console.log(`👥 User ${socket.councilId} joined rooms:`, {
        role: role || 'none',
        committee: committee || 'none',
      })
    })

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected:', socket.id)
    })

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error)
    })
  })

  console.log('✅ Socket.IO initialized successfully')
  return io
}

// ============================================================
// Get Socket.IO Instance
// ============================================================
function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized')
  }
  return io
}

// ============================================================
// EMIT FUNCTIONS - Frontend Listeners
// ============================================================

/**
 * Emit attendance update
 * Frontend listener: onSocketEvent('attendance:update', ...)
 */
function emitAttendanceUpdate(data) {
  if (!io) {
    console.error('❌ Socket.IO not initialized for attendance update')
    return
  }

  console.log('📤 Emitting attendance:update ->', {
    type: data.type,
    userId: data.userId,
    name: data.name,
  })

  io.emit('attendance:update', data)
}

/**
 * Emit leave update
 * Frontend listener: onSocketEvent('leave_update', ...)
 */
function emitLeaveUpdate(payload) {
  if (!io) {
    console.error('❌ Socket.IO not initialized for leave update')
    return
  }

  console.log('📤 Emitting leave_update ->', {
    type: payload.type,
    leaveId: payload.leaveId,
  })

  if (payload.committee) {
    io.to(`committee:${payload.committee}`).emit('leave_update', payload)
  } else {
    io.emit('leave_update', payload)
  }
}

/**
 * Emit leave approved event
 * Frontend listener: onSocketEvent('leave:approved', ...)
 */
function emitLeaveApproved(data) {
  if (!io) {
    console.error('❌ Socket.IO not initialized for leave approved')
    return
  }

  console.log('📤 Emitting leave:approved ->', {
    leaveId: data.leaveId,
    userId: data.userId,
  })

  io.emit('leave:approved', data)
}

/**
 * Emit leave rejected event
 * Frontend listener: onSocketEvent('leave:rejected', ...)
 */
function emitLeaveRejected(data) {
  if (!io) {
    console.error('❌ Socket.IO not initialized for leave rejected')
    return
  }

  console.log('📤 Emitting leave:rejected ->', {
    leaveId: data.leaveId,
    reason: data.reason,
  })

  io.emit('leave:rejected', data)
}

/**
 * Emit report update event
 * Frontend listener: onSocketEvent('report:updated', ...)
 */
function emitReportUpdate(data) {
  if (!io) {
    console.error('❌ Socket.IO not initialized for report update')
    return
  }

  console.log('📤 Emitting report:updated ->', {
    reportId: data.reportId,
    userId: data.userId,
    status: data.status,
  })

  io.emit('report:updated', data)
}

/**
 * Emit report reviewed event
 * Frontend listener: onSocketEvent('report:reviewed', ...)
 */
function emitReportReviewed(data) {
  if (!io) {
    console.error('❌ Socket.IO not initialized for report reviewed')
    return
  }

  console.log('📤 Emitting report:reviewed ->', {
    reportId: data.reportId,
    reviewedBy: data.reviewedBy,
  })

  io.emit('report:reviewed', data)
}

/**
 * Emit profile update event
 * Frontend listener: onSocketEvent('profile_updated', ...)
 */
function emitProfileUpdate(data) {
  if (!io) {
    console.error('❌ Socket.IO not initialized for profile update')
    return
  }

  console.log('📤 Emitting profile_updated ->', {
    councilId: data.councilId,
    userId: data.userId,
  })

  io.emit('profile_updated', data)
}

/**
 * Emit to specific user
 * Frontend listener: onSocketEvent('notification', ...)
 */
function emitNotification(userId, data) {
  if (!io) {
    console.error('❌ Socket.IO not initialized for notification')
    return
  }

  console.log('📤 Emitting notification to user:', userId)
  io.to(`user:${userId}`).emit('notification', data)
}

/**
 * Emit to specific committee
 * Frontend listener: onSocketEvent('committee:announcement', ...)
 */
function emitCommitteeAnnouncement(committee, data) {
  if (!io) {
    console.error('❌ Socket.IO not initialized for committee announcement')
    return
  }

  console.log('📤 Emitting to committee:', committee, data)
  io.to(`committee:${committee}`).emit('committee:announcement', data)
}

/**
 * Emit to specific role
 * Frontend listener: onSocketEvent('role:notification', ...)
 */
function emitRoleNotification(role, data) {
  if (!io) {
    console.error('❌ Socket.IO not initialized for role notification')
    return
  }

  console.log('📤 Emitting to role:', role)
  io.to(`role:${role}`).emit('role:notification', data)
}

/**
 * Emit login update
 * Frontend listener: onSocketEvent('login:update', ...)
 */
function emitLoginUpdate(payload) {
  if (!io) {
    console.error('❌ Socket.IO not initialized for login update')
    return
  }

  console.log('📤 Emitting login:update ->', {
    councilId: payload.council_id,
  })

  io.emit('login:update', payload)
}

/**
 * Emit system log
 * Frontend listener: onSocketEvent('system:log', ...)
 */
function emitSystemLog(payload) {
  if (!io) {
    console.error('❌ Socket.IO not initialized for system log')
    return
  }

  console.log('📤 Emitting system:log ->', {
    action: payload.action,
  })

  io.emit('system:log', payload)
}

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  initSocket,
  getIO,
  // Attendance
  emitAttendanceUpdate,
  // Leave
  emitLeaveUpdate,
  emitLeaveApproved,
  emitLeaveRejected,
  // Reports
  emitReportUpdate,
  emitReportReviewed,
  // Profile
  emitProfileUpdate,
  // Notifications
  emitNotification,
  emitCommitteeAnnouncement,
  emitRoleNotification,
  // System
  emitLoginUpdate,
  emitSystemLog,
}