'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { onSocketEvent } from '@/lib/socket'
import { apiClient } from '@/lib/api'
import html2canvas from 'html2canvas'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { 
  Users, 
  FileText, 
  Clock, 
  Download, 
  TrendingUp, 
  ShieldCheck,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement, Filler)

type Range = 'weekly' | 'monthly'

export default function CommitteeInsights() {
  const [insights, setInsights] = useState({
    totalMembers: 0,
    attendanceRate: 0,
    submittedReports: 0,
    pendingLeaves: [] as any[],
    attendanceTrend: [] as any[],
  })
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>('weekly')

  /* ================= SOCKET LISTENER FOR LEAVE UPDATES ================= */
  useEffect(() => {
    try {
      const unsubscribe = onSocketEvent('leave_update', () => {
        console.log('📡 leave_update event received')
        fetchInsights()
      })

      return () => {
        console.log('🧹 Cleaning up committee insights socket listener')
        unsubscribe()
      }
    } catch (error) {
      console.error('❌ Socket listener error:', error)
    }
  }, [range])

  /* ================= FETCH DATA WHEN RANGE CHANGES ================= */
  useEffect(() => {
    fetchAll()
  }, [range])

  const fetchAll = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchInsights(), fetchMembers()])
    } finally {
      setLoading(false)
    }
  }

  const fetchInsights = async () => {
    try {
      const data = await apiClient.get(`/api/head/committee-insights?range=${range}`)
      setInsights({
        totalMembers: data?.totalMembers ?? 0,
        attendanceRate: data?.attendanceRate ?? 0,
        submittedReports: data?.submittedReports ?? 0,
        pendingLeaves: Array.isArray(data?.pendingLeaves) ? data.pendingLeaves : [],
        attendanceTrend: Array.isArray(data?.attendanceTrend) ? data.attendanceTrend : [],
      })
      console.log('✅ Committee insights loaded successfully')
    } catch (err) {
      console.error('❌ Failed to fetch insights', err)
      toast.error('Failed to fetch insights')
    }
  }

  const fetchMembers = async () => {
    try {
      const data = await apiClient.get('/api/head/committee-members')
      setMembers(Array.isArray(data) ? data : [])
      console.log('✅ Committee members loaded successfully')
    } catch (err) {
      console.error('❌ Failed to fetch members', err)
      toast.error('Failed to fetch members')
    }
  }

  const exportPdf = async () => {
    try {
      const chartEl = document.getElementById('attendance-chart')
      if (!chartEl) return toast.error('Chart element not found')
      const canvas = await html2canvas(chartEl)
      const chartImage = canvas.toDataURL('image/png')
      const res = await apiClient.postRaw('/api/head/committee-export/pdf', {
        method: 'POST',
        body: JSON.stringify({ chartImage }),
        headers: { 'Content-Type': 'application/json' }
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Committee_Insights_${new Date().toLocaleDateString()}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Report exported successfully')
    } catch (err) {
      console.error('❌ Export failed:', err)
      toast.error('Export failed')
    }
  }

  const chartData = {
    labels: insights.attendanceTrend.map((d: any) => d.label ?? d.day ?? ''),
    datasets: [{
      label: 'Attendance',
      data: insights.attendanceTrend.map((d: any) => d.count ?? 0),
      backgroundColor: 'rgba(249, 115, 22, 0.1)',
      borderColor: 'rgba(249, 115, 22, 1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointRadius: (context: any) => {
        const index = context.dataIndex
        const dataLength = context.dataset.data.length
        return index === dataLength - 1 ? 6 : 0
      },
      pointHoverRadius: 10,
      pointBackgroundColor: 'rgba(249, 115, 22, 1)',
      pointBorderColor: '#252525',
      pointBorderWidth: 3,
      pointHoverBorderWidth: 4,
      pointHoverBackgroundColor: 'rgba(249, 115, 22, 1)',
    }],
  }

  const latestValue = insights.attendanceTrend.length > 0 
    ? insights.attendanceTrend[insights.attendanceTrend.length - 1]?.count ?? 0 
    : 0

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
              className="absolute inset-0 border-4 border-orange-500/20 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div 
              className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xs sm:text-sm font-semibold text-orange-500 text-center"
          >
            Loading Committee Insights...
          </motion.p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4"
        >
          <div className="w-full sm:w-auto">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2"
            >
              <span className="text-4xl md:text-5xl font-black tracking-tight text-white italic uppercase">
                COMMITTEE <span className="text-orange-500 not-italic">INSIGHT</span>
              </span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 text-orange-500 font-bold text-xs sm:text-sm uppercase tracking-wide"
            >
              Monitor attendance, reports, and team performance
            </motion.p>
          </div>
          <motion.button 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportPdf}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Export Report
          </motion.button>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <StatCard 
            icon={Users} 
            label="Total Members" 
            value={insights.totalMembers}
            trend="+12%"
            positive
            delay={0.1}
          />
          <StatCard 
            icon={Activity} 
            label="Attendance Rate" 
            value={`${insights.attendanceRate}%`}
            trend="+5%"
            positive
            delay={0.2}
          />
          <StatCard 
            icon={Clock} 
            label="Pending Leaves" 
            value={insights.pendingLeaves.length}
            trend="-2"
            delay={0.3}
          />
          <StatCard 
            icon={FileText} 
            label="Submitted Reports" 
            value={insights.submittedReports}
            trend="+8"
            positive
            delay={0.4}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Chart Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 bg-[#252525] border border-orange-500/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-orange-500/20 transition-all"
          >
            <div className="flex flex-col gap-4 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500/10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white truncate">Attendance Overview</h3>
                    <p className="text-xs text-gray-400 truncate">Track member engagement</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  {/* Live Count Badge */}
                  <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 whitespace-nowrap">Live</p>
                      <p className="text-base sm:text-xl font-bold text-orange-500">{latestValue}</p>
                    </div>
                  </div>

                  {/* Range Toggle */}
                  <div className="flex bg-[#2A2A2A] rounded-lg p-0.5 sm:p-1 border border-orange-500/10">
                    {(['weekly', 'monthly'] as Range[]).map((r) => (
                      <motion.button
                        key={r}
                        onClick={() => setRange(r)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-3 sm:px-5 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold rounded-md sm:rounded-lg transition-all capitalize ${
                          range === r 
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {r}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div id="attendance-chart" className="h-56 sm:h-64 lg:h-72 chart-glow-effect">
              <Line 
                data={chartData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { display: false },
                    tooltip: {
                      enabled: true,
                      backgroundColor: 'rgba(37, 37, 37, 0.98)',
                      padding: 12,
                      titleColor: '#F97316',
                      titleFont: { size: 12, weight: 'bold' },
                      bodyColor: '#fff',
                      bodyFont: { size: 11 },
                      borderColor: 'rgba(249, 115, 22, 0.3)',
                      borderWidth: 1,
                      cornerRadius: 10,
                      displayColors: false,
                      callbacks: {
                        title: function(context: any) {
                          return context[0].label
                        },
                        label: function(context: any) {
                          return `Attendance: ${context.parsed.y}`
                        }
                      }
                    }
                  },
                  scales: { 
                    y: { 
                      grid: { 
                        color: 'rgba(249, 115, 22, 0.05)',
                        drawBorder: false
                      },
                      ticks: { 
                        color: '#6B7280', 
                        font: { size: 10, weight: '600' },
                        padding: 8
                      },
                      border: { display: false }
                    },
                    x: { 
                      grid: { display: false },
                      ticks: { 
                        color: '#6B7280', 
                        font: { size: 10, weight: '600' },
                        padding: 8,
                        maxRotation: 45,
                        minRotation: 0
                      },
                      border: { display: false }
                    } 
                  },
                  interaction: {
                    intersect: false,
                    mode: 'index'
                  },
                  onHover: (event: any, activeElements: any, chart: any) => {
                    if (activeElements.length > 0) {
                      chart.canvas.style.cursor = 'pointer'
                      chart.data.datasets[0].borderWidth = 4
                      chart.update('none')
                    } else {
                      chart.canvas.style.cursor = 'default'
                      chart.data.datasets[0].borderWidth = 3
                      chart.update('none')
                    }
                  }
                }} 
              />
              <style jsx>{`
                .chart-glow-effect canvas:hover {
                  filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.3));
                }
              `}</style>
            </div>
          </motion.div>

          {/* Info Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-full -mr-12 sm:-mr-16 -mt-12 sm:-mt-16" />
            <div className="absolute bottom-0 left-0 w-20 h-20 sm:w-24 sm:h-24 bg-white/5 rounded-full -ml-10 sm:-ml-12 -mb-10 sm:-mb-12" />
            
            <div className="relative z-10">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">System Status</h3>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed mb-4 sm:mb-6">
                All attendance records and reports are synchronized in real-time. Performance metrics monitored continuously.
              </p>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-white/80">Sync Status</span>
                  <span className="font-bold">Active</span>
                </div>
                <div className="h-2.5 sm:h-3 bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: '94%' }} 
                    transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                    className="h-full bg-white rounded-full shadow-lg"
                  />
                </div>
                <div className="flex justify-between text-[10px] sm:text-xs text-white/80">
                  <span>System Integrity</span>
                  <span className="font-bold">94%</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Members Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-[#252525] border border-orange-500/10 rounded-xl sm:rounded-2xl overflow-hidden hover:border-orange-500/20 transition-all"
        >
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-orange-500/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500/10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white truncate">Committee Members</h3>
                <p className="text-xs text-gray-400 truncate">{members.length} active members</p>
              </div>
            </div>
          </div>
          
          {/* Mobile Card View */}
          <div className="block sm:hidden">
            <div className="divide-y divide-orange-500/5">
              <AnimatePresence>
                {members.map((m, idx) => (
                  <motion.div
                    key={m.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + idx * 0.05 }}
                    className="p-4 hover:bg-[#2A2A2A] transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg shrink-0">
                        {m.name?.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white text-sm truncate">{m.name}</p>
                        <p className="text-xs font-mono text-orange-400 truncate">{m.council_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        {m.position}
                      </span>
                      <span className="text-base font-bold text-white">
                        {m.attendance_days ?? 0}
                        <span className="text-xs text-gray-400 font-semibold ml-1">days</span>
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-orange-500/10">
                  <th className="px-4 lg:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">ID</th>
                  <th className="px-4 lg:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 lg:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Position</th>
                  <th className="px-4 lg:px-6 py-3 sm:py-4 text-right text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Attendance</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {members.map((m, idx) => (
                    <motion.tr 
                      key={m.user_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + idx * 0.05 }}
                      className="border-b border-orange-500/5 hover:bg-[#2A2A2A] transition-colors"
                    >
                      <td className="px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-mono text-orange-400 font-semibold">
                        {m.council_id}
                      </td>
                      <td className="px-4 lg:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-lg shrink-0">
                            {m.name?.charAt(0)}
                          </div>
                          <span className="font-semibold text-white text-xs sm:text-sm truncate">{m.name}</span>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 sm:py-4">
                        <span className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 whitespace-nowrap">
                          {m.position}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-3 sm:py-4 text-right">
                        <span className="text-base sm:text-lg font-bold text-white whitespace-nowrap">
                          {m.attendance_days ?? 0}
                          <span className="text-xs text-gray-400 font-semibold ml-1">days</span>
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, trend, positive = false, delay = 0 }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="bg-[#252525] border border-orange-500/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 hover:border-orange-500/20 transition-all group"
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500/10 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-orange-500/20 transition-colors shrink-0">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
        </div>
        {trend && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.2, type: "spring" }}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold shrink-0 ${
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
      <p className="text-xs sm:text-sm text-gray-400 font-medium mb-1 truncate">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold text-white">{value}</p>
    </motion.div>
  )
}