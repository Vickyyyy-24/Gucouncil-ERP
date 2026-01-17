'use client'

import { useEffect, useState } from 'react'
import { getSocket } from '@/lib/socket'
import { Download, LayoutDashboard, Activity } from 'lucide-react'
import { apiClient, ApiError } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

import SummaryCard from '@/components/gs/SummaryCard'
import FiltersBar from '@/components/gs/FiltersBar'
import AttendanceChart from '@/components/gs/AttendanceChart'
import CommitteeTable from '@/components/gs/CommitteeTable'
import LiveActivityFeed from '@/components/gs/LiveActivityFeed'

export default function GSInsight() {
  const { token, logout } = useAuth()
  const router = useRouter()

  const [committee, setCommittee] = useState('all')
  const [range, setRange] = useState({ start: '', end: '' })
  const [refresh, setRefresh] = useState(0)
  const [summary, setSummary] = useState<any>(null)

  /* ================= SOCKET LISTENERS ================= */
  useEffect(() => {
    try {
      const socket = getSocket()

      if (!socket) {
        console.warn('⛔ GSInsight: Socket not initialized')
        return
      }

      const handleAttendanceUpdate = () => {
        console.log('📡 Attendance update received')
        setRefresh((v) => v + 1)
      }

      const handleLeaveUpdate = () => {
        console.log('📡 Leave update received')
        setRefresh((v) => v + 1)
      }

      const handleSystemLog = () => {
        console.log('📡 System log received')
        setRefresh((v) => v + 1)
      }

      socket.on('attendance:update', handleAttendanceUpdate)
      socket.on('leave_update', handleLeaveUpdate)
      socket.on('system:log', handleSystemLog)

      return () => {
        socket.off('attendance:update', handleAttendanceUpdate)
        socket.off('leave_update', handleLeaveUpdate)
        socket.off('system:log', handleSystemLog)
      }
    } catch (error) {
      console.error('❌ Socket listener error:', error)
    }
  }, [])

  /* ================= FETCH SUMMARY ================= */
  useEffect(() => {
    if (!token) {
      console.warn('⛔ GSInsight: token not ready, skipping API call')
      return
    }

    apiClient.setToken(token)

    let mounted = true

    const fetchSummary = async () => {
      try {
        const data = await apiClient.getGSDashboardSummary()
        if (mounted) setSummary(data)
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          try {
            localStorage.removeItem('token')
          } catch {}
          try {
            logout()
          } catch {}
          router.replace('/login')
          return
        }

        console.error('Failed to load GS summary:', err)
        if (mounted) setSummary(null)
      }
    }

    fetchSummary()

    return () => {
      mounted = false
    }
  }, [token, refresh, router, logout])

  /* ================= PDF DOWNLOAD ================= */
  const downloadAttendancePdf = async () => {
    if (!range.start || !range.end) {
      alert('Please select a date range first')
      return
    }

    // keep a fallback for the original button text so the catch block can use it
    let originalText = 'Export PDF'

    try {
      // Show loading state
      const btn = document.querySelector('[data-download-btn]') as HTMLButtonElement
      originalText = btn?.textContent || originalText
      if (btn) {
        btn.disabled = true
        btn.textContent = '⏳ Generating PDF...'
      }

      // GS users should use /api/gs/logs/pdf or /api/admin/attendance-report/pdf
      const endpoint = `/api/admin/attendance-report/pdf?committee=${encodeURIComponent(
        committee
      )}&startDate=${range.start}&endDate=${range.end}`

      const response = await apiClient.postRaw(endpoint, {
        method: 'GET',
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `HTTP ${response.status}: ${errorText || 'PDF generation failed'}`
        )
      }

      // Verify we got a PDF blob
      const blob = await response.blob()

      if (!blob || blob.size === 0) {
        throw new Error('❌ Empty PDF response received')
      }

      if (blob.type !== 'application/pdf') {
        throw new Error(`❌ Invalid response type: ${blob.type}. Expected PDF.`)
      }

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `attendance-report-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // Success feedback
      if (btn) {
        btn.textContent = 'Downloaded!'
        setTimeout(() => {
          btn.disabled = false
          btn.textContent = originalText
        }, 2000)
      }
    } catch (err: any) {
      console.error('❌ PDF Download Error:', err)
      alert(
        `Failed to download PDF:\n\n${err?.message || 'Unknown error occurred'}`
      )

      // Reset button
      const btn = document.querySelector('[data-download-btn]') as HTMLButtonElement
      if (btn) {
        btn.disabled = false
        btn.textContent = originalText || 'Export PDF'
      }
    }
  }

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-[#020617] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-[#020617] p-6 text-blue-100 font-sans">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b border-blue-900/50 pb-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tight flex items-center justify-center lg:justify-start gap-3">
            <LayoutDashboard className="text-blue-500 shrink-0" /> INSIGHTS
          </h1>
          <p className="text-blue-400/60 text-sm mt-1 uppercase tracking-widest font-medium">
            System Intelligence Monitor
          </p>
        </div>

        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <FiltersBar
            committee={committee}
            setCommittee={setCommittee}
            range={range}
            setRange={setRange}
          />
          <button
            data-download-btn
            onClick={downloadAttendancePdf}
            className="group flex items-center gap-2 bg-blue-600/10 hover:bg-blue-600 border border-blue-500/50 text-blue-400 hover:text-white px-4 py-2 rounded-md transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
          >
            <Download size={18} className="group-hover:animate-bounce" />
            <span className="text-sm font-semibold uppercase">Export PDF</span>
          </button>
        </div>
      </header>

      <div className="space-y-6">
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard
              title="Committees"
              value={summary.totalCommittees}
              variant="blue"
            />
            <SummaryCard
              title="Total Members"
              value={summary.totalMembers}
              variant="cyan"
            />
            <SummaryCard
              title="Daily Attendance"
              value={summary.todayAttendance}
              variant="magenta"
            />
            <SummaryCard
              title="Pending Leaves"
              value={summary.pendingLeaves}
              variant="warning"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0f172a]/40 border border-blue-500/20 backdrop-blur-md rounded-xl p-6 shadow-inner relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 group-hover:bg-cyan-400 transition-colors"></div>
              <h3 className="text-sm font-bold text-blue-300 mb-4 uppercase flex items-center gap-2">
                <Activity size={16} /> Attendance Analytics
              </h3>
              <AttendanceChart
                committee={committee}
                range={range}
                refresh={refresh}
              />
            </div>

            {committee !== 'all' && (
              <div className="bg-[#0f172a]/40 border border-blue-500/20 backdrop-blur-md rounded-xl p-6 shadow-xl">
                <CommitteeTable
                  committee={committee}
                  range={range}
                  refresh={refresh}
                />
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-[#0f172a]/60 border border-blue-500/30 backdrop-blur-lg rounded-xl p-4 h-full shadow-2xl relative">
              <div className="absolute top-0 right-0 p-2">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              </div>
              <h3 className="text-sm font-bold text-blue-300 mb-4 uppercase tracking-tighter">
                Live Operations Feed
              </h3>
              <LiveActivityFeed refresh={refresh} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}