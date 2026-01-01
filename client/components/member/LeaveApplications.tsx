'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { io } from 'socket.io-client'
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

const API = 'http://localhost:5005'

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
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/leaves/my-leaves`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error()
      setLeaves(await res.json())
    } catch {
      toast.error('Failed to access leave registry')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaves()
    const socket = io(API)
    socket.on('leave_update', data => {
      toast.info(`Registry Update: Leave ${data.type.replace('_', ' ')}`, {
        style: { backgroundColor: '#022c22', color: '#fbbf24' }
      })
      fetchLeaves()
    })
    return () => { socket.disconnect() }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const fd = new FormData()
      fd.append('title', formData.title)
      fd.append('content', formData.content)
      fd.append('leaveFrom', formData.leaveFrom)
      fd.append('leaveTo', formData.leaveTo)
      if (formData.file) fd.append('leaveFile', formData.file)

      const res = await fetch(`${API}/api/leaves/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      })

      if (!res.ok) throw new Error()

      toast.success('Application filed successfully')
      setShowForm(false)
      setFormData({ title: '', content: '', leaveFrom: '', leaveTo: '', file: null })
      fetchLeaves()
    } catch {
      toast.error('Submission failed: Protocol error')
    } finally {
      setSubmitting(false)
    }
  }

  const cancelLeave = async (id: number) => {
    if (!confirm('Are you sure you want to revoke this application?')) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/leaves/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error()
      toast.success('Application successfully revoked')
      fetchLeaves()
    } catch {
      toast.error('Revocation denied')
    }
  }

  const getStatusDetails = (l: any) => {
    if (l.head_approval && l.gs_approval) 
      return { label: 'Authorized', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <CheckCircle2 size={12}/> }
    if (l.head_approval) 
      return { label: 'Head Verified', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: <ShieldCheck size={12}/> }
    return { label: 'In Review', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: <Clock size={12}/> }
  }

   if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 space-y-6">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-900" />
      <p className="text-emerald-900/50 font-black uppercase text-[10px] tracking-[0.3em]">Accessing Registry...</p>
    </div>
  )
  return (
    <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-12 bg-[#f8fafc] min-h-screen">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-emerald-900/10 pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 font-black text-[10px] uppercase tracking-[0.4em]">
            <Compass className="w-4 h-4" /> Global Time-Off Protocol
          </div>
          <h1 className="text-5xl font-black text-emerald-950 tracking-tighter italic">
            Leave <span className="text-amber-500 not-italic">Management</span>
          </h1>
        </div>
        
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center justify-center gap-3 px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 shadow-2xl ${
            showForm 
            ? 'bg-white text-emerald-950 border border-emerald-100' 
            : 'bg-emerald-900 text-amber-500 hover:translate-y-[-2px] shadow-emerald-900/20'
          }`}
        >
          {showForm ? <X size={16}/> : <Plus size={16}/>}
          {showForm ? 'Abort Filing' : 'Establish New Request'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <form onSubmit={handleSubmit} className="bg-white border border-emerald-900/5 p-10 md:p-16 rounded-[4rem] shadow-2xl space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-3 group md:col-span-2">
                  <label className="text-[10px] font-black text-emerald-900/30 uppercase tracking-widest flex items-center gap-2 group-focus-within:text-amber-500 transition-colors">
                    <FileText className="w-3 h-3" /> Application nomenclature
                  </label>
                  <input required className="w-full bg-white border-b-2 border-emerald-900/5 px-0 py-3 text-emerald-950 font-bold outline-none focus:border-amber-500 transition-all placeholder:text-emerald-900/10 text-xl" 
                    placeholder="Enter the primary reason for absence..."
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })} />
                </div>

                <div className="space-y-3 group md:col-span-2">
                  <label className="text-[10px] font-black text-emerald-900/30 uppercase tracking-widest flex items-center gap-2 group-focus-within:text-amber-500 transition-colors">
                    Executive Justification
                  </label>
                  <textarea required className="w-full bg-emerald-50/20 border border-emerald-900/5 p-6 rounded-[2rem] outline-none focus:border-amber-500 transition-all text-emerald-950 font-medium resize-none min-h-[140px]" 
                    placeholder="Provide a detailed context for the approval committee..."
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })} />
                </div>

                <div className="space-y-3 group">
                  <label className="text-[10px] font-black text-emerald-900/30 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-amber-500" /> Commencement Date
                  </label>
                  <input type="date" required className="w-full bg-white border-b-2 border-emerald-900/5 px-0 py-3 text-emerald-950 font-bold outline-none focus:border-amber-500 transition-all"
                    value={formData.leaveFrom}
                    onChange={e => setFormData({ ...formData, leaveFrom: e.target.value })} />
                </div>

                <div className="space-y-3 group">
                  <label className="text-[10px] font-black text-emerald-900/30 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-amber-500" /> Resumption Date
                  </label>
                  <input type="date" required className="w-full bg-white border-b-2 border-emerald-900/5 px-0 py-3 text-emerald-950 font-bold outline-none focus:border-amber-500 transition-all"
                    value={formData.leaveTo}
                    onChange={e => setFormData({ ...formData, leaveTo: e.target.value })} />
                </div>

                <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-black text-emerald-900/30 uppercase tracking-widest flex items-center gap-2">Supporting Evidence</label>
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-emerald-950 rounded-[2rem] text-white">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/10 rounded-2xl text-amber-500">
                        <Paperclip size={20} />
                      </div>
                      <div className="truncate max-w-[200px]">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">Attachment Log</p>
                        <p className="text-xs font-bold mt-1">{formData.file ? formData.file.name : 'No file detected'}</p>
                      </div>
                    </div>
                    <input type="file" id="file-upload" className="hidden"
                      onChange={e => setFormData({ ...formData, file: e.target.files?.[0] || null })} />
                    <label htmlFor="file-upload" className="cursor-pointer bg-white text-emerald-950 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 transition-all">
                      Upload
                    </label>
                  </div>
                </div>
              </div>

              <button 
                disabled={submitting} 
                className="w-full bg-emerald-900 text-amber-500 py-6 rounded-full font-black text-xs uppercase tracking-[0.4em] hover:bg-emerald-800 disabled:opacity-50 transition-all shadow-2xl shadow-emerald-900/20"
              >
                {submitting ? 'Encrypting Request...' : 'Authorize Submission'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIST SECTION */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
           <h3 className="text-xs font-black text-emerald-900/30 uppercase tracking-[0.4em] flex items-center gap-3">
              Filing History
           </h3>
           <div className="h-[2px] flex-1 mx-8 bg-emerald-900/5" />
        </div>

        {leaves.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[4rem] border border-emerald-900/5 shadow-sm flex flex-col items-center">
            <Calendar className="text-emerald-900/5 w-20 h-20 mb-4" />
            <p className="text-emerald-900/20 font-black uppercase text-xs tracking-widest">No existing applications in registry</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10">
            {leaves.map((l, index) => {
              const status = getStatusDetails(l)
              return (
                <motion.div 
                  key={l.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white border border-emerald-900/5 p-10 rounded-[3rem] shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-500 group"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                    <div className="space-y-6 flex-1">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <span className={`inline-flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${status.color}`}>
                          {status.icon} {status.label}
                        </span>
                        <h3 className="font-black text-2xl text-emerald-950 group-hover:text-amber-600 transition-colors">
                          {l.title}
                        </h3>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-3 bg-emerald-50/50 px-5 py-2.5 rounded-2xl border border-emerald-900/5">
                          <Calendar size={14} className="text-amber-500"/>
                          <span className="text-xs font-black text-emerald-950 uppercase tabular-nums">
                            {new Date(l.leave_from).toLocaleDateString()}
                          </span>
                          <ChevronRight size={14} className="text-emerald-900/20"/>
                          <span className="text-xs font-black text-emerald-950 uppercase tabular-nums">
                            {new Date(l.leave_to).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {l.file_path && (
                          <a 
                            href={l.file_path} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-amber-600 font-black text-[10px] uppercase tracking-widest hover:text-emerald-950 transition-colors group/link"
                          >
                            <Paperclip size={14}/> View Dossier <ArrowUpRight size={12} className="opacity-0 group-hover/link:opacity-100 transition-all"/>
                          </a>
                        )}
                      </div>
                      
                      <p className="text-emerald-950/60 leading-relaxed font-medium text-sm md:text-base italic">
                        "{l.content}"
                      </p>
                    </div>

                    {!l.gs_approval && (
                      <button
                        onClick={() => cancelLeave(l.id)}
                        className="p-4 text-emerald-900/20 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                        title="Revoke Filing"
                      >
                        <Trash2 size={24}/>
                      </button>
                    )}
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