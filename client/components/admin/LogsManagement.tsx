'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { io, Socket } from 'socket.io-client'
import { toast } from 'react-toastify'
import { 
  Activity, 
  Download, 
  Calendar, 
  ShieldCheck, 
  Clock, 
  FileText, 
  Filter, 
  Server,
  User,
  Info,
  Terminal
} from 'lucide-react'

const API = 'http://localhost:5005'

type LogRow = {
  id: number
  user: string | null
  action: string
  description: string
  created_at: string
}

export default function LogsManagement() {
  const [activeTab, setActiveTab] = useState('attendance')
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)

  /* ================= FILTERS ================= */
  const [userFilter, setUserFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const logTabs = [
    { id: 'attendance', label: 'Attendance', icon: <Clock size={16} /> },
    { id: 'reports', label: 'Reports', icon: <FileText size={16} /> },
    { id: 'leaves', label: 'Leaves', icon: <Calendar size={16} /> },
    { id: 'login', label: 'Auth', icon: <ShieldCheck size={16} /> },
    { id: 'system', label: 'System', icon: <Server size={16} /> }
  ]

  const fetchLogs = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const params = new URLSearchParams({
        type: activeTab,
        user: userFilter,
        action: actionFilter,
        startDate,
        endDate
      })

      const { apiClient, ApiError } = await import('@/lib/api')
      try {
        const data = await apiClient.get(`/api/admin/logs?${params.toString()}`)
        setLogs(Array.isArray(data) ? data : [])
      } catch (err: any) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          try { localStorage.removeItem('token') } catch {}
          toast.error('Unauthorized — please login')
          return
        }
        throw err
      }
    } catch {
      toast.error('Failed to load logs')
    } finally {
      setLoading(false)
    }
  }, [activeTab, userFilter, actionFilter, startDate, endDate, token])

  // ✅ Initial load on mount
  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // ✅ Reload logs when tab changes
  useEffect(() => {
    setLogs([])
    fetchLogs()
  }, [activeTab])

  // ✅ Socket.IO Connection with Authentication
  useEffect(() => {
    if (!token) {
      console.warn('⚠️ No token available, skipping Socket.IO connection')
      return
    }

    console.log('🔌 Connecting to Socket.IO at', API)

    const socket: Socket = io(API, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id)
      setSocketConnected(true)
      toast.success('Real-time updates enabled', { autoClose: 2000 })

      socket.emit('join', {
        role: 'admin',
        committee: null
      })
    })

    socket.on('connect_error', (error: any) => {
      console.error('❌ Socket connection error:', error.message)
      setSocketConnected(false)
      toast.error('Connection issue: ' + error.message, { autoClose: 3000 })
    })

    socket.on('disconnect', (reason: string) => {
      console.log('⚠️ Socket disconnected:', reason)
      setSocketConnected(false)
    })

    socket.on('attendance:update', (data: any) => {
      console.log('📊 Attendance update received:', data)
      
      if (activeTab === 'attendance') {
        const logRow: LogRow = {
          id: data.attendance?.id || Date.now(),
          user: data.councilId || null,
          action: data.type === 'punch_in' ? 'Punch In' : 'Punch Out',
          description: `${data.name || 'Unknown'} (${data.committee || 'N/A'})`,
          created_at: data.timestamp || new Date().toISOString()
        }
        setLogs(prev => [logRow, ...prev])
      }
    })

    socket.on('leave:update', (data: any) => {
      console.log('📋 Leave update received:', data)
      
      if (activeTab === 'leaves') {
        const logRow: LogRow = {
          id: data.leaveId || Date.now(),
          user: null,
          action: 
            data.type === 'new_leave' ? 'Applied' :
            data.type === 'approved_by_head' ? 'Head Approved' :
            data.type === 'approved' ? 'GS Approved' : 'Updated',
          description: `Leave Application - ${data.type}`,
          created_at: data.timestamp || new Date().toISOString()
        }
        setLogs(prev => [logRow, ...prev])
      }
    })

    socket.on('login:update', (data: any) => {
      console.log('🔐 Login update received:', data)
      
      if (activeTab === 'login') {
        const logRow: LogRow = {
          id: data.id || Date.now(),
          user: data.council_id || null,
          action: 'Login',
          description: data.ip_address || 'Unknown IP',
          created_at: data.login_time || new Date().toISOString()
        }
        setLogs(prev => [logRow, ...prev])
      }
    })

    socket.on('system:log', (data: any) => {
      console.log('⚙️ System log received:', data)
      
      if (activeTab === 'system') {
        const logRow: LogRow = {
          id: data.id || Date.now(),
          user: null,
          action: data.action || 'System Event',
          description: data.description || 'System update',
          created_at: data.created_at || new Date().toISOString()
        }
        setLogs(prev => [logRow, ...prev])
      }
    })

    return () => {
      console.log('🧹 Cleaning up Socket.IO listeners')
      socket.off('connect')
      socket.off('disconnect')
      socket.off('connect_error')
      socket.off('attendance:update')
      socket.off('leave:update')
      socket.off('login:update')
      socket.off('system:log')
      socket.disconnect()
    }
  }, [token, activeTab])

  const downloadPdf = async () => {
    if (!token) return
    const params = new URLSearchParams({ 
      type: activeTab, 
      user: userFilter, 
      action: actionFilter, 
      startDate, 
      endDate 
    })
    try {
      const { apiClient, ApiError } = await import('@/lib/api')
      try {
        const resp = await apiClient.postRaw(`/api/admin/logs/pdf?${params.toString()}`)
        if (!resp.ok) throw new Error('Export failed')
        const blob = await resp.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${activeTab}-audit-log.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
      } catch (err: any) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          try { localStorage.removeItem('token') } catch {}
          toast.error('Unauthorized — please login')
          return
        }
        throw err
      }
    } catch {
      toast.error('PDF export failed')
    }
  }

  const summaryStats = useMemo(() => ({
    total: logs.length,
    today: logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length,
    week: logs.filter(l => Date.now() - new Date(l.created_at).getTime() < 7 * 86400000).length
  }), [logs])

  return (
    <div className="min-h-screen bg-[#1A1A1A] p-3 sm:p-6 md:p-8 font-sans text-white">
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tight flex items-center justify-center lg:justify-start gap-3">
             <Activity className="text-indigo-500 shrink-0" /> System <span className="text-indigo-500 not-italic">Logs</span>
            </h1>
            <p className="text-gray-400 text-sm md:text-base mt-1">Real-time system monitoring and event logs.</p>
            {/* ✅ Connection Status Indicator */}
            <div className="flex items-center gap-2 mt-2 justify-center lg:justify-start">
              <motion.div 
                animate={{ scale: socketConnected ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 1, repeat: Infinity }}
                className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500' : 'bg-red-500'}`}
              ></motion.div>
              <span className="text-xs text-gray-400">
                {socketConnected ? ' Live Updates Active' : 'Polling Mode'}
              </span>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={downloadPdf}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-all shadow-lg shadow-indigo-500/30 w-full lg:w-auto"
          >
            <Download size={18} />
            <span className="text-sm">Export Audit Log</span>
          </motion.button>
        </div>

        {/* SUMMARY TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Total Events', val: summaryStats.total, color: 'text-indigo-400' },
            { label: 'Logged Today', val: summaryStats.today, color: 'text-emerald-400' },
            { label: 'Recent (7d)', val: summaryStats.week, color: 'text-blue-400' }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#252525] p-4 md:p-5 rounded-xl border border-indigo-500/10 shadow-lg hover:border-indigo-500/20 transition-all"
            >
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className={`text-2xl md:text-3xl font-black ${stat.color} mt-1`}>{stat.val}</p>
            </motion.div>
          ))}
        </div>

        {/* MAIN LOG PANEL */}
        <div className="bg-[#252525] rounded-xl shadow-2xl border border-indigo-500/10 overflow-hidden">
          
          {/* TABS - Scrollable on mobile */}
          <div className="flex overflow-x-auto bg-[#1A1A1A] border-b border-indigo-500/10 no-scrollbar scroll-smooth">
            <div className="flex min-w-max">
              {logTabs.map(tab => (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  whileHover={{ backgroundColor: 'rgba(79, 70, 229, 0.1)' }}
                  className={`flex items-center gap-2 px-5 md:px-6 py-4 text-xs md:text-sm font-bold transition-all whitespace-nowrap border-b-2 ${
                    activeTab === tab.id 
                    ? 'border-indigo-600 text-indigo-400 bg-indigo-600/5' 
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-6">
            {/* SEARCH & FILTERS - Multi-breakpoint Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  placeholder="Council ID..."
                  value={userFilter}
                  onChange={e => setUserFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-indigo-500/20 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all hover:border-indigo-500/30"
                />
              </div>
              <div className="relative">
                <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  placeholder="Action..."
                  value={actionFilter}
                  onChange={e => setActionFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-indigo-500/20 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all hover:border-indigo-500/30"
                />
              </div>
              <div className="relative">
                 <input
                  type="date"
                  title="Start Date"
                  aria-label="Start Date"
                  placeholder="Start Date"
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-indigo-500/20 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all hover:border-indigo-500/30"
                />
              </div>
              <div className="relative">
                <input
                  type="date"
                  title="End Date"
                  aria-label="End Date"
                  placeholder="End Date"
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-indigo-500/20 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all hover:border-indigo-500/30"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchLogs}
                className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 sm:col-span-2 lg:col-span-1 shadow-lg shadow-indigo-500/30"
              >
                <Filter size={16} /> Apply Filters
              </motion.button>
            </div>

            {/* TABLE CONTAINER */}
            <div className="rounded-lg border border-indigo-500/10 overflow-hidden bg-[#1A1A1A]">
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-indigo-500/30">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-indigo-600/5 border-b border-indigo-500/10">
                      <th className="px-4 py-3.5 text-[10px] md:text-xs font-black uppercase text-gray-400 tracking-wider">User</th>
                      <th className="px-4 py-3.5 text-[10px] md:text-xs font-black uppercase text-gray-400 tracking-wider">Action</th>
                      <th className="px-4 py-3.5 text-[10px] md:text-xs font-black uppercase text-gray-400 tracking-wider">Timestamp</th>
                      <th className="px-4 py-3.5 text-[10px] md:text-xs font-black uppercase text-gray-400 tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-500/5">
                    <AnimatePresence mode='popLayout'>
                      {loading ? (
                        <LoadingSkeletonCommittee />
                      ) : logs.length === 0 ? (
                        <tr><td colSpan={4} className="p-12 text-center text-gray-500">No events found in this category.</td></tr>
                      ) : (
                        logs.map((log) => (
                          <motion.tr 
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            key={log.id} 
                            className="hover:bg-indigo-500/5 transition-colors group"
                          >
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0">
                                  {log.user ? log.user.substring(0,2).toUpperCase() : 'S'}
                                </div>
                                <span className="text-sm font-semibold text-gray-300">{log.user || 'SYSTEM'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30 uppercase tracking-tighter">
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex flex-col leading-tight">
                                <span className="text-xs md:text-sm font-medium text-gray-300">{new Date(log.created_at).toLocaleDateString()}</span>
                                <span className="text-[10px] text-gray-500 font-mono">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-between gap-4 max-w-xs md:max-w-md">
                                <span className="text-xs md:text-sm text-gray-400 truncate">{log.description}</span>
                                <Info size={14} className="text-gray-600 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity cursor-help shrink-0" />
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function LoadingSkeletonCommittee() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="border-b border-indigo-500/5">
          <td className="px-4 py-4 whitespace-nowrap">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-8 h-8 rounded-full bg-indigo-500/10"
            />
          </td>
          <td className="px-4 py-4 whitespace-nowrap">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.1 }}
              className="h-5 w-20 bg-indigo-500/10 rounded"
            />
          </td>
          <td className="px-4 py-4 whitespace-nowrap">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
              className="h-5 w-32 bg-indigo-500/10 rounded"
            />
          </td>
          <td className="px-4 py-4">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
              className="h-5 w-48 bg-indigo-500/10 rounded"
            />
          </td>
        </tr>
      ))}
    </>
  )
}