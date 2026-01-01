'use client'

import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const API = 'http://localhost:5005'

export default function NotificationBell() {
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    const socket = io(API)

    socket.on('leave_update', (payload) => {
      setCount((c) => c + 1)
      setNotifications((prev) => [
        {
          id: Date.now(),
          message: `Leave ${payload.type.replaceAll('_', ' ')}`,
          time: new Date().toLocaleTimeString()
        },
        ...prev
      ])
    })

    socket.on('attendance:update', (payload) => {
      setCount((c) => c + 1)
      setNotifications((prev) => [
        {
          id: Date.now(),
          message: `${payload.name} punched ${payload.type === 'punch_in' ? 'IN' : 'OUT'}`,
          time: new Date().toLocaleTimeString()
        },
        ...prev
      ])
    })

    return () => socket.disconnect()
  }, [])

  const toggle = () => {
    setOpen(!open)
    setCount(0)
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative p-2 rounded-full hover:bg-slate-100"
      >
        <Bell className="w-6 h-6 text-slate-700" />

        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white
                           text-xs rounded-full px-1.5">
            {count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute right-0 mt-3 w-80 bg-white border shadow-lg
                       rounded-xl z-50"
          >
            <div className="p-3 border-b font-semibold">
              Notifications
            </div>

            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">
                No new notifications
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="px-4 py-2 text-sm border-b last:border-none"
                  >
                    <p>{n.message}</p>
                    <span className="text-xs text-slate-400">
                      {n.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
