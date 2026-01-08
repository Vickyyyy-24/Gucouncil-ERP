'use client'

import { useEffect, useState } from 'react'
import { User, Briefcase, Calendar, Clock } from 'lucide-react'
import { apiClient, ApiError } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function CommitteeTable({ committee, range, refresh }: any) {
  const { token } = useAuth()
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!committee || committee === 'all' || !token) return

    setLoading(true)
    ;(async () => {
      try {
        apiClient.setToken(token)
        const data = await apiClient.getGSCommitteeMembers(
          committee,
          range.start,
          range.end
        )
        setMembers(Array.isArray(data) ? data : [])
      } catch (err: any) {
        console.error('Failed to load committee members:', err)
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          try { localStorage.removeItem('token') } catch {}
        }
        setMembers([])
      } finally {
        setLoading(false)
      }
    })()
  }, [committee, range, refresh, token])

  return (
    <div className="relative group">
      {/* Decorative Glow behind the table */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>

      <div className="relative bg-[#0f172a]/80 backdrop-blur-xl border border-blue-500/30 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-blue-500/20 bg-blue-500/5 flex items-center justify-between">
          <h3 className="text-blue-100 font-bold uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            {committee} Deployment Registry
          </h3>
          <span className="text-[10px] text-cyan-500/70 font-mono tracking-tighter uppercase">
            Data.Link_Active
          </span>
        </div>

        {/* Responsive Horizontal Scroll Wrapper */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-blue-900/20 text-blue-400 text-xs uppercase tracking-widest font-bold">
                <th className="px-6 py-4 flex items-center gap-2 font-semibold">
                  <User size={14} className="text-blue-500" /> Member Name
                </th>
                <th className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-blue-500" /> Role
                  </div>
                </th>
                <th className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Calendar size={14} className="text-blue-500" /> Days
                  </div>
                </th>
                <th className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Clock size={14} className="text-blue-500" /> Total Hours
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-500/10">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-blue-400/50 text-sm">
                    Loading members...
                  </td>
                </tr>
              ) : members.length > 0 ? (
                members.map((m, i) => (
                  <tr 
                    key={i} 
                    className="hover:bg-blue-400/5 transition-colors group/row"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-100 group-hover/row:text-cyan-300 transition-colors">
                        {m.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-block px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-300 uppercase tracking-wide">
                        {m.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-cyan-400">
                      {m.attendance_days}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-white">
                      {m.total_hours}
                      <span className="text-[10px] text-blue-500 ml-1">H</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-blue-500/50 italic text-sm">
                    No registry data found for this selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}