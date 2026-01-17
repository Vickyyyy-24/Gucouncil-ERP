'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { apiClient } from '@/lib/api'
import { onSocketEvent } from '@/lib/socket'
import { 
  Plus, 
  X, 
  Calendar, 
  FileText, 
  Paperclip, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Compass,
  ArrowUpRight
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005'

export default function LeaveApplications() {
  const [leaves, setLeaves] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    leaveFrom: '',
    leaveTo: '',
    file: null as File | null
  })

  const fetchLeaves = async () => {
    try {
      const data = await apiClient.getMyLeaves()
      setLeaves(data)
      console.log('✅ Leaves loaded successfully')
    } catch (err) {
      console.error('❌ Failed to fetch leaves:', err)
      toast.error('Failed to access leave registry')
    } finally {
      setLoading(false)
    }
  }

  /* ================= FETCH LEAVES ON MOUNT ================= */
  useEffect(() => {
    fetchLeaves()
  }, [])

  /* ================= SOCKET LISTENER FOR LEAVE UPDATES ================= */
  useEffect(() => {
    try {
      const unsubscribe = onSocketEvent('leave_update', (data) => {
        console.log('📡 leave_update event received:', data)
        toast.info(`Registry Update: Leave ${data.type.replace('_', ' ')}`, {
          style: { backgroundColor: '#022c22', color: '#fbbf24' }
        })
        console.log('✅ Refreshing leaves list after socket update')
        fetchLeaves()
      })

      return () => {
        console.log('🧹 Cleaning up leave applications socket listener')
        unsubscribe()
      }
    } catch (error) {
      console.error('❌ Socket listener error:', error)
    }
  }, [])

  const handleSubmit = async () => {
    if (!formData.title || !formData.content || !formData.leaveFrom || !formData.leaveTo) {
      toast.error('Please fill all required fields')
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('title', formData.title)
      fd.append('content', formData.content)
      fd.append('leaveFrom', formData.leaveFrom)
      fd.append('leaveTo', formData.leaveTo)
      if (formData.file) fd.append('leaveFile', formData.file)

      await apiClient.applyLeave(fd)

      toast.success('Application filed successfully')
      setShowForm(false)
      setFormData({ title: '', content: '', leaveFrom: '', leaveTo: '', file: null })
      fetchLeaves()
    } catch (err) {
      console.error('❌ Leave submission failed:', err)
      toast.error('Submission failed: Protocol error')
    } finally {
      setSubmitting(false)
    }
  }

  const cancelLeave = async (id: number) => {
    if (!confirm('Are you sure you want to revoke this application?')) return
    try {
      await apiClient.delete(`/api/leaves/${id}`)
      toast.success('Application successfully revoked')
      fetchLeaves()
    } catch (err) {
      console.error('❌ Leave cancellation failed:', err)
      toast.error('Revocation denied')
    }
  }

  const getStatusDetails = (l: any) => {
    if (l.head_approval && l.gs_approval) 
      return { label: 'Authorized', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <CheckCircle2 size={12} className="sm:w-3.5 sm:h-3.5"/> }
    if (l.head_approval) 
      return { label: 'Head Verified', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: <ShieldCheck size={12} className="sm:w-3.5 sm:h-3.5"/> }
    return { label: 'In Review', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: <Clock size={12} className="sm:w-3.5 sm:h-3.5"/> }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 sm:h-80 lg:h-96 space-y-4 sm:space-y-6 px-4">
      <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-emerald-900" />
      <p className="text-emerald-900/50 font-black uppercase text-[9px] sm:text-[10px] tracking-[0.25em] sm:tracking-[0.3em] text-center">Accessing Registry...</p>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-12 py-6 sm:py-8 lg:py-12 space-y-8 sm:space-y-10 lg:space-y-12 bg-[#f8fafc] min-h-screen">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 border-b border-emerald-900/10 pb-6 sm:pb-8 lg:pb-10">
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-800 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.3em] sm:tracking-[0.4em]">
            <Compass className="w-3 h-3 sm:w-4 sm:h-4" />Time-Off Protocol
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-emerald-950 tracking-tighter italic leading-none">
            Leave <span className="text-amber-500 not-italic">Application</span>
          </h1>
        </div>
        
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`w-full md:w-auto flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 lg:px-10 py-3 sm:py-3.5 lg:py-4 rounded-full font-black text-[9px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all duration-500 shadow-xl sm:shadow-2xl ${
            showForm 
            ? 'bg-white text-emerald-950 border border-emerald-100' 
            : 'bg-emerald-900 text-amber-500 hover:translate-y-[-2px] shadow-emerald-900/20'
          }`}
        >
          {showForm ? <X size={14} className="sm:w-4 sm:h-4"/> : <Plus size={14} className="sm:w-4 sm:h-4"/>}
          <span className="hidden sm:inline">{showForm ? 'Abort' : 'New Request'}</span>
          <span className="sm:hidden">{showForm ? 'Cancel' : 'New Request'}</span>
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <div className="bg-white border border-emerald-900/5 p-5 sm:p-8 md:p-10 lg:p-16 rounded-2xl sm:rounded-3xl lg:rounded-[4rem] shadow-xl sm:shadow-2xl space-y-8 sm:space-y-10 lg:space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
                <div className="space-y-2 sm:space-y-3 group md:col-span-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-emerald-900/30 uppercase tracking-wider sm:tracking-widest flex items-center gap-1.5 sm:gap-2 group-focus-within:text-amber-500 transition-colors">
                    <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Application Title
                  </label>
                  <input className="w-full bg-white border-b-2 border-emerald-900/5 px-0 py-2 sm:py-3 text-emerald-950 font-bold outline-none focus:border-amber-500 transition-all placeholder:text-emerald-900/10 text-base sm:text-lg lg:text-xl" 
                    placeholder="Enter the primary reason for absence..."
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })} />
                </div>

                <div className="space-y-2 sm:space-y-3 group md:col-span-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-emerald-900/30 uppercase tracking-wider sm:tracking-widest flex items-center gap-1.5 sm:gap-2 group-focus-within:text-amber-500 transition-colors">
                    Reason for Leave
                  </label>
                  <textarea className="w-full bg-emerald-50/20 border border-emerald-900/5 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl lg:rounded-[2rem] outline-none focus:border-amber-500 transition-all text-emerald-950 font-medium resize-none min-h-[120px] sm:min-h-[140px] text-sm sm:text-base" 
                    placeholder="Provide a detailed context for the approval committee..."
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })} />
                </div>

                <div className="space-y-2 sm:space-y-3 group">
                  <label className="text-[9px] sm:text-[10px] font-black text-emerald-900/30 uppercase tracking-wider sm:tracking-widest flex items-center gap-1.5 sm:gap-2">
                    <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500" /> Commencement Date
                  </label>
                  <input type="date" title="Commencement Date" aria-label="Commencement Date" className="w-full bg-white border-b-2 border-emerald-900/5 px-0 py-2 sm:py-3 text-emerald-950 font-bold outline-none focus:border-amber-500 transition-all text-sm sm:text-base"
                    value={formData.leaveFrom}
                    onChange={e => setFormData({ ...formData, leaveFrom: e.target.value })} />
                </div>

                <div className="space-y-2 sm:space-y-3 group">
                  <label className="text-[9px] sm:text-[10px] font-black text-emerald-900/30 uppercase tracking-wider sm:tracking-widest flex items-center gap-1.5 sm:gap-2">
                    <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500" /> Resumption Date
                  </label>
                  <input type="date" title="Resumption Date" aria-label="Resumption Date" className="w-full bg-white border-b-2 border-emerald-900/5 px-0 py-2 sm:py-3 text-emerald-950 font-bold outline-none focus:border-amber-500 transition-all text-sm sm:text-base"
                    value={formData.leaveTo}
                    onChange={e => setFormData({ ...formData, leaveTo: e.target.value })} />
                </div>

                <div className="space-y-2 sm:space-y-3 md:col-span-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-emerald-900/30 uppercase tracking-wider sm:tracking-widest flex items-center gap-1.5 sm:gap-2">Supporting Evidence</label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 p-4 sm:p-5 lg:p-6 bg-emerald-950 rounded-xl sm:rounded-2xl lg:rounded-[2rem] text-white">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="p-2 sm:p-3 bg-white/10 rounded-xl sm:rounded-2xl text-amber-500 shrink-0">
                        <Paperclip size={18} className="sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] sm:text-[10px] font-black text-emerald-400 uppercase tracking-wider sm:tracking-widest leading-none">Attachments</p>
                        <p className="text-xs sm:text-sm font-bold mt-1 truncate">{formData.file ? formData.file.name : 'No file detected'}</p>
                      </div>
                    </div>
                    <input type="file" id="file-upload" className="hidden"
                      onChange={e => setFormData({ ...formData, file: e.target.files?.[0] || null })} />
                    <label htmlFor="file-upload" className="w-full sm:w-auto text-center cursor-pointer bg-white text-emerald-950 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest hover:bg-amber-500 transition-all">
                      Upload
                    </label>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSubmit}
                disabled={submitting} 
                className="w-full bg-emerald-900 text-amber-500 py-4 sm:py-5 lg:py-6 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] hover:bg-emerald-800 disabled:opacity-50 transition-all shadow-xl sm:shadow-2xl shadow-emerald-900/20"
              >
                {submitting ? 'Submitting Request...' : 'Confirm Submission'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIST SECTION */}
      <div className="space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between gap-4">
           <h3 className="text-[10px] sm:text-xs font-black text-emerald-900/30 uppercase tracking-[0.3em] sm:tracking-[0.4em] flex items-center gap-2 sm:gap-3 whitespace-nowrap">
              Filing History
           </h3>
           <div className="h-[2px] flex-1 bg-emerald-900/5" />
        </div>

        {leaves.length === 0 ? (
          <div className="text-center py-20 sm:py-24 lg:py-32 bg-white rounded-2xl sm:rounded-3xl lg:rounded-[4rem] border border-emerald-900/5 shadow-sm flex flex-col items-center px-4">
            <Calendar className="text-emerald-900/5 w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 mb-3 sm:mb-4" />
            <p className="text-emerald-900/20 font-black uppercase text-[10px] sm:text-xs tracking-wider sm:tracking-widest">No existing applications</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:gap-10">
            {leaves.map((l, index) => {
              const status = getStatusDetails(l)
              return (
                <motion.div 
                  key={l.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white border border-emerald-900/5 p-5 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl lg:rounded-[3rem] shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-500 group"
                >
                  <div className="flex flex-col gap-6 sm:gap-8">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6">
                      <div className="space-y-4 sm:space-y-6 flex-1 min-w-0">
                        <div className="flex flex-col gap-3 sm:gap-4">
                          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                            <span className={`inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest border ${status.color}`}>
                              {status.icon} {status.label}
                            </span>
                          </div>
                          <h3 className="font-black text-xl sm:text-2xl text-emerald-950 group-hover:text-amber-600 transition-colors break-words leading-tight">
                            {l.title}
                          </h3>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6">
                          <div className="flex items-center gap-2 sm:gap-3 bg-emerald-50/50 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border border-emerald-900/5">
                            <Calendar size={12} className="sm:w-3.5 sm:h-3.5 text-amber-500"/>
                            <span className="text-[10px] sm:text-xs font-black text-emerald-950 uppercase tabular-nums">
                              {new Date(l.leave_from).toLocaleDateString()}
                            </span>
                            <ChevronRight size={12} className="sm:w-3.5 sm:h-3.5 text-emerald-900/20"/>
                            <span className="text-[10px] sm:text-xs font-black text-emerald-950 uppercase tabular-nums">
                              {new Date(l.leave_to).toLocaleDateString()}
                            </span>
                          </div>
                          
                          {l.file_path && (
                            <a 
                              href={l.file_path} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 sm:gap-2 text-amber-600 font-black text-[9px] sm:text-[10px] uppercase tracking-wider sm:tracking-widest hover:text-emerald-950 transition-colors group/link"
                            >
                              <Paperclip size={12} className="sm:w-3.5 sm:h-3.5"/> 
                              <span className="hidden xs:inline">View Dossier</span>
                              <span className="xs:hidden">File</span>
                              <ArrowUpRight size={10} className="sm:w-3 sm:h-3 opacity-0 group-hover/link:opacity-100 transition-all"/>
                            </a>
                          )}
                        </div>
                        
                        <p className="text-emerald-950/60 leading-relaxed font-medium text-sm sm:text-base italic break-words">
                          "{l.content}"
                        </p>
                      </div>

                      {!l.gs_approval && (
                        <button
                          onClick={() => cancelLeave(l.id)}
                          className="self-end sm:self-start p-3 sm:p-4 text-emerald-900/20 hover:text-red-600 hover:bg-red-50 rounded-xl sm:rounded-2xl transition-all shrink-0"
                          title="Revoke Filing"
                        >
                          <Trash2 size={20} className="sm:w-6 sm:h-6"/>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}