'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { apiClient, ApiError } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function AttendanceChart({
  committee,
  range,
  refresh
}: any) {
  const { token } = useAuth()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token || !committee || committee === 'all') return
    if (!range.start || !range.end) return

    setLoading(true)
    ;(async () => {
      try {
        apiClient.setToken(token)
        const res = await apiClient.getGSCommitteeAttendanceAnalytics(
          committee,
          range.start,
          range.end
        )
        setData(Array.isArray(res) ? res : [])
      } catch (err: any) {
        console.error('Failed to load attendance analytics:', err)
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          try { localStorage.removeItem('token') } catch {}
        }
        setData([])
      } finally {
        setLoading(false)
      }
    })()
  }, [token, committee, range, refresh])

  // Custom Styled Tooltip to match the Cyber Theme
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f172a]/90 border border-cyan-500/50 backdrop-blur-md p-3 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          <p className="text-cyan-400 font-bold text-xs uppercase tracking-widest mb-1">{label}</p>
          <p className="text-white text-lg font-mono">
            {payload[0].value} <span className="text-[10px] text-blue-300">MEMBERS</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-blue-900/10 rounded-xl border border-blue-500/20 animate-pulse">
        <div className="text-blue-400 font-mono text-sm tracking-tighter">INITIALIZING DATA STREAM...</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-blue-900/10 rounded-xl border border-blue-500/20">
        <div className="text-blue-400/50 font-mono text-sm">No attendance data available for selected period</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full min-h-[300px] transition-all duration-500">
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            {/* Gradient for the line area fill */}
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
            {/* Secondary gradient for peak variation */}
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#d946ef" />
            </linearGradient>
          </defs>

          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="#1e293b" 
          />

          <XAxis 
            dataKey="day" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
            dy={10}
          />

          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 10 }}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1 }} />

          <Area
            type="monotone"
            dataKey="count"
            stroke="url(#lineGradient)"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorCount)"
            animationDuration={2000}
            dot={{ r: 4, fill: '#0f172a', stroke: '#06b6d4', strokeWidth: 2 }}
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: '#06b6d4' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}