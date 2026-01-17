'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSocket } from '@/lib/socket'
import { toast } from 'react-toastify'
import { 
  Users, 
  Calendar, 
  Download, 
  Filter, 
  RefreshCw, 
  FileText, 
  UserCheck, 
  Clock, 
  BarChart3,
  TrendingUp,
  LayoutGrid,
  ShieldCheck,
  Cpu,
  ArrowUpRight,
  Database,
  ChevronRight
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005'

type Member = {
  name: string
  attendance: number
  totalHours: number
  weeklyAvg: number
  dailyAvg: number
}

type CommitteeBlock = {
  committee: string
  head: string | null
  members: Member[]
}

export default function AttendanceManagement() {
  const [committees, setCommittees] = useState<string[]>([])
  const [selectedCommittee, setSelectedCommittee] = useState('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [data, setData] = useState<CommitteeBlock[]>([])
  const [loading, setLoading] = useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  /* ================= CALCULATED STATS ================= */
  const stats = useMemo(() => {
    const allMembers = data.flatMap(c => c.members)
    if (allMembers.length === 0) return null
    
    return {
      totalHours: allMembers.reduce((acc, m) => acc + m.totalHours, 0),
      avgAttendance: (allMembers.reduce((acc, m) => acc + m.attendance, 0) / allMembers.length).toFixed(1),
      totalCommittees: data.length
    }
  }, [data])

  /* ================= SOCKET LISTENER ================= */
  useEffect(() => {
    try {
      const socket = getSocket()

      if (!socket) {
        console.warn('⛔ AttendanceManagement: Socket not initialized')
        return
      }

      const handleAttendanceUpdate = () => {
        console.log('📡 Attendance update received, refreshing report')
        fetchReport()
      }

      socket.on('attendance:update', handleAttendanceUpdate)

      return () => {
        socket.off('attendance:update', handleAttendanceUpdate)
      }
    } catch (error) {
      console.error('❌ Socket listener error:', error)
    }
  }, [])

  /* ================= FETCH COMMITTEES ================= */
  useEffect(() => {
    if (!token) return
    ;(async () => {
      const { apiClient, ApiError } = await import('@/lib/api')
      try {
        const data = await apiClient.get('/api/committees')
        if (Array.isArray(data)) setCommittees(data)
        else if (data && Array.isArray((data as any).committees)) setCommittees((data as any).committees)
        else setCommittees([])
      } catch (err: any) {
        const status = err && (err.status || err?.statusCode || (err?.body && err.body.status))
        if (status === 401 || status === 403) {
          try {
            localStorage.removeItem('token')
          } catch {}
          setCommittees([])
          toast.error('Unauthorized — please login')
          return
        }
        console.error('Failed to load committees:', err)
        toast.error('Failed to load committees')
        setCommittees([])
      }
    })()
  }, [token])

  /* ================= FETCH REPORT ================= */
  const fetchReport = useCallback(async () => {
    if (!token || !dateRange.start || !dateRange.end) {
      toast.info('Please select a date range first')
      return
    }
    try {
      setLoading(true)
      const { apiClient, ApiError } = await import('@/lib/api')
      const params = `?committee=${selectedCommittee}&startDate=${dateRange.start}&endDate=${dateRange.end}`
      const resp = await apiClient.get(`/api/admin/attendance-report${params}`)
      setData(Array.isArray(resp) ? resp : [])
    } catch (err: any) {
      const status = err && (err.status || err?.statusCode || (err?.body && err.body.status))
      if (status === 401 || status === 403) {
        try {
          localStorage.removeItem('token')
        } catch {}
        toast.error('Unauthorized — please login')
        return
      }
      console.error('Failed to load report:', err)
      toast.error('Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [token, selectedCommittee, dateRange])

  /* ================= DOWNLOAD PDF ================= */
  const downloadPdf = async () => {
    if (!token || !dateRange.start || !dateRange.end) {
      toast.error('Select date range first')
      return
    }
    try {
      const res = await fetch(
        `${API}/api/admin/attendance-report/pdf?committee=${selectedCommittee}&startDate=${dateRange.start}&endDate=${dateRange.end}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error('PDF generation failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Attendance_Report_${dateRange.start}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('PDF downloaded successfully')
    } catch (err) {
      console.error('PDF download error:', err)
      toast.error('PDF generation failed')
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-12 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Background Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-blue-600/10 blur-[100px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-7xl mx-auto space-y-10"
      >
        {/* HEADER SECTION */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-[0.4em]"
            >
              <ShieldCheck className="w-4 h-4" /> 
              Admin Control Center
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white italic uppercase">
              ATTENDANCE <span className="text-indigo-500 not-italic">ANALYTICS</span>
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={downloadPdf}
              className="flex items-center gap-2 bg-slate-900/40 border border-slate-800 text-slate-300 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:border-indigo-500/50 hover:bg-slate-800 transition-all active:scale-95 shadow-2xl"
            >
              <Download size={16} /> Export PDF
            </button>
            <button
              onClick={fetchReport}
              disabled={loading}
              className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-500 hover:text-white transition-all active:scale-95 disabled:opacity-50 shadow-2xl group"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              Generate Report
            </button>
          </div>
        </header>

        {/* STATS OVERVIEW */}
        {stats && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="grid grid-cols-1 sm:grid-cols-3 gap-6"
          >
            <StatCard label="Total Org Hours" value={`${stats.totalHours}h`} icon={Clock} color="indigo" />
            <StatCard label="Avg Attendance" value={`${stats.avgAttendance}d`} icon={TrendingUp} color="emerald" />
            <StatCard label="Active Units" value={stats.totalCommittees} icon={LayoutGrid} color="sky" />
          </motion.div>
        )}

        {/* FILTERS CARD */}
        <div className="bg-slate-900/40 border border-slate-800/50 p-6 md:p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FilterField label="Committees" icon={Users}>
              <select
                title="Committees"
                aria-label="Committees"
                value={selectedCommittee}
                onChange={e => setSelectedCommittee(e.target.value)}
                className="w-full bg-black/40 border border-slate-800 text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer appearance-none transition-all font-bold"
              >
                <option value="all">All Committees</option>
                {committees.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
              </select>
            </FilterField>

            <FilterField label="Start Cycle" icon={Calendar}>
              <input
                type="date"
                title="Start Cycle"
                aria-label="Start Cycle"
                value={dateRange.start}
                onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))}
                className="w-full bg-black/40 border border-slate-800 text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold [color-scheme:dark]"
              />
            </FilterField>

            <FilterField label="End Cycle" icon={Calendar}>
              <input
                type="date"
                title="End Cycle"
                aria-label="End Cycle"
                value={dateRange.end}
                onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))}
                className="w-full bg-black/40 border border-slate-800 text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold [color-scheme:dark]"
              />
            </FilterField>
          </div>
        </div>

        {/* DATA RENDERING */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-32 space-y-4">
              <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
              <p className="text-indigo-400 font-black uppercase tracking-[0.3em] text-xs">Decrypting Records...</p>
            </motion.div>
          ) : data.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-32 bg-slate-900/20 border-2 border-dashed border-slate-800">
              <Database className="mx-auto text-slate-700 mb-6" size={64} />
              <p className="text-slate-500 font-black uppercase tracking-widest">No Manifest Loaded</p>
              <p className="text-slate-600 text-sm mt-2 font-medium">Configure unit scope and date cycles above.</p>
            </motion.div>
          ) : (
            <div className="space-y-12 pb-20">
              {data.map((committee, idx) => (
                <motion.div
                  key={committee.committee}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-slate-900/40 border border-slate-800/50 overflow-hidden backdrop-blur-md shadow-2xl"
                >
                  <div className="p-8 border-b border-slate-800/50 bg-gradient-to-r from-indigo-500/5 to-transparent flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Users className="text-white" size={24} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">{committee.committee}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Head: {committee.head || 'UNASSIGNED'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-black/20">
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Subject Name</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Sessions</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Total Hours</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Weekly Avg</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Daily Avg</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {committee.members.map((m, i) => (
                          <tr key={i} className="hover:bg-indigo-500/5 transition-colors group">
                            <td className="px-8 py-5">
                              <span className="text-white font-black uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{m.name}</span>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-full text-xs font-black uppercase">
                                {m.attendance} Days
                              </span>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <span className="text-slate-300 font-mono font-bold text-lg">{m.totalHours}<span className="text-xs text-slate-600 ml-1">HRS</span></span>
                            </td>
                            <td className="px-8 py-5 text-center text-slate-400 font-bold">{m.weeklyAvg}h</td>
                            <td className="px-8 py-5 text-center text-slate-400 font-bold">{m.dailyAvg}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

/* HELPER COMPONENTS */

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20'
  }
  return (
    <div className={`border p-8 rounded-[2.5rem] flex items-center gap-6 transition-all hover:bg-slate-900/40 shadow-2xl ${colors[color]}`}>
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
        <p className="text-3xl font-black tracking-tighter text-white uppercase italic">{value}</p>
      </div>
    </div>
  )
}

function FilterField({ label, icon: Icon, children }: any) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 px-2">
        <Icon size={12} className="text-indigo-500" /> {label}
      </label>
      <div className="relative group">
        {children}
      </div>
    </div>
  )
}