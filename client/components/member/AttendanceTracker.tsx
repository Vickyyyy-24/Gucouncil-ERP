'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { 
  Calendar, 
  Clock, 
  ArrowUpRight, 
  History, 
  TrendingUp, 
  BarChart3, 
  LogIn, 
  LogOut,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { getSocket } from '@/lib/socket'
import { apiClient } from '@/lib/api'

/* ================= CHART SETUP ================= */
ChartJS.register(
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler
)

/* ================= TYPES ================= */
type AttendanceRecord = {
  date: string
  punch_in?: string
  punch_out?: string
  total_hours?: number
}

export default function AttendanceTracker() {
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAttendanceData = async () => {
    try {
  const data = await apiClient.getMyAttendance()
  setAttendanceHistory(data)
    } catch {
      toast.error('Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttendanceData()
    const socket = getSocket()
    socket.connect()
    socket.on('attendance:update', fetchAttendanceData)
    return () => {
      socket.off('attendance:update')
      socket.disconnect()
    }
  }, [])

  const totalDays = attendanceHistory.length
  const totalHours = Math.round(attendanceHistory.reduce((sum, r) => sum + (r.total_hours || 0), 0))
  const avgHours = totalDays > 0 ? (totalHours / totalDays).toFixed(1) : 0
  

  /* ================= CHART CONFIGS ================= */
  const dailyChartData = {
    labels: attendanceHistory.map(r => new Date(r.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })),
    datasets: [
      {
        label: 'Working Hours',
        data: attendanceHistory.map(r => r.total_hours || 0),
        borderColor: '#10b981',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  }

  /* ================= LOADING UI ================= */
  if (loading) return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="h-20 sm:h-24 lg:h-32 bg-slate-100 animate-pulse rounded-2xl sm:rounded-3xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="h-40 sm:h-48 lg:h-64 bg-slate-50 animate-pulse rounded-2xl sm:rounded-3xl" />
        <div className="h-40 sm:h-48 lg:h-64 bg-slate-50 animate-pulse rounded-2xl sm:rounded-3xl" />
        <div className="h-40 sm:h-48 lg:h-64 bg-slate-50 animate-pulse rounded-2xl sm:rounded-3xl" />
      </div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8 bg-[#fcfdfd] min-h-screen"
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">Attendance Dashboard</h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em]">Council Presence Tracking 2025</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 bg-emerald-50 px-3 sm:px-4 py-2 rounded-xl sm:rounded-2xl border border-emerald-100 self-start sm:self-auto">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
          <span className="text-emerald-900 font-bold text-xs sm:text-sm">Dec 2025 Cycle</span>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <StatCard 
          title="Total Presence" 
          value={totalDays} 
          subtitle="Days logged" 
          icon={Calendar} 
          color="emerald" 
        />
        <StatCard 
          title="Total Contribution" 
          value={totalHours} 
          unit="Hrs"
          subtitle="Total time logged" 
          icon={Clock} 
          color="amber" 
        />
        <StatCard 
          title="Daily Average" 
          value={avgHours} 
          unit="Hrs"
          subtitle="Hours per day" 
          icon={TrendingUp} 
          color="blue" 
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        {/* LOGS TABLE (LEFT) */}
        <div className="xl:col-span-2 space-y-6 sm:space-y-8">
          <section className="bg-white rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-slate-50 flex items-center gap-2 sm:gap-3">
              <History className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              <h3 className="text-base sm:text-lg font-bold text-emerald-950">Activity Logs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[640px]">
                <thead className="bg-slate-50/50">
                  <tr className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider sm:tracking-widest">
                    <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">Date</th>
                    <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">Punch In</th>
                    <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">Punch Out</th>
                    <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-center">Duration</th>
                    <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {attendanceHistory.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5">
                        <p className="text-xs sm:text-sm font-bold text-emerald-950 whitespace-nowrap">{new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </td>
                      <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600">
                          <LogIn className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{r.punch_in ? new Date(r.punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600">
                          <LogOut className="w-3 h-3 text-amber-500 shrink-0" />
                          <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{r.punch_out ? new Date(r.punch_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-center">
                        <span className="inline-block px-2 sm:px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs font-black rounded-lg whitespace-nowrap">
                          {r.total_hours || 0}h
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-right">
                        <StatusBadge status={r.punch_out ? 'Completed' : r.punch_in ? 'In Progress' : 'Absent'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* CHARTS (RIGHT) */}
        <div className="space-y-6 sm:space-y-8">
          <section className="bg-white p-5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div className="flex items-center gap-2 sm:gap-3">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                <h3 className="text-base sm:text-lg font-bold text-emerald-950">Daily Trends</h3>
              </div>
            </div>
            <div className="h-[250px] sm:h-[280px] lg:h-[300px]">
              <Line
                data={dailyChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { 
                      grid: { display: false }, 
                      border: { display: false },
                      ticks: { font: { size: 10 } }
                    },
                    x: { 
                      grid: { display: false }, 
                      border: { display: false },
                      ticks: { font: { size: 10 } }
                    }
                  }
                }}
              />
            </div>
          </section>

          <div className="bg-emerald-950 p-5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] text-white shadow-xl shadow-emerald-900/20">
            <h4 className="text-amber-400 font-black uppercase text-[9px] sm:text-[10px] tracking-wider sm:tracking-widest mb-2">Pro Tip</h4>
            <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed">
              Consistently logging <span className="text-white font-bold">8+ hours</span> daily improves your Council standing and contribution score.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ================= HELPER COMPONENTS ================= */

function StatCard({ title, value, unit, subtitle, icon: Icon, color }: any) {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
  }
  
  return (
    <div className="bg-white p-5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] border border-slate-100 shadow-sm flex items-start gap-4 sm:gap-5 lg:gap-6 hover:translate-y-[-2px] sm:hover:translate-y-[-4px] transition-all duration-300">
      <div className={`p-3 sm:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl ${colors[color]} shrink-0`}>
        <Icon className="w-5 h-5 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-black text-emerald-950 leading-none">{value}</span>
          {unit && <span className="text-xs sm:text-sm font-bold text-slate-400">{unit}</span>}
        </div>
        <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-1.5 sm:mt-2">{subtitle}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'In Progress': 'bg-amber-100 text-amber-700 border-amber-200',
    'Absent': 'bg-slate-100 text-slate-600 border-slate-200',
  }
  const icons: any = {
    'Completed': CheckCircle2,
    'In Progress': Clock,
    'Absent': AlertCircle,
  }
  const Icon = icons[status]

  return (
    <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border ${styles[status]} whitespace-nowrap`}>
      <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
      <span className="hidden xs:inline">{status}</span>
      <span className="xs:hidden">{status === 'Completed' ? 'Done' : status === 'In Progress' ? 'Active' : 'N/A'}</span>
    </span>
  )
}