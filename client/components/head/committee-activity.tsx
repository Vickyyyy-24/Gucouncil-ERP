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
      toast.info('Ledger Update: Leave status synchronized', { icon: <ShieldCheck className="text-orange-500"/> })
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
  const { apiClient } = await import('@/lib/api')
  const data = await apiClient.get('/api/head/committee/leaves')
  setLeaves(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Registry Error: Failed to load leave applications')
    }
  }

  const fetchReports = async () => {
    try {
  const { apiClient } = await import('@/lib/api')
  const data = await apiClient.get('/api/head/committee/reports')
  setReports(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Registry Error: Failed to load work reports')
    }
  }

  const approveLeave = async (id: number) => {
  const { apiClient } = await import('@/lib/api')
  await apiClient.post(`/api/head/approve-leave/${id}`, {})
    toast.success('Authorization Granted: Leave Approved')
    fetchLeaves()
  }

  const rejectLeave = async () => {
    if (!rejectId || !rejectReason) return
  await (await import('@/lib/api')).apiClient.post(`/api/head/reject-leave/${rejectId}`, { reason: rejectReason })
    toast.warn('Authorization Denied: Application Rejected')
    setRejectId(null)
    setRejectReason('')
    fetchLeaves()
  }

  const reviewReport = async (id: number) => {
    await (await import('@/lib/api')).apiClient.post(`/api/head/review-report/${id}`, {})
    toast.success('Audit Logged: Report Reviewed')
    fetchReports()
  }

  if (loading) return (
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
          Syncing Activity Registry...
        </motion.p>
      </motion.div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#1A1A1A] p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* HEADER SECTION */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 border-b border-orange-500/10 pb-6 sm:pb-8"
        >
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 text-orange-500 font-bold text-xs sm:text-sm uppercase tracking-wider">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" /> Real-time Audit Stream
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-none">
              Committee <span className="text-orange-500">Activity</span>
            </h1>
          </div>

          <div className="flex w-full md:w-auto bg-[#252525] p-1 sm:p-1.5 rounded-xl border border-orange-500/10 shadow-inner">
            {(['leaves', 'reports'] as Tab[]).map(t => (
              <motion.button
                key={t}
                onClick={() => setTab(t)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 md:flex-none px-6 sm:px-8 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300
                  ${tab === t ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30' : 'text-gray-400 hover:text-white'}
                `}
              >
                {t}
              </motion.button>
            ))}
          </div>
        </motion.div>

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
                  leaves.map((l, idx) => (
                    <ActivityCard key={l.id} delay={idx * 0.05}>
                      <div className="flex flex-col gap-4 sm:gap-6">
                        <div className="flex-1 space-y-3 sm:space-y-4">
                          <div className="flex items-center gap-2.5 sm:gap-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold shadow-lg text-base sm:text-lg">
                              {l.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-white leading-none text-base sm:text-lg truncate">{l.name}</p>
                              <p className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wide mt-1">Applicant Registry</p>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                            <span className="flex items-center gap-1.5 bg-[#2A2A2A] px-3 py-1.5 rounded-lg text-orange-400 border border-orange-500/20">
                              <Calendar size={14} className="text-orange-500" /> 
                              <span className="hidden xs:inline">{l.leave_from}</span>
                              <span className="xs:hidden">{l.leave_from.split('-').slice(1).join('-')}</span>
                              <ChevronRight size={12} /> 
                              <span className="hidden xs:inline">{l.leave_to}</span>
                              <span className="xs:hidden">{l.leave_to.split('-').slice(1).join('-')}</span>
                            </span>
                          </div>
                          
                          <p className="text-white/70 text-sm sm:text-base font-medium leading-relaxed border-l-2 border-orange-500/30 pl-4 bg-[#2A2A2A]/30 py-2 rounded-r">
                            "{l.content}"
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-3 border-t border-orange-500/10">
                          {l.file_path && (
                            <a href={l.file_path} target="_blank" title="Open attachment" rel="noreferrer" className="p-3 text-gray-400 hover:text-orange-500 transition-colors border border-orange-500/20 rounded-xl hover:bg-[#2A2A2A] hover:border-orange-500/30">
                              <Eye size={20} />
                            </a>
                          )}
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => approveLeave(l.id)} 
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20 hover:border-emerald-500 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/30"
                          >
                            <CheckCircle size={16} /> <span>Approve</span>
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setRejectId(l.id)} 
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-red-600 hover:text-white transition-all border border-red-500/20 hover:border-red-500 shadow-lg shadow-red-500/10 hover:shadow-red-500/30"
                          >
                            <XCircle size={16} /> <span>Reject</span>
                          </motion.button>
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
                  reports.map((r, idx) => (
                    <ActivityCard key={r.id} delay={idx * 0.05}>
                      <div className="flex flex-col gap-4 sm:gap-5 lg:gap-6">
                        {/* Header Section */}
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold shadow-lg shrink-0">
                            <FileText size={24} className="sm:w-7 sm:h-7" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <h3 className="font-bold text-white leading-tight text-lg sm:text-xl line-clamp-2">
                              {r.title}
                            </h3>
                            <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                              <span className="flex items-center gap-1.5 text-orange-400">
                                <Users size={12} />
                                <span className="truncate max-w-[150px] sm:max-w-none">{r.name}</span>
                              </span>
                              <span className="hidden xs:inline text-gray-600">•</span>
                              <span className="flex items-center gap-1.5">
                                <Calendar size={12} className="text-orange-500" />
                                {r.report_date}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Content Section */}
                        <div className="space-y-3 sm:space-y-4">
                          <p className="text-white/70 text-sm sm:text-base font-medium leading-relaxed border-l-2 border-orange-500/30 bg-[#2A2A2A]/30 pl-4 py-3 rounded-r line-clamp-4 sm:line-clamp-3 lg:line-clamp-none">
                            {r.content}
                          </p>

                          {/* Status Badge */}
                          <div className="flex items-center gap-2">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide
                              ${r.status === 'submitted' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}
                            `}>
                              <div className={`w-2 h-2 rounded-full ${r.status === 'submitted' ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`} />
                              {r.status === 'submitted' ? 'Pending Review' : 'Reviewed'}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3 pt-3 border-t border-orange-500/10">
                          {r.file_path && (
                            <a 
                              href={r.file_path} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 px-5 py-3 text-gray-400 hover:text-orange-500 transition-all border border-orange-500/20 rounded-xl hover:bg-[#2A2A2A] hover:border-orange-500/30 font-bold text-xs uppercase tracking-wide group"
                            >
                              <Eye size={18} className="group-hover:scale-110 transition-transform" />
                              <span className="hidden sm:inline">View Attachment</span>
                              <span className="sm:hidden">View File</span>
                            </a>
                          )}
                          {r.status === 'submitted' && (
                            <motion.button 
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => reviewReport(r.id)} 
                              className="flex-1 xs:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-wide hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all"
                            >
                              <CheckCircle size={16} />
                              <span>Mark as Reviewed</span>
                            </motion.button>
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
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setRejectId(null)} 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }} 
                className="relative bg-[#252525] rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 w-full max-w-md shadow-2xl border border-orange-500/20"
              >
                <div className="flex items-center gap-2 sm:gap-3 text-red-500 mb-4 sm:mb-6 font-bold uppercase tracking-wide text-xs">
                  <AlertCircle size={18} /> Denial Protocol
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">Reject Leave Application</h3>
                <textarea
                  className="w-full bg-[#1A1A1A] border border-orange-500/20 rounded-xl p-4 sm:p-5 text-sm sm:text-base text-white font-medium outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all resize-none mb-6 placeholder:text-gray-500"
                  rows={4}
                  placeholder="State the technical reason for denial..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setRejectId(null)} 
                    className="w-full sm:flex-1 py-3 sm:py-4 text-xs font-bold uppercase tracking-wide text-gray-400 hover:text-white border border-orange-500/20 rounded-xl hover:bg-[#2A2A2A] transition-all"
                  >
                    Abort
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={rejectLeave} 
                    className="w-full sm:flex-1 py-3 sm:py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wide hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all"
                  >
                    Confirm Rejection
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function ActivityCard({ children, delay = 0 }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -2, scale: 1.005 }} 
      className="bg-[#252525] border border-orange-500/10 p-5 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl hover:shadow-orange-500/5 hover:border-orange-500/20 transition-all duration-300"
    >
      {children}
    </motion.div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 sm:py-24 lg:py-32 bg-[#252525] rounded-2xl sm:rounded-3xl border border-dashed border-orange-500/20 text-center px-4 sm:px-6"
    >
      <Users className="w-14 h-14 sm:w-16 sm:h-16 text-orange-500/20 mb-4" />
      <p className="text-gray-400 font-bold uppercase text-xs sm:text-sm tracking-wide max-w-xs">{text}</p>
    </motion.div>
  )
}