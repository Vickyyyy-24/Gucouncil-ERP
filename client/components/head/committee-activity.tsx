'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { io } from 'socket.io-client'
import {
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  Users,
  Clock,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'

const API = 'http://localhost:5005'
type Tab = 'leaves' | 'reports'

export default function CommitteeActivityPage() {
  const [tab, setTab] = useState<Tab>('leaves')
  const [loading, setLoading] = useState(true)
  const [leaves, setLeaves] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    const socket = io(API)
    socket.on('leave_update', () => {
      toast.info('Ledger Update: Leave status synchronized', { icon: <ShieldCheck className="text-emerald-600"/> })
      fetchLeaves()
    })
    return () => { socket.disconnect() }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [tab])

  const fetchAll = async () => {
    setLoading(true)
    tab === 'leaves' ? await fetchLeaves() : await fetchReports()
    setLoading(false)
  }

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  })

  const fetchLeaves = async () => {
    try {
      const res = await fetch(`${API}/api/head/committee/leaves`, { headers: authHeader() })
      if (!res.ok) throw new Error()
      setLeaves(await res.json())
    } catch {
      toast.error('Registry Error: Failed to load leave applications')
    }
  }

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API}/api/head/committee/reports`, { headers: authHeader() })
      if (!res.ok) throw new Error()
      setReports(await res.json())
    } catch {
      toast.error('Registry Error: Failed to load work reports')
    }
  }

  const approveLeave = async (id: number) => {
    await fetch(`${API}/api/head/approve-leave/${id}`, { method: 'PUT', headers: authHeader() })
    toast.success('Authorization Granted: Leave Approved')
    fetchLeaves()
  }

  const rejectLeave = async () => {
    if (!rejectId || !rejectReason) return
    await fetch(`${API}/api/head/reject-leave/${rejectId}`, {
      method: 'PUT',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason }),
    })
    toast.warn('Authorization Denied: Application Rejected')
    setRejectId(null)
    setRejectReason('')
    fetchLeaves()
  }

  const reviewReport = async (id: number) => {
    await fetch(`${API}/api/head/review-report/${id}`, { method: 'PUT', headers: authHeader() })
    toast.success('Audit Logged: Report Reviewed')
    fetchReports()
  }

  if (loading) return (
    <div className="h-64 sm:h-80 lg:h-96 flex flex-col items-center justify-center space-y-3 sm:space-y-4 px-4">
      <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-emerald-900 border-t-transparent rounded-full animate-spin" />
      <p className="text-emerald-900/40 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.3em] sm:tracking-[0.4em] text-center">Syncing Activity Registry...</p>
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 border-b border-emerald-900/10 pb-6 sm:pb-8">
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.3em] sm:tracking-[0.4em]">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4" /> Real-time Audit Stream
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-950 tracking-tighter italic leading-none">
            Committee <span className="text-amber-500 not-italic">Activity</span>
          </h1>
        </div>

        <div className="flex w-full md:w-auto bg-emerald-900/5 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-emerald-900/10 shadow-inner">
          {(['leaves', 'reports'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 md:flex-none px-6 sm:px-8 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest transition-all duration-300
                ${tab === t ? 'bg-emerald-900 text-amber-500 shadow-xl' : 'text-emerald-900/40 hover:text-emerald-900'}
              `}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="min-h-[300px] sm:min-h-[400px]">
        <AnimatePresence mode="wait">
          {tab === 'leaves' ? (
            <motion.div
              key="leaves"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-3 sm:space-y-4"
            >
              {leaves.length === 0 ? (
                <Empty text="Archive Empty: No pending leave applications detected" />
              ) : (
                leaves.map(l => (
                  <ActivityCard key={l.id}>
                    <div className="flex flex-col gap-4 sm:gap-6">
                      <div className="flex-1 space-y-3 sm:space-y-4">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-900 font-black border border-emerald-100 shadow-sm text-sm sm:text-base">
                            {l.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-emerald-950 leading-none text-sm sm:text-base truncate">{l.name}</p>
                            <p className="text-[9px] sm:text-[10px] font-black text-emerald-900/30 uppercase tracking-wider sm:tracking-widest mt-1 italic">Applicant Registry</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-emerald-900/50">
                          <span className="flex items-center gap-1 sm:gap-1.5 bg-emerald-50 px-2.5 sm:px-3 py-1 rounded-full text-emerald-800 border border-emerald-100">
                            <Calendar size={11} className="text-amber-500 sm:w-3 sm:h-3" /> 
                            <span className="hidden xs:inline">{l.leave_from}</span>
                            <span className="xs:hidden">{l.leave_from.split('-').slice(1).join('-')}</span>
                            <ChevronRight size={9} className="sm:w-2.5 sm:h-2.5" /> 
                            <span className="hidden xs:inline">{l.leave_to}</span>
                            <span className="xs:hidden">{l.leave_to.split('-').slice(1).join('-')}</span>
                          </span>
                        </div>
                        
                        <p className="text-emerald-950/70 text-xs sm:text-sm font-medium leading-relaxed italic border-l-2 border-emerald-100 pl-3 sm:pl-4">
                          "{l.content}"
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {l.file_path && (
                          <a href={l.file_path} target="_blank" className="p-2.5 sm:p-3 text-emerald-900/40 hover:text-emerald-900 transition-colors border border-emerald-100 rounded-xl hover:bg-emerald-50">
                            <Eye size={18} className="sm:w-5 sm:h-5" />
                          </a>
                        )}
                        <button onClick={() => approveLeave(l.id)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-100 text-emerald-800 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest hover:bg-emerald-900 hover:text-white transition-all">
                          <CheckCircle size={13} className="sm:w-3.5 sm:h-3.5" /> <span>Approve</span>
                        </button>
                        <button onClick={() => setRejectId(l.id)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-red-50 text-red-700 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest hover:bg-red-700 hover:text-white transition-all">
                          <XCircle size={13} className="sm:w-3.5 sm:h-3.5" /> <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  </ActivityCard>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="reports"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-3 sm:space-y-4"
            >
              {reports.length === 0 ? (
                <Empty text="Archive Empty: No mission reports submitted in this cycle" />
              ) : (
                reports.map(r => (
                  <ActivityCard key={r.id}>
                    <div className="flex flex-col gap-4 sm:gap-5 lg:gap-6">
                      {/* Header Section */}
                      <div className="flex items-start gap-2.5 sm:gap-3 lg:gap-4">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl lg:rounded-2xl bg-emerald-950 flex items-center justify-center text-amber-500 font-black shadow-lg shrink-0">
                          <FileText size={18} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
                          <h3 className="font-black text-emerald-950 leading-tight text-base sm:text-lg lg:text-xl line-clamp-2">
                            {r.title}
                          </h3>
                          <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2 text-[9px] sm:text-[10px] font-black text-emerald-900/40 uppercase tracking-wider sm:tracking-widest">
                            <span className="flex items-center gap-1.5 text-emerald-700">
                              <Users size={10} className="sm:w-3 sm:h-3" />
                              <span className="truncate max-w-[150px] sm:max-w-none">{r.name}</span>
                            </span>
                            <span className="hidden xs:inline text-emerald-900/20">•</span>
                            <span className="flex items-center gap-1.5">
                              <Calendar size={10} className="sm:w-3 sm:h-3 text-amber-500" />
                              {r.report_date}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="space-y-3 sm:space-y-4">
                        <p className="text-emerald-950/70 text-xs sm:text-sm lg:text-base font-medium leading-relaxed italic border-l-2 sm:border-l-4 border-emerald-200 bg-emerald-50/30 pl-3 sm:pl-4 lg:pl-5 py-2 sm:py-2.5 lg:py-3 rounded-r-lg line-clamp-4 sm:line-clamp-3 lg:line-clamp-none">
                          {r.content}
                        </p>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider
                            ${r.status === 'submitted' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}
                          `}>
                            <div className={`w-1.5 h-1.5 rounded-full ${r.status === 'submitted' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                            {r.status === 'submitted' ? 'Pending Review' : 'Reviewed'}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-emerald-900/5">
                        {r.file_path && (
                          <a 
                            href={r.file_path} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-emerald-900/60 hover:text-emerald-900 transition-all border border-emerald-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 font-bold text-[9px] sm:text-[10px] uppercase tracking-wider group"
                          >
                            <Eye size={16} className="sm:w-[18px] sm:h-[18px] group-hover:scale-110 transition-transform" />
                            <span className="hidden sm:inline">View Attachment</span>
                            <span className="sm:hidden">View File</span>
                          </a>
                        )}
                        {r.status === 'submitted' && (
                          <button 
                            onClick={() => reviewReport(r.id)} 
                            className="flex-1 xs:flex-none flex items-center justify-center gap-2 px-5 sm:px-7 lg:px-8 py-3 sm:py-3.5 bg-gradient-to-r from-emerald-900 to-emerald-800 text-amber-400 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest hover:from-emerald-950 hover:to-emerald-900 hover:shadow-2xl hover:shadow-emerald-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                          >
                            <CheckCircle size={14} className="sm:w-4 sm:h-4" />
                            <span>Mark as Reviewed</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </ActivityCard>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* REJECT MODAL */}
      <AnimatePresence>
        {rejectId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRejectId(null)} className="absolute inset-0 bg-emerald-950/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-2xl sm:rounded-[3rem] p-6 sm:p-8 lg:p-10 w-full max-w-md shadow-2xl border border-emerald-100">
              <div className="flex items-center gap-2 sm:gap-3 text-red-600 mb-4 sm:mb-6 font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[9px] sm:text-[10px]">
                <AlertCircle size={16} className="sm:w-[18px] sm:h-[18px]" /> Denial Protocol
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tighter mb-3 sm:mb-4">Reject Leave Application</h3>
              <textarea
                className="w-full bg-emerald-50 border border-emerald-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-sm sm:text-base text-emerald-900 font-medium outline-none focus:border-red-500 transition-all resize-none mb-4 sm:mb-6"
                rows={4}
                placeholder="State the technical reason for denial..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button onClick={() => setRejectId(null)} className="w-full sm:flex-1 py-3 sm:py-4 text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest text-emerald-900/40 hover:text-emerald-900 border border-emerald-100 rounded-xl sm:rounded-2xl hover:bg-emerald-50 transition-all">Abort</button>
                <button onClick={rejectLeave} className="w-full sm:flex-1 py-3 sm:py-4 bg-red-600 text-white rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest hover:bg-red-700 shadow-xl shadow-red-100">Confirm Rejection</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ActivityCard({ children }: any) {
  return (
    <motion.div whileHover={{ scale: 1.005 }} className="bg-white border border-emerald-900/5 p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl lg:rounded-[2.5rem] shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300">
      {children}
    </motion.div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 sm:py-24 lg:py-32 bg-white rounded-2xl sm:rounded-3xl lg:rounded-[4rem] border border-dashed border-emerald-900/10 text-center px-4 sm:px-6">
      <Users className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-emerald-900/5 mb-3 sm:mb-4" />
      <p className="text-emerald-900/20 font-black uppercase text-[9px] sm:text-xs tracking-wider sm:tracking-widest max-w-xs">{text}</p>
    </div>
  )
}