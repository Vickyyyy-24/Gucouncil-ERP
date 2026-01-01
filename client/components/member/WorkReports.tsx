'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { 
  Plus, 
  X, 
  FileText, 
  Calendar, 
  Paperclip, 
  CheckCircle2, 
  Clock, 
  Send,
  History,
  FolderOpen,
  ArrowUpRight
} from 'lucide-react'

export default function WorkReports() {
  const [reports, setReports] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    reportDate: new Date().toISOString().split('T')[0],
    file: null as File | null
  })

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5005/api/reports/my-reports', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setReports(data)
    } catch {
      toast.error('Sync failed: Archive unreachable')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      const fd = new FormData()
      fd.append('title', formData.title)
      fd.append('content', formData.content)
      fd.append('reportDate', formData.reportDate)
      if (formData.file) fd.append('reportFile', formData.file)

      const res = await fetch('http://localhost:5005/api/reports/submit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      toast.success('Report successfully logged')
      setShowForm(false)
      setFormData({
        title: '',
        content: '',
        reportDate: new Date().toISOString().split('T')[0],
        file: null
      })
      fetchReports()
    } catch (err: any) {
      toast.error(err.message || 'Transmission error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 space-y-6">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-900" />
      <p className="text-emerald-900/50 font-black uppercase text-[10px] tracking-[0.3em]">Accessing Registry...</p>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto space-y-10 pb-20 px-4"
    >
      {/* HEADERBAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-emerald-900/10 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-800 font-black text-xs uppercase tracking-[0.4em]">
            <History className="w-4 h-4" /> Professional Archive
          </div>
          <h1 className="text-4xl font-black text-emerald-950 tracking-tighter italic">
            Work <span className="text-amber-500 not-italic">Ledger</span>
          </h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-3 px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 shadow-xl ${
            showForm 
            ? 'bg-white text-emerald-900 border border-emerald-100 shadow-emerald-900/5 hover:bg-slate-50' 
            : 'bg-emerald-900 text-amber-500 shadow-emerald-900/20 hover:translate-y-[-2px]'
          }`}
        >
          {showForm ? <><X className="w-4 h-4" /> Abort</> : <><Plus className="w-4 h-4" /> New Entry</>}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <form onSubmit={handleSubmit} className="bg-white border border-emerald-900/5 p-10 rounded-[3rem] shadow-2xl space-y-10">
              <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-emerald-900/30 uppercase tracking-widest flex items-center gap-2 group-focus-within:text-amber-500 transition-colors">
                    <FileText className="w-3 h-3" /> Project/Activity Title
                  </label>
                  <input
                    required
                    placeholder="Enter identifying title..."
                    className="w-full bg-white border-b-2 border-emerald-900/5 px-0 py-3 text-emerald-950 font-bold outline-none focus:border-amber-500 transition-all placeholder:text-emerald-900/10"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-emerald-900/30 uppercase tracking-widest flex items-center gap-2 group-focus-within:text-amber-500 transition-colors">
                    <Calendar className="w-3 h-3" /> Date of Execution
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full bg-white border-b-2 border-emerald-900/5 px-0 py-3 text-emerald-950 font-bold outline-none focus:border-amber-500 transition-all"
                    value={formData.reportDate}
                    onChange={e => setFormData({ ...formData, reportDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-emerald-900/30 uppercase tracking-widest flex items-center gap-2">
                  <FolderOpen className="w-3 h-3 text-amber-500" /> Executive Summary
                </label>
                <textarea
                  required
                  rows={6}
                  className="w-full bg-emerald-50/20 border border-emerald-900/5 p-6 rounded-[2rem] outline-none focus:border-amber-500 transition-all text-emerald-950 font-medium resize-none shadow-inner"
                  placeholder="Provide a detailed log of your objectives, challenges, and key results..."
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                />
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-emerald-950 rounded-[2rem] text-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl">
                    <Paperclip className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Supporting Evidence</p>
                    <p className="text-xs font-bold truncate max-w-[200px]">
                      {formData.file ? formData.file.name : 'No file attached'}
                    </p>
                  </div>
                </div>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={e => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                />
                <label htmlFor="file-upload" className="cursor-pointer bg-white text-emerald-950 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 transition-all">
                 Upload
                </label>
              </div>

              <button
                disabled={submitting}
                className="w-full flex items-center justify-center gap-4 bg-amber-500 text-emerald-950 py-5 rounded-full font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-amber-500/20 hover:translate-y-[-2px] active:scale-95 transition-all disabled:opacity-50"
              >
                {submitting ? 'Encrypting...' : <><Send className="w-4 h-4" /> Authorize Entry</>}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FEED */}
      <div className="grid grid-cols-1 gap-10">
        {reports.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[4rem] border border-emerald-900/5 flex flex-col items-center justify-center space-y-4 shadow-sm">
            <FolderOpen className="w-16 h-16 text-emerald-900/5" />
            <p className="text-emerald-900/20 font-black uppercase text-xs tracking-widest">Archive Currently Empty</p>
          </div>
        ) : (
          reports.map((report, idx) => (
            <motion.div 
              key={report.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white border border-emerald-900/5 p-10 rounded-[3rem] shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-500 group"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-8 border-b border-emerald-50">
                <div className="space-y-2">
                  <h3 className="font-black text-2xl text-emerald-950 group-hover:text-amber-600 transition-colors">
                    {report.title}
                  </h3>
                  <div className="flex items-center gap-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full"><Calendar className="w-3 h-3 text-amber-500" /> Log: {new Date(report.report_date).toLocaleDateString()}</span>
                    <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full"><Clock className="w-3 h-3 text-emerald-800" /> Filed: {new Date(report.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <span
                  className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-full border-2 ${
                    report.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}
                >
                  {report.status === 'approved' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  {report.status}
                </span>
              </div>

              <p className="text-emerald-950/70 leading-relaxed font-medium mb-8 text-sm md:text-base">
                {report.content}
              </p>

              {report.file_path && (
                <a
                  href={report.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 text-amber-600 text-[10px] font-black uppercase tracking-[0.2em] group/link hover:text-emerald-950 transition-all"
                >
                  <div className="p-2 bg-amber-50 rounded-lg group-hover/link:bg-emerald-950 group-hover/link:text-white transition-all">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  Inspect Documentation <ArrowUpRight className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-all" />
                </a>
              )}
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  )
}