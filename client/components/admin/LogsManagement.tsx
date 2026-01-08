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

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    const socket: Socket = io(API)
    socket.on('log:update', (log: LogRow) => {
      if (log.action.toLowerCase().includes(activeTab)) {
        setLogs(prev => [log, ...prev])
      }
    })
    return () => { socket.disconnect() }
  }, [activeTab])

  const downloadPdf = async () => {
    if (!token) return
    const params = new URLSearchParams({ type: activeTab, user: userFilter, action: actionFilter, startDate, endDate })
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
    <div className="min-h-screen bg-[#F9FAFB] p-3 sm:p-6 md:p-8 font-sans text-slate-900">
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center justify-center lg:justify-start gap-3">
              <Activity className="text-indigo-600 shrink-0" />
              Audit System Log
            </h1>
            <p className="text-slate-500 text-sm md:text-base mt-1">Real-time system monitoring and event logs.</p>
          </div>
          
          <button
            onClick={downloadPdf}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-semibold hover:bg-slate-50 transition-all shadow-sm active:scale-95 w-full lg:w-auto"
          >
            <Download size={18} />
            <span className="text-sm">Export Audit Log</span>
          </button>
        </div>

        {/* SUMMARY TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Total Events', val: summaryStats.total, color: 'text-indigo-600' },
            { label: 'Logged Today', val: summaryStats.today, color: 'text-emerald-600' },
            { label: 'Recent (7d)', val: summaryStats.week, color: 'text-blue-600' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className={`text-2xl md:text-3xl font-black ${stat.color} mt-1`}>{stat.val}</p>
            </div>
          ))}
        </div>

        {/* MAIN LOG PANEL */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          
          {/* TABS - Scrollable on mobile */}
          <div className="flex overflow-x-auto bg-slate-50/50 border-b border-slate-200 no-scrollbar scroll-smooth">
            <div className="flex min-w-max">
              {logTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 md:px-6 py-4 text-xs md:text-sm font-bold transition-all whitespace-nowrap border-b-2 ${
                    activeTab === tab.id 
                    ? 'border-indigo-600 text-indigo-600 bg-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-6">
            {/* SEARCH & FILTERS - Multi-breakpoint Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  placeholder="Council ID..."
                  value={userFilter}
                  onChange={e => setUserFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="relative">
                <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  placeholder="Action..."
                  value={actionFilter}
                  onChange={e => setActionFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="relative">
                 <input
                  type="date"
                  title="Start Date"
                  aria-label="Start Date"
                  placeholder="Start Date"
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="relative">
                <input
                  type="date"
                  title="End Date"
                  aria-label="End Date"
                  placeholder="End Date"
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <button
                onClick={fetchLogs}
                className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 sm:col-span-2 lg:col-span-1 shadow-md shadow-indigo-100"
              >
                <Filter size={16} /> Apply Filters
              </button>
            </div>

            {/* TABLE CONTAINER - Horizontal Scroll Protection */}
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3.5 text-[10px] md:text-xs font-black uppercase text-slate-500 tracking-wider">User</th>
                      <th className="px-4 py-3.5 text-[10px] md:text-xs font-black uppercase text-slate-500 tracking-wider">Action</th>
                      <th className="px-4 py-3.5 text-[10px] md:text-xs font-black uppercase text-slate-500 tracking-wider">Timestamp</th>
                      <th className="px-4 py-3.5 text-[10px] md:text-xs font-black uppercase text-slate-500 tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <AnimatePresence mode='popLayout'>
                      {loading ? (
                        <tr><td colSpan={4} className="p-12 text-center text-slate-400 animate-pulse">Synchronizing logs...</td></tr>
                      ) : logs.length === 0 ? (
                        <tr><td colSpan={4} className="p-12 text-center text-slate-400">No events found in this category.</td></tr>
                      ) : (
                        logs.map((log) => (
                          <motion.tr 
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            key={log.id} 
                            className="hover:bg-indigo-50/40 transition-colors group"
                          >
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600 shrink-0">
                                  {log.user ? log.user.substring(0,2).toUpperCase() : 'S'}
                                </div>
                                <span className="text-sm font-semibold text-slate-700">{log.user || 'SYSTEM'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100 uppercase tracking-tighter">
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex flex-col leading-tight">
                                <span className="text-xs md:text-sm font-medium text-slate-600">{new Date(log.created_at).toLocaleDateString()}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-between gap-4 max-w-xs md:max-w-md">
                                <span className="text-xs md:text-sm text-slate-500 truncate">{log.description}</span>
                                <Info size={14} className="text-slate-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity cursor-help shrink-0" />
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