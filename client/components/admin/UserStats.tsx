'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler
} from 'chart.js'
import { 
  Users, 
  Activity, 
  Layers, 
  Percent, 
  TrendingUp, 
  ShieldCheck, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

// Register ChartJS components
ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale, 
  LinearScale, PointElement, LineElement, Filler
)

const Doughnut = dynamic(() => import('react-chartjs-2').then(m => m.Doughnut), { ssr: false })
const Line = dynamic(() => import('react-chartjs-2').then(m => m.Line), { ssr: false })

// ---------- TYPES ----------
type RecentActivity = {
  message: string
  time: string
  color: 'green' | 'blue' | 'purple' | 'orange'
}

type DailyTrend = {
  day: string
  count: number
}

type Stats = {
  totalUsers: number
  activeToday: number
  attendanceRate: number
  committeeStats: Record<string, number>
  recentActivity: RecentActivity[]
  dailyTrend: DailyTrend[]
}

const colorMap: Record<string, string> = {
  green: 'bg-emerald-500',
  blue: 'bg-blue-600',
  purple: 'bg-indigo-600',
  orange: 'bg-amber-500'
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005'

export default function UserStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly'>('weekly')
  const [filteredTrend, setFilteredTrend] = useState<DailyTrend[]>([])
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    fetchUserStats()
    const interval = setInterval(fetchUserStats, 30000)
    return () => clearInterval(interval)
  }, [])

  // Update filtered trend when stats or timeRange changes
  useEffect(() => {
    if (stats?.dailyTrend) {
      const now = new Date()
      let start: Date
      let end: Date = now

      // If custom dates are set, use them
      if (startDate && endDate) {
        start = new Date(startDate)
        end = new Date(endDate)
      } else if (timeRange === 'weekly') {
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else {
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }

      const filtered = stats.dailyTrend.filter(d => {
        const dayDate = new Date(d.day)
        return dayDate >= start && dayDate <= end
      })

      setFilteredTrend(filtered)
    }
  }, [stats, timeRange, startDate, endDate])

  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No token found')
        setLoading(false)
        return
      }

      const response = await fetch(`${BASE_URL}/api/admin/user-stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const doughnutData = stats && Object.keys(stats.committeeStats).length > 0 ? {
    labels: Object.keys(stats.committeeStats),
    datasets: [{
      data: Object.values(stats.committeeStats),
      backgroundColor: ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#dbeafe', '#bfdbfe', '#93c5fd'],
      hoverOffset: 25,
      borderWidth: 0,
      borderRadius: 10,
      spacing: 5
    }]
  } : null

  const lineData = filteredTrend.length > 0 ? {
    labels: filteredTrend.map(d => {
      const date = new Date(d.day)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }),
    datasets: [{
      label: 'Daily Attendance',
      data: filteredTrend.map(d => d.count),
      borderColor: '#4f46e5',
      borderWidth: 3,
      pointBackgroundColor: '#4f46e5',
      pointBorderColor: '#1a1a1a',
      pointBorderWidth: 3,
      pointHoverRadius: 8,
      fill: true,
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(79, 70, 229, 0.25)');
        gradient.addColorStop(1, 'rgba(79, 70, 229, 0)');
        return gradient;
      },
      tension: 0.45,
    }]
  } : null

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 sm:gap-6"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                  <motion.div 
                    className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.div 
                    className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-xs sm:text-sm font-semibold text-indigo-500 text-center"
                >
                  Loading Data...
                </motion.p>
              </motion.div>
            </div>
    )
  }

  if (!stats) return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <ShieldCheck className="w-16 h-16 text-indigo-500/50 animate-pulse" />
        <p className="text-lg font-bold text-gray-400">Re-establishing Secure Connection...</p>
      </div>
    </div>
  )

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="min-h-screen bg-[#1A1A1A] p-4 sm:p-6 lg:p-8"
    >
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {/* HEADER: COMMAND BAR */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 px-0 sm:px-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-3 text-indigo-500 font-bold text-xs uppercase tracking-[0.4em]">
              <Activity className="w-4 h-4 animate-pulse" />
              Real-time governance and attendance analytics
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white">
              Admin <span className="text-indigo-500">Dashboard</span>
            </h1>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 bg-[#252525] p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-indigo-500/20 shadow-lg"
          >
            <div className="p-2 bg-indigo-600 rounded-xl sm:rounded-2xl text-white">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="pr-2 sm:pr-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Cycle</p>
              <p className="text-xs sm:text-sm font-black text-white">
                {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </motion.div>
        </div>

        {/* ===== ROW 1: CORE METRICS ===== */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Stat icon={Users} title="Total Registry" value={stats?.totalUsers?.toLocaleString() ?? 0} color="blue" trend="+12%" positive />
          <Stat icon={Activity} title="Active Sessions" value={stats?.activeToday ?? 0} color="emerald" trend="+5%" positive />
          <Stat icon={Layers} title="Verified Units" value={Object.keys(stats?.committeeStats ?? {}).length} color="indigo" trend="+1" positive />
          <Stat icon={Percent} title="Attendance KPI" value={`${stats?.attendanceRate ?? 0}%`} color="orange" trend="+8%" positive />
        </div>

        {/* ===== ROW 2: PRIMARY ANALYTICS ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-10">
          
          {/* Engagement Trajectory */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-8 bg-[#252525] rounded-xl sm:rounded-2xl shadow-2xl border border-indigo-500/10 p-4 sm:p-6 lg:p-10 hover:border-indigo-500/20 transition-all relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-12">
              <h3 className="text-sm font-black text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-indigo-500" /> Attendance Trajectory
              </h3>
              
              {/* Time Range Toggle + Date Picker */}
              <div className="flex flex-col xs:flex-row gap-2 xs:gap-3">
                <div className="flex gap-2 bg-[#1A1A1A] p-1.5 rounded-lg border border-indigo-500/20">
                  {(['weekly', 'monthly'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => {
                        setTimeRange(range)
                        setStartDate('')
                        setEndDate('')
                      }}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-bold uppercase transition-all ${
                        timeRange === range && !startDate
                          ? 'bg-indigo-600 text-white shadow-lg'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      {range === 'weekly' ? '7 Days' : '30 Days'}
                    </button>
                  ))}
                </div>

                {/* Custom Date Range Button */}
                <button
                  type="button"
                  onClick={() => setShowDatePicker(prev => !prev)}
                  aria-pressed={showDatePicker}
                  title={startDate && endDate ? `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Open custom date range'}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold uppercase transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 border ${
                  startDate && endDate
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-[#1A1A1A] text-gray-400 border-indigo-500/20 hover:text-gray-300'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span className="truncate">
                  {startDate && endDate
                    ? `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : 'Custom'}
                  </span>
                </button>
              </div>
            </div>

            {/* Date Picker Popup */}
            <AnimatePresence>
              {showDatePicker && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-[#1A1A1A] rounded-lg border border-indigo-500/20 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#252525] border border-indigo-500/20 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#252525] border border-indigo-500/20 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setStartDate('')
                        setEndDate('')
                        setShowDatePicker(false)
                      }}
                      className="px-3 py-1.5 bg-gray-600 text-white text-xs font-bold rounded-lg hover:bg-gray-700 transition-all"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all"
                    >
                      Apply
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="h-56 sm:h-64 lg:h-80 relative">
              {lineData ? (
                <Line 
                  data={lineData} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    plugins: { 
                      legend: { 
                        display: true,
                        labels: {
                          color: '#9CA3AF',
                          font: { weight: 'bold', size: 12 },
                          usePointStyle: true
                        }
                      }
                    },
                    scales: { 
                      y: { 
                        grid: { color: 'rgba(79, 70, 229, 0.05)', display: true }, 
                        border: { display: false }, 
                        ticks: { font: { weight: 'bold' }, color: '#9CA3AF' },
                        beginAtZero: true
                      },
                      x: { 
                        grid: { color: 'rgba(79, 70, 229, 0.03)', display: true }, 
                        border: { display: false }, 
                        ticks: { font: { weight: 'bold' }, color: '#9CA3AF' } 
                      }
                    }
                  }} 
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No data available for selected period
                </div>
              )}
            </div>
          </motion.section>

          {/* Unit Distribution */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-4 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-10 text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-white/5 rounded-full -mr-16 -mt-16" />
            <h3 className="text-sm font-black text-white/90 uppercase tracking-[0.3em] mb-6 sm:mb-12 relative">Committee Distribution</h3>
            <div className="h-56 sm:h-64 lg:h-80 flex items-center justify-center relative">
              <div className="absolute flex flex-col items-center justify-center z-10">
                <span className="text-2xl sm:text-3xl font-black text-white">{Object.keys(stats?.committeeStats ?? {}).length}</span>
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-[0.2em]">Committees</span>
              </div>
              {doughnutData ? (
                <Doughnut 
                  data={doughnutData} 
                  options={{ 
                    cutout: '82%', 
                    plugins: { 
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(37, 37, 37, 0.98)',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        titleColor: '#4f46e5',
                        bodyColor: '#fff',
                        borderColor: 'rgba(79, 70, 229, 0.3)',
                        borderWidth: 1,
                        cornerRadius: 10,
                        callbacks: {
                          label: (context: any) => ` ${context.label}: ${context.raw} members`
                        }
                      }
                    }
                  }} 
                />
              ) : (
                <div className="text-white/50 text-sm">No committee data</div>
              )}
            </div>
          </motion.section>
        </div>

        {/* Row 3: Recent Activity */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#252525] rounded-xl sm:rounded-2xl shadow-xl border border-indigo-500/10 p-4 sm:p-6 lg:p-10 hover:border-indigo-500/20 transition-all"
        >
          <h3 className="text-sm font-black text-indigo-400 uppercase tracking-[0.3em] mb-6 sm:mb-8">Recent System Activity</h3>
          <div className="space-y-2 sm:space-y-4 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {stats?.recentActivity?.length > 0 ? (
                stats.recentActivity.map((log, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className="flex items-center justify-between p-3 sm:p-4 hover:bg-[#2A2A2A] rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className={`w-2.5 h-2.5 rounded-full ${colorMap[log.color]} shrink-0 group-hover:scale-125 transition-transform`} />
                      <span className="text-xs sm:text-sm font-semibold text-gray-300 truncate">{log.message}</span>
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-gray-500 whitespace-nowrap ml-2">
                      {formatTime(log.time)}
                    </span>
                  </motion.div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No recent activity</p>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      </div>
    </motion.div>
  )
}

function Stat({ icon: Icon, title, value, color, trend, positive }: any) {
  const colors: any = {
    blue: 'bg-blue-500/10 text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    indigo: 'bg-indigo-500/10 text-indigo-400',
    orange: 'bg-orange-500/10 text-orange-400',
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="bg-[#252525] p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-xl border border-indigo-500/10 hover:border-indigo-500/20 transition-all group"
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${colors[color]} rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        {trend && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold ${
              positive 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
          >
            {positive ? <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
            {trend}
          </motion.div>
        )}
      </div>
      <p className="text-xs sm:text-sm text-gray-400 font-medium mb-1 uppercase tracking-wider">{title}</p>
      <p className="text-2xl sm:text-3xl font-black text-white">{value}</p>
    </motion.div>
  )
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return 'recently'
  }
}