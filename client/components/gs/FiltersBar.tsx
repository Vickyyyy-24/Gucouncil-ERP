'use client'

import { useEffect, useState } from 'react'
import { Filter, Calendar as CalendarIcon, ChevronDown } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005'

export default function FiltersBar({
  committee,
  setCommittee,
  range,
  setRange
}: any) {
  const [token, setToken] = useState<string | null>(null)
  const [committees, setCommittees] = useState<string[]>([])

  useEffect(() => {
    setToken(localStorage.getItem('token'))
  }, [])

  useEffect(() => {
    if (!token) return
    ;(async () => {
      try {
        const data = await (await import('@/lib/api')).apiClient.get('/api/gs/committees')
        // Expect an array; guard
        if (Array.isArray(data)) setCommittees(data)
        else if (data && Array.isArray((data as any).committees)) setCommittees((data as any).committees)
        else setCommittees([])
      } catch (err: any) {
        const msg = err?.message || ''
        if (msg.toLowerCase().includes('unauthorized') || msg.includes('401') || msg.includes('403')) {
          console.error('Unauthorized when fetching committees:', msg)
          localStorage.removeItem('token')
          setToken(null)
          setCommittees([])
        } else {
          console.error('Failed to load committees:', err)
          setCommittees([])
        }
      }
    })()
  }, [token])

  const inputClasses = `
    bg-[#0f172a]/60 border border-blue-500/30 text-blue-100 text-sm rounded-lg 
    focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 outline-none 
    px-4 py-2.5 transition-all duration-300 hover:border-blue-400/60
    appearance-none cursor-pointer
  `;

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-blue-900/10 p-2 rounded-xl border border-blue-500/10 backdrop-blur-sm">
      
      {/* COMMITTEE SELECT */}
      <div className="relative w-full md:w-64">
        <label className="text-[10px] uppercase tracking-[0.2em] text-blue-500 font-bold mb-1 ml-1 block">
          Select Department
        </label>
        <div className="relative">
          <select
            value={committee}
            onChange={e => setCommittee(e.target.value)}
            className={`${inputClasses} w-full pr-10`}
          >
            <option value="all" className="bg-[#0f172a]">All Committees</option>
            {committees.map(c => (
              <option key={c} value={c} className="bg-[#0f172a]">{c}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
        </div>
      </div>

      {/* DATE RANGE CONTROLS */}
      <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
        <div className="w-full sm:w-auto">
          <label className="text-[10px] uppercase tracking-[0.2em] text-blue-500 font-bold mb-1 ml-1 block">
            Start Phase
          </label>
          <div className="relative">
            <input
              type="date"
              value={range.start}
              onChange={e => setRange({ ...range, start: e.target.value })}
              className={`${inputClasses} w-full sm:w-44 color-scheme-dark`}
            />
            <CalendarIcon size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none opacity-50" />
          </div>
        </div>

        <div className="w-full sm:w-auto">
          <label className="text-[10px] uppercase tracking-[0.2em] text-blue-500 font-bold mb-1 ml-1 block">
            End Phase
          </label>
          <div className="relative">
            <input
              type="date"
              value={range.end}
              onChange={e => setRange({ ...range, end: e.target.value })}
              className={`${inputClasses} w-full sm:w-44 color-scheme-dark`}
            />
            <CalendarIcon size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none opacity-50" />
          </div>
        </div>
      </div>

      {/* STATUS INDICATOR (Visual Polish) */}
      <div className="hidden lg:flex items-center gap-2 ml-2 px-3 py-2 border-l border-blue-500/20">
         <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,1)] animate-pulse" />
         <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">Filters_Synced</span>
      </div>
    </div>
  )
}