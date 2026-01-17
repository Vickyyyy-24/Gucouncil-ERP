'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Eye, FileText } from 'lucide-react'

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
    // Get token from localStorage on mount
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
      const endpoint =
        tab === 'leaves'
          ? '/api/gs/leaves/pending'
          : '/api/gs/reports/pending'

      const res = await fetch(`${API}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        let errorMsg = `Error ${res.status}`

        if (res.status === 401) {
          errorMsg = 'Token expired - please log in again'
        } else if (res.status === 403) {
          errorMsg = 'Access denied - you need GS role to view this'
        }

        setError(errorMsg)
        console.error('API Error:', res.status, errorData)
        return
      }

      const result = await res.json()
      setData(result)
    } catch (error) {
      setError('Failed to load data. Check console for details.')
      console.error('Fetch error:', error)
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

      if (res.ok) {
        setProcessedIds(prev => new Set([...prev, id]))
      }
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

      if (res.ok) {
        setProcessedIds(prev => new Set([...prev, id]))
      }
    } catch (error) {
      console.error('Review error:', error)
    }
  }

  return (
    <div className="space-y-6 p-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {['leaves', 'reports'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`px-4 py-2 rounded font-semibold transition ${
              tab === t ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg"
        >
          <p className="font-semibold">❌ {error}</p>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-10">
          <div className="inline-block">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full"
            />
          </div>
          <p className="mt-2 text-slate-600">Loading...</p>
        </div>
      )}

      {/* Committee Groups */}
      {Object.entries(data).map(([committee, items]: any) => {
        if (!Array.isArray(items) || items.length === 0) return null

        return (
          <motion.div
            key={committee}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6 border border-slate-200"
          >
            <h3 className="font-bold text-xl mb-4 text-slate-800">
              {committee} Committee
            </h3>

            <div className="space-y-3">
              {items.map((item: any) => (
                <motion.div
                  key={item.id}
                  className={`border rounded-lg p-4 flex justify-between items-start transition-all ${
                    processedIds.has(item.id)
                      ? 'bg-green-50 border-green-300'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{item.title}</p>
                    <p className="text-sm text-slate-500 mt-1">{item.name}</p>
                    {item.content && (
                      <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                        {item.content}
                      </p>
                    )}
                    {tab === 'leaves' && item.leave_from && (
                      <p className="text-xs text-slate-500 mt-2">
                        📅 {item.leave_from} to {item.leave_to}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    {item.file_path && (
                      <a
                        href={item.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-slate-600 hover:text-orange-600 transition"
                        title="View file"
                      >
                        <Eye size={20} />
                      </a>
                    )}

                    {processedIds.has(item.id) ? (
                      <div className="px-3 py-2 bg-green-100 text-green-700 rounded font-semibold text-xs flex items-center gap-1">
                        <CheckCircle size={16} />
                        Done
                      </div>
                    ) : tab === 'leaves' ? (
                      <>
                        <button
                          onClick={() => approveLeave(item.id)}
                          className="p-2 text-green-600 hover:bg-green-100 rounded transition"
                          title="Approve"
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button
                          onClick={() => setRejectId(item.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded transition"
                          title="Reject"
                        >
                          <XCircle size={20} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => reviewReport(item.id)}
                        className="p-2 text-orange-600 hover:bg-orange-100 rounded transition"
                        title="Review"
                      >
                        <FileText size={20} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )
      })}

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            >
              <h3 className="font-bold text-lg mb-4">Reject Leave Application</h3>

              <textarea
                className="w-full border border-slate-300 rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                rows={4}
                placeholder="Enter rejection reason..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setRejectId(null)
                    setRejectReason('')
                  }}
                  className="flex-1 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={rejectLeave}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                >
                  Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}