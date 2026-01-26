'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  FileText, 
  AlertCircle, 
  Loader2, 
  CalendarClock, 
  ClipboardList,
  User,
  Calendar,
  Clock
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005'

export default function GsCommitteeActivity() {
  const [tab, setTab] = useState<'leaves' | 'reports'>('leaves')
  const [data, setData] = useState<any>({})
  const [processedIds, setProcessedIds] = useState<Set<number>>(new Set())
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    setToken(storedToken)
  }, [])

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [tab, token])

  const fetchData = async () => {
    if (!token) {
      setError('No authentication token found. Please log in.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const endpoint = tab === 'leaves' ? '/api/gs/leaves/pending' : '/api/gs/reports/pending'
      const res = await fetch(`${API}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        let errorMsg = `Error ${res.status}`
        if (res.status === 401) errorMsg = 'Token expired - please log in again'
        else if (res.status === 403) errorMsg = 'Access denied - you need GS role to view this'
        setError(errorMsg)
        return
      }

      const result = await res.json()
      setData(result)
    } catch (error) {
      setError('Failed to load data. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  const approveLeave = async (id: number) => {
    try {
      const res = await fetch(`${API}/api/gs/approve-leave/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setProcessedIds(prev => new Set([...prev, id]))
    } catch (error) {
      console.error('Approve error:', error)
    }
  }

  const rejectLeave = async () => {
    if (!rejectId || !rejectReason.trim()) return
    try {
      const res = await fetch(`${API}/api/gs/reject-leave/${rejectId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason })
      })
      if (res.ok) {
        setProcessedIds(prev => new Set([...prev, rejectId]))
        setRejectId(null)
        setRejectReason('')
      }
    } catch (error) {
      console.error('Reject error:', error)
    }
  }

  const reviewReport = async (id: number) => {
    try {
      const res = await fetch(`${API}/api/gs/review-report/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setProcessedIds(prev => new Set([...prev, id]))
    } catch (error) {
      console.error('Review error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans selection:bg-orange-500 selection:text-black">
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#333333] pb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white uppercase">Dashboard</h1>
             <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-orange-500 font-bold text-xs uppercase tracking-[0.2em] font-mono"
            >
              {/* <span className="w-2 h-2 rounded-full bg-[#D9F837]"></span> */}
              Committee Overview
            </motion.div>
          </div>

          {/* Styled Tabs with Lucide Icons */}
          <div className="flex bg-[#1e1e1e] p-1 rounded-full border border-[#333333]">
            <button
              onClick={() => setTab('leaves')}
              className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm transition-all duration-200 ${
                tab === 'leaves' 
                  ? 'bg-orange-500 text-[#0f0f0f] ]' 
                  : 'text-[#888888] hover:text-white'
              }`}
            >
              <CalendarClock size={16} />
              LEAVES
            </button>
            <button
              onClick={() => setTab('reports')}
              className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm transition-all duration-200 ${
                tab === 'reports' 
                  ? 'bg-orange-500 text-[#0f0f0f] ]' 
                  : 'text-[#888888] hover:text-white'
              }`}
            >
              <ClipboardList size={16} />
              REPORTS
            </button>
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl flex items-center gap-3"
            >
              <AlertCircle size={20} className="text-red-500" />
              <p className="font-mono text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 opacity-70">
            <Loader2 size={40} className="text-orange-500 animate-spin" />
            <p className="mt-4 text-[#888888] font-mono text-sm tracking-widest">SYNCING DATA...</p>
          </div>
        )}

        {/* Committee Groups Grid */}
        <div className="grid grid-cols-1 gap-6">
          {Object.entries(data).map(([committee, items]: any) => {
            if (!Array.isArray(items) || items.length === 0) return null

            return (
              <motion.div
                key={committee}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1e1e1e] rounded-[16px] border border-[#333333] overflow-hidden"
              >
                {/* Card Header */}
                <div className="px-6 py-4 border-b border-[#333333] flex items-center justify-between bg-[#252525]">
                  <h3 className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
                    <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
                    {committee} <span className="text-[#888888] font-normal">Committee</span>
                  </h3>
                  <span className="bg-[#0f0f0f] border border-[#333333] text-[#888888] text-xs font-mono px-3 py-1 rounded-full">
                    {items.length} ITEMS
                  </span>
                </div>

                {/* Items List */}
                <div className="p-4 space-y-3">
                  {items.map((item: any) => {
                    const isProcessed = processedIds.has(item.id);
                    
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        className={`group relative border rounded-xl p-5 transition-all duration-200 ${
                          isProcessed
                            ? 'bg-[#0f0f0f]/50 border-[#333333] opacity-60' 
                            : 'bg-[#0f0f0f] border-[#333333] hover:border-[#555]'
                        }`}
                      >
                        {/* Status Stripe */}
                        {isProcessed && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 rounded-l-xl" />
                        )}

                        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                          <div className="flex-1 space-y-2">
                            {/* Title Row */}
                            <div className="flex items-center gap-3">
                              <p className="font-bold text-white text-lg">{item.title}</p>
                              {isProcessed && (
                                <span className="flex items-center gap-1 text-orange-500 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">
                                  COMPLETED
                                </span>
                              )}
                            </div>
                            
                            {/* User Row */}
                            <div className="flex items-center gap-2 text-sm text-[#888888]">
                              <User size={14} />
                              <span>by <span className="text-white font-medium">{item.name}</span></span>
                            </div>
                            
                            {/* Description */}
                            {item.content && (
                              <p className="text-sm text-[#cccccc] mt-2 line-clamp-2 leading-relaxed max-w-2xl bg-[#1e1e1e] p-3 rounded-lg border border-[#333333]/50">
                                {item.content}
                              </p>
                            )}
                            
                            {/* Date Metadata (Leaves Only) */}
                            {tab === 'leaves' && item.leave_from && (
                              <div className="flex items-center gap-4 mt-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1e1e1e] border border-[#333333] rounded text-xs font-mono text-orange-500">
                                  <Calendar size={12} />
                                  <span>{item.leave_from}</span>
                                  <span className="text-[#888888]">→</span>
                                  <span>{item.leave_to}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-2 md:pt-0">
                            {item.file_path && (
                              <a
                                href={item.file_path}
                                target="_blank"
                                rel="noreferrer"
                                className="p-3 rounded-lg bg-[#1e1e1e] border border-[#333333] text-[#888888] hover:text-white hover:border-orange-500 transition-colors group/eye"
                                title="View Document"
                              >
                                <Eye size={18} className="group-hover/eye:scale-110 transition-transform"/>
                              </a>
                            )}

                            {!isProcessed && (
                                <>
                                  {tab === 'leaves' ? (
                                    <>
                                      <button
                                        onClick={() => approveLeave(item.id)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-black font-bold rounded-lg hover:brightness-110 transition-transform active:scale-95 text-sm"
                                        title="Approve"
                                      >
                                        <CheckCircle size={16} />
                                        <span>Approve</span>
                                      </button>
                                      <button
                                        onClick={() => setRejectId(item.id)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-transparent border border-[#333333] text-[#ff4d4d] font-bold rounded-lg hover:bg-[#ff4d4d]/10 hover:border-[#ff4d4d] transition-colors active:scale-95 text-sm"
                                        title="Reject"
                                      >
                                        <XCircle size={16} />
                                        <span>Reject</span>
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => reviewReport(item.id)}
                                      className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-black font-bold rounded-lg hover:brightness-110 transition-transform active:scale-95 text-sm"
                                      title="Mark as Reviewed"
                                    >
                                      <FileText size={16} />
                                      <span>Mark Reviewed</span>
                                    </button>
                                  )}
                                </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Reject Modal - Dark Mode */}
        <AnimatePresence>
          {rejectId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#1e1e1e] border border-[#333333] rounded-[16px] p-6 w-full max-w-md shadow-2xl relative overflow-hidden"
              >
                {/* Decorative glow */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-900"></div>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
                        <AlertCircle size={24} className="text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-white">Reject Application</h3>
                      <p className="text-[#888888] text-sm">This action cannot be undone.</p>
                    </div>
                </div>

                <textarea
                  className="w-full bg-[#0f0f0f] border border-[#333333] rounded-xl p-4 mb-6 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-white placeholder-[#555] resize-none font-sans"
                  rows={4}
                  placeholder="Reason for rejection..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  autoFocus
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setRejectId(null)
                      setRejectReason('')
                    }}
                    className="flex-1 py-3 border border-[#333333] text-[#888888] rounded-xl font-bold hover:bg-[#333333] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={rejectLeave}
                    disabled={!rejectReason.trim()}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}