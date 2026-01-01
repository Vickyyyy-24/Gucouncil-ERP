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
  Clock, 
  TrendingUp, 
  ShieldCheck, 
  LayoutDashboard,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  Timer
} from 'lucide-react'
import { apiClient } from '@/lib/api'

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

export default function UserStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) apiClient.setToken(token)
    fetchUserStats()
    const interval = setInterval(fetchUserStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchUserStats = async () => {
    try {
      const data = await apiClient.getUserStats()
      setStats(data)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const doughnutData = stats ? {
    labels: Object.keys(stats.committeeStats),
    datasets: [{
      data: Object.values(stats.committeeStats),
      backgroundColor: ['#6366f1', '#818cf8', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#84cc16'],
      hoverOffset: 25,
      borderWidth: 0,
      borderRadius: 10,
      spacing: 5
    }]
  } : null

  const lineData = stats ? {
    labels: stats.dailyTrend.map(d => new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Activity',
      data: stats.dailyTrend.map(d => d.count),
      borderColor: '#6366f1',
      borderWidth: 4,
      pointBackgroundColor: '#6366f1',
      pointBorderColor: '#fff',
      pointHoverRadius: 8,
      fill: true,
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
        return gradient;
      },
      tension: 0.45,
    }]
  } : null

  if (loading) return <DashboardSkeleton />

  if (!stats) return (
    <div className="flex flex-col items-center justify-center min-h-[500px] bg-slate-50 rounded-[3rem]">
      <ShieldCheck className="w-16 h-16 mb-6 text-slate-300 animate-pulse" />
      <p className="text-xl font-bold text-slate-400">Re-establishing Secure Connection...</p>
    </div>
  )

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="max-w-7xl mx-auto space-y-10 pb-16 px-4 pt-4"
    >
      {/* HEADER: COMMAND BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-indigo-600 font-bold text-xs uppercase tracking-[0.4em]">
            <Activity className="w-4 h-4 animate-pulse" />
Real-time governance and attendance analytics
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Command Center</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">System Uptime</p>
            <p className="text-sm font-black text-emerald-500 tracking-tight">99.9% Reliable</p>
          </div>
          <div className="flex items-center gap-3 bg-white p-3 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="p-2 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="pr-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Cycle</p>
              <p className="text-sm font-black text-slate-800 tabular-nums">Dec 2025</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== ROW 1: CORE METRICS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <Stat icon={Users} title="Total Registry" value={stats.totalUsers.toLocaleString()} color="blue" />
        <Stat icon={Activity} title="Active Sessions" value={stats.activeToday} color="emerald" />
        <Stat icon={Layers} title="Verified Units" value={Object.keys(stats.committeeStats).length} color="indigo" />
        <Stat icon={Percent} title="Attendance KPI" value={`${stats.attendanceRate}%`} color="orange" />
      </div>

      {/* ===== ROW 2: PRIMARY ANALYTICS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Engagement Trajectory */}
        <section className="lg:col-span-8 bg-white rounded-[3rem] shadow-2xl shadow-slate-200/40 border border-white p-10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-12">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-indigo-600" /> Attendance Trajectory
            </h3>
            <div className="px-4 py-1 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Feed</div>
          </div>
          <div className="h-[360px] relative">
            {lineData && <Line data={lineData} options={{ 
              responsive: true, 
              maintainAspectRatio: false, 
              plugins: { legend: { display: false } },
              scales: { 
                y: { grid: { display: false }, border: { display: false }, ticks: { font: { weight: 'bold' }, color: '#94a3b8' } },
                x: { grid: { color: 'rgba(0,0,0,0.03)' }, border: { display: false }, ticks: { font: { weight: 'bold' }, color: '#94a3b8' } }
              }
            }} />}
          </div>
        </section>

        {/* Unit Distribution */}
        <section className="lg:col-span-4 bg-slate-900 rounded-[3rem] shadow-2xl p-10 text-white relative overflow-hidden">
          <div className="absolute top-[-20px] right-[-20px] w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
          <h3 className="text-sm font-black text-indigo-400 uppercase tracking-[0.3em] mb-12 relative">Unit Distribution</h3>
          <div className="h-[360px] flex items-center justify-center relative ">
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white">{Object.keys(stats.committeeStats).length}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Committees</span>
            </div>
           {doughnutData && <Doughnut data={doughnutData} options={{ 
              cutout: '82%', 
              plugins: { 
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#0f172a',
                  padding: 12,
                  titleFont: { size: 14, weight: 'bold' },
                  callbacks: {
                    label: (context) => ` ${context.label}: ${context.raw} units`
                  }
                }
              }
            }} />}
          </div>
        </section>
      </div>

      {/* Row 3: Recent Activity (Optional addition based on your Stats type) */}
      <section className="bg-white rounded-[3rem] shadow-xl p-10 border border-slate-100">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] mb-8">System Logs</h3>
        <div className="space-y-4">
          {stats.recentActivity.map((log, i) => (
            <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${colorMap[log.color]}`} />
                <span className="font-semibold text-slate-700">{log.message}</span>
              </div>
              <span className="text-xs font-bold text-slate-400 tabular-nums">{log.time}</span>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  )
}

function Stat({ icon: Icon, title, value, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50">
      <div className={`w-14 h-14 ${colors[color]} rounded-2xl flex items-center justify-center mb-6`}>
        <Icon className="w-7 h-7" />
      </div>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8 animate-pulse">
      <div className="h-20 bg-slate-200 rounded-3xl w-1/3" />
      <div className="grid grid-cols-4 gap-8">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-slate-200 rounded-[2.5rem]" />)}
      </div>
      <div className="h-96 bg-slate-200 rounded-[3rem]" />
    </div>
  )
}