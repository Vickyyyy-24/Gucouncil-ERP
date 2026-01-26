'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSocket } from '@/lib/socket'
import { toast } from 'react-toastify'
import { 
  Users, 
  Calendar, 
  Download, 
  Filter, 
  RefreshCw, 
  UserCheck, 
  Clock, 
  TrendingUp,
  LayoutGrid,
  ShieldCheck,
  Database,
  Loader2,
  CalendarDays
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
      const { apiClient } = await import('@/lib/api')
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
      const { apiClient } = await import('@/lib/api')
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
    <div className="min-h-screen bg-[#0f0f0f] text-white p-4 md:p-6 font-sans selection:bg-orange-500 selection:text-[#0f0f0f] overflow-x-hidden">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-7xl mx-auto space-y-10"
      >
        {/* HEADER SECTION */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-[#333333] pb-8">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white uppercase">
              ATTENDANCE <span className="text-transparent bg-clip-text bg-orange-500">ANALYTICS</span>
            </h1>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-orange-500 font-bold text-xs uppercase tracking-[0.2em] font-mono"
            >
              {/* <span className="w-2 h-2 rounded-full bg-[#D9F837]"></span> */}
              Admin Control Center
            </motion.div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={downloadPdf}
              className="flex items-center gap-2 bg-transparent border border-[#333333] text-[#888888] px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs hover:border-orange-500 hover:text-white transition-all active:scale-95"
            >
              <Download size={16} /> Export PDF
            </button>
            <button
              type="button"
              onClick={fetchReport}
              disabled={loading}
              className="flex items-center gap-2 bg-orange-500 text-[#0f0f0f] px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-xs hover:shadow] transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none group"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />}
              Generate Report
            </button>
          </div>
        </header>

        {/* STATS OVERVIEW */}
        <AnimatePresence>
          {stats && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="grid grid-cols-1 sm:grid-cols-3 gap-6 "
            >
              <StatCard label="Total Org Hours" value={stats.totalHours} suffix="h" icon={Clock} />
              <StatCard label="Avg Attendance" value={stats.avgAttendance} suffix="d" icon={TrendingUp} />
              <StatCard label="Active Units" value={stats.totalCommittees} suffix="" icon={LayoutGrid} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* FILTERS CARD */}
        <div className="bg-[#1e1e1e] border border-[#333333] p-6 md:p-8 rounded-[16px] shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FilterField label="Committees" icon={Filter}>
              <select
                title="Committees"
                aria-label="Committees"
                value={selectedCommittee}
                onChange={e => setSelectedCommittee(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-[#333333] text-white rounded-xl px-5 py-4 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer appearance-none transition-all font-medium"
              >
                <option value="all">All Committees</option>
                {committees.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
              </select>
            </FilterField>

            <FilterField label="Start Cycle" icon={Calendar}>
              <div className="relative">
                <input
                  type="date"
                  title="Start Cycle"
                  aria-label="Start Cycle"
                  value={dateRange.start}
                  onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-[#333333] text-white rounded-xl px-5 py-4 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all font-mono [color-scheme:dark]"
                />
              </div>
            </FilterField>

            <FilterField label="End Cycle" icon={CalendarDays}>
              <input
                type="date"
                title="End Cycle"
                aria-label="End Cycle"
                value={dateRange.end}
                onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))}
                className="w-full bg-[#0f0f0f] border border-[#333333] text-white rounded-xl px-5 py-4 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all font-mono [color-scheme:dark]"
              />
            </FilterField>
          </div>
        </div>

        {/* DATA RENDERING */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-32 space-y-4">
              <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
              <p className="text-[#888888] font-mono uppercase tracking-widest text-xs">Processing Data...</p>
            </motion.div>
          ) : data.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-32 bg-[#1e1e1e] border border-dashed border-[#333333] rounded-[16px]">
              <Database className="mx-auto text-[#333333] mb-6" size={64} />
              <p className="text-white font-bold uppercase tracking-widest">No Manifest Loaded</p>
              <p className="text-[#888888] text-sm mt-2 font-mono">Configure unit scope and date cycles above.</p>
            </motion.div>
          ) : (
            <div className="space-y-8 pb-20">
              {data.map((committee, idx) => (
                <motion.div
                  key={committee.committee}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-[#1e1e1e] border border-[#333333] rounded-[16px] overflow-hidden"
                >
                  <div className="px-8 py-6 border-b border-[#333333] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#1e1e1e]">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-[#0f0f0f] border border-[#333333] rounded-xl flex items-center justify-center text-orange-500">
                        <Users size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">{committee.committee}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          <span className="text-xs font-mono text-[#888888] uppercase tracking-wider">
                            Head: <span className="text-white">{committee.head || 'UNASSIGNED'}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#888888] bg-[#0f0f0f] border border-[#333333] px-3 py-1 rounded-full">
                      {committee.members.length} MEMBERS
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-[#252525] border-b border-[#333333]">
                          <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#888888]">Subject Name</th>
                          <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#888888] text-center">Sessions</th>
                          <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#888888] text-center">Total Hours</th>
                          <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#888888] text-center">Weekly Avg</th>
                          <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#888888] text-center">Daily Avg</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#333333]">
                        {committee.members.map((m, i) => (
                          <tr key={i} className="hover:bg-[#2a2a2a] transition-colors group">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#333333] flex items-center justify-center text-[#888888] group-hover:bg-orange-500 group-hover:text-black transition-colors">
                                  <UserCheck size={14} />
                                </div>
                                <span className="text-white font-bold text-sm tracking-tight">{m.name}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <span className="inline-block border border-orange-500/30 bg-orange-500/5 text-orange-500 px-3 py-1 rounded-full text-xs font-mono font-bold">
                                {m.attendance} Days
                              </span>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <span className="text-white font-mono font-bold text-lg">{m.totalHours}<span className="text-xs text-[#888888] ml-1">HRS</span></span>
                            </td>
                            <td className="px-8 py-5 text-center text-[#cccccc] font-mono text-sm">{m.weeklyAvg}h</td>
                            <td className="px-8 py-5 text-center text-[#cccccc] font-mono text-sm">{m.dailyAvg}h</td>
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

function StatCard({ label, value, suffix, icon: Icon }: any) {
  return (
    <div className="bg-[#1e1e1e] border border-[#333333] p-6 rounded-[16px] flex items-center gap-5 transition-all hover:border-orange-500/50 shadow-lg group">
      <div className="p-3 rounded-xl bg-[#0f0f0f] border border-[#333333] group-hover:bg-orange-500 group-hover:text-[#0f0f0f] group-hover:border-orange-500 transition-colors text-[#888888]">
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#888888] mb-1">{label}</p>
        <p className="text-3xl font-bold tracking-tight text-white font-mono">
          {value}<span className="text-lg text-[#555] ml-1">{suffix}</span>
        </p>
      </div>
    </div>
  )
}

function FilterField({ label, icon: Icon, children }: any) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#888888] flex items-center gap-2 px-1">
        <Icon size={12} className="text-orange-500" /> {label}
      </label>
      <div className="relative group">
        {children}
      </div>
    </div>
  )
}