'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { apiClient } from '@/lib/api'
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
  const data = await apiClient.getMyReports()
  setReports(data)
    } catch {
      toast.error('Sync failed: Archive unreachable')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.content || !formData.reportDate) {
      toast.error('Please fill all required fields')
      return
    }

    setSubmitting(true)

    try {

  const fd = new FormData()
  fd.append('title', formData.title)
  fd.append('content', formData.content)
  fd.append('reportDate', formData.reportDate)
  if (formData.file) fd.append('reportFile', formData.file)

  await apiClient.submitReport(fd)

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
    <div className="flex flex-col items-center justify-center h-64 sm:h-80 lg:h-96 space-y-4 sm:space-y-6 px-4">
      <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-emerald-900" />
      <p className="text-emerald-900/50 font-black uppercase text-[9px] sm:text-[10px] tracking-[0.25em] sm:tracking-[0.3em] text-center">Accessing Registry...</p>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-12 py-6 sm:py-8 lg:py-12 space-y-8 sm:space-y-10 lg:space-y-12 bg-[#f8fafc] min-h-screen"
    >
      {/* HEADERBAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 sm:gap-6 border-b border-emerald-900/10 pb-6 sm:pb-8">
        <div className="space-y-1 sm:space-y-2">
          <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-800 font-black text-[9px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em]">
            <History className="w-3 h-3 sm:w-4 sm:h-4" /> Professional Archive
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-950 tracking-tighter italic leading-none">
            Work <span className="text-amber-500 not-italic">Report</span>
          </h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`w-full md:w-auto flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-black text-[9px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all duration-300 shadow-lg sm:shadow-xl ${
            showForm 
            ? 'bg-white text-emerald-900 border border-emerald-100 shadow-emerald-900/5 hover:bg-slate-50' 
            : 'bg-emerald-900 text-amber-500 shadow-emerald-900/20 hover:translate-y-[-2px]'
          }`}
        >
          {showForm ? <><X className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Abort</> : <><Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> New Entry</>}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="bg-white border border-emerald-900/5 p-5 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl lg:rounded-[3rem] shadow-xl sm:shadow-2xl space-y-6 sm:space-y-8 lg:space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
                <div className="space-y-2 group">
                  <label className="text-[9px] sm:text-[10px] font-black text-emerald-900/30 uppercase tracking-wider sm:tracking-widest flex items-center gap-1.5 sm:gap-2 group-focus-within:text-amber-500 transition-colors">
                    <FileText className="w-3 h-3" /> Project/Activity Title
                  </label>
                  <input
                    placeholder="Enter identifying title..."
                    className="w-full bg-white border-b-2 border-emerald-900/5 px-0 py-2 sm:py-3 text-sm sm:text-base text-emerald-950 font-bold outline-none focus:border-amber-500 transition-all placeholder:text-emerald-900/10"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2 group">
                  <label className="text-[9px] sm:text-[10px] font-black text-emerald-900/30 uppercase tracking-wider sm:tracking-widest flex items-center gap-1.5 sm:gap-2 group-focus-within:text-amber-500 transition-colors">
                    <Calendar className="w-3 h-3" /> Date of Report
                  </label>
                  <input
                    type="date"
                    title="Date of Execution"
                    aria-label="Date of Execution"
                    className="w-full bg-white border-b-2 border-emerald-900/5 px-0 py-2 sm:py-3 text-sm sm:text-base text-emerald-950 font-bold outline-none focus:border-amber-500 transition-all"
                    value={formData.reportDate}
                    onChange={e => setFormData({ ...formData, reportDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <label className="text-[9px] sm:text-[10px] font-black text-emerald-900/30 uppercase tracking-wider sm:tracking-widest flex items-center gap-1.5 sm:gap-2">
                  <FolderOpen className="w-3 h-3 text-amber-500" /> Write Report Summary
                </label>
                <textarea
                  rows={5}
                  className="w-full bg-emerald-50/20 border border-emerald-900/5 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl lg:rounded-[2rem] outline-none focus:border-amber-500 transition-all text-emerald-950 font-medium resize-none shadow-inner text-sm sm:text-base"
                  placeholder="Provide a detailed log of your objectives, challenges, and key results..."
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 p-4 sm:p-5 lg:p-6 bg-emerald-950 rounded-xl sm:rounded-2xl lg:rounded-[2rem] text-white">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="p-2 sm:p-3 bg-white/10 rounded-xl sm:rounded-2xl shrink-0">
                    <Paperclip className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] sm:text-[10px] font-black text-emerald-400 uppercase tracking-wider sm:tracking-widest">Attachments</p>
                    <p className="text-xs sm:text-sm font-bold truncate">
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
                <label htmlFor="file-upload" className="w-full sm:w-auto text-center cursor-pointer bg-white text-emerald-950 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest hover:bg-amber-500 transition-all">
                 Upload
                </label>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-3 sm:gap-4 bg-amber-500 text-emerald-950 py-4 sm:py-5 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] shadow-xl sm:shadow-2xl shadow-amber-500/20 hover:translate-y-[-2px] active:scale-95 transition-all disabled:opacity-50"
              >
                {submitting ? 'Encrypting...' : <><Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Submit Report</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FEED */}
      <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:gap-10">
        {reports.length === 0 ? (
          <div className="text-center py-20 sm:py-24 lg:py-32 bg-white rounded-2xl sm:rounded-3xl lg:rounded-[4rem] border border-emerald-900/5 flex flex-col items-center justify-center space-y-3 sm:space-y-4 shadow-sm px-4">
            <FolderOpen className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-emerald-900/5" />
            <p className="text-emerald-900/20 font-black uppercase text-[10px] sm:text-xs tracking-wider sm:tracking-widest">Archive Currently Empty</p>
          </div>
        ) : (
          reports.map((report, idx) => (
            <motion.div 
              key={report.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white border border-emerald-900/5 p-5 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl lg:rounded-[3rem] shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-500 group"
            >
              <div className="flex flex-col gap-4 sm:gap-6 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-emerald-50">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="space-y-2 sm:space-y-3 flex-1 min-w-0">
                    <h3 className="font-black text-xl sm:text-2xl text-emerald-950 group-hover:text-amber-600 transition-colors break-words leading-tight">
                      {report.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider sm:tracking-widest">
                      <span className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">
                        <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500" /> 
                        <span className="hidden xs:inline">Log:</span> {new Date(report.report_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">
                        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-800" /> 
                        <span className="hidden xs:inline">Filed:</span> {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest rounded-full border-2 shrink-0 ${
                      report.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}
                  >
                    {report.status === 'approved' ? <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                    <span>{report.status}</span>
                  </span>
                </div>
              </div>

              <p className="text-emerald-950/70 leading-relaxed font-medium mb-6 sm:mb-8 text-sm sm:text-base break-words">
                {report.content}
              </p>

              {report.file_path && (
                <a
                  href={report.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 sm:gap-3 text-amber-600 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] group/link hover:text-emerald-950 transition-all"
                >
                  <div className="p-1.5 sm:p-2 bg-amber-50 rounded-lg group-hover/link:bg-emerald-950 group-hover/link:text-white transition-all">
                    <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="hidden xs:inline">Inspect Documentation</span>
                  <span className="xs:hidden">View File</span>
                  <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-0 group-hover/link:opacity-100 transition-all" />
                </a>
              )}
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  )
}