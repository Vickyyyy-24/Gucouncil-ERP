'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, ShieldAlert, Lock, Timer, QrCode, ScanLine } from 'lucide-react'
import { toast } from 'react-toastify'
import { apiClient } from '@/lib/api'

type QRResponse = {
  success: boolean
  qr?: string
  expiresIn?: number
  blocked?: boolean
  message?: string
  serverTime?: string
}

export default function UserAttendanceQR() {
  const [qr, setQr] = useState<string>('')
  const [expiresIn, setExpiresIn] = useState<number>(15)
  const [remaining, setRemaining] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [blockedMsg, setBlockedMsg] = useState<string>('')

  const timerRef = useRef<any>(null)
  const refreshRef = useRef<any>(null)

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const stopTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (refreshRef.current) clearTimeout(refreshRef.current)
  }

  const fetchQR = useCallback(async () => {
    if (!token) {
      setLoading(false)
      setBlockedMsg('Unauthorized — please login again')
      return
    }

    try {
      setLoading(true)
      setBlockedMsg('')

      const data = (await apiClient.get('/api/attendance/qr')) as QRResponse

      if (!data?.success) {
        setQr('')
        setBlockedMsg(data?.message || 'QR generation failed')
        return
      }

      if (!data.qr) {
        setQr('')
        setBlockedMsg('QR token missing from server')
        return
      }

      const exp = Number(data.expiresIn || 15)
      setQr(data.qr)
      setExpiresIn(exp)
      setRemaining(exp)
    } catch (err: any) {
      const msg =
        err?.body?.message ||
        err?.message ||
        'Failed to generate QR (network/server)'

      setQr('')
      setBlockedMsg(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [token])

  // countdown
  useEffect(() => {
    stopTimers()

    // start countdown only if QR exists
    if (!qr) return

    timerRef.current = setInterval(() => {
      setRemaining(r => (r > 0 ? r - 1 : 0))
    }, 1000)

    // refresh slightly before expiry
    refreshRef.current = setTimeout(() => {
      fetchQR()
    }, Math.max(3000, (expiresIn - 2) * 1000))

    return () => stopTimers()
  }, [qr, expiresIn, fetchQR])

  // initial load
  useEffect(() => {
    fetchQR()
    return () => stopTimers()
  }, [fetchQR])

  const statusBadge = useMemo(() => {
    if (loading)
      return (
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF3131] flex items-center gap-2 bg-[#FF3131]/10 px-2 py-1 rounded">
          <RefreshCw className="w-3 h-3 animate-spin" /> Syncing
        </span>
      )

    if (blockedMsg)
      return (
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#888888] flex items-center gap-2 bg-[#333333] px-2 py-1 rounded">
          <ShieldAlert className="w-3 h-3" /> Blocked
        </span>
      )

    return (
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF3131] flex items-center gap-2 bg-[#FF3131]/10 px-2 py-1 rounded shadow-[0_0_10px_rgba(255,49,49,0.2)]">
        <Timer className="w-3 h-3" /> Live
      </span>
    )
  }, [loading, blockedMsg])

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-4 md:p-12 font-sans selection:bg-indigo-500 selection:text-[#0f0f0f] overflow-x-hidden">
      
    <div className="w-full max-w-sm mx-auto font-sans "> 
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1e1e1e] border border-[#333333] rounded-[16px] p-6 shadow-2xl relative overflow-hidden"
      >
        {/* Active Indicator Line (Neon Red) - Only Top Border now */}
        {!blockedMsg && <div className="absolute top-0 left-0 w-full h-1 bg-[#FF3131] shadow-[0_0_15px_#FF3131]" />}
        {blockedMsg && <div className="absolute top-0 left-0 w-full h-1 bg-[#555555]" />}

        {/* HEADER */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] text-[#888888] font-bold uppercase tracking-[0.2em] mb-1">
              Attendance
            </p>
            <h2 className="text-xl font-bold text-white uppercase flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#FF3131]" />
              Scan QR
            </h2>
          </div>
          <div>{statusBadge}</div>
        </div>

        {/* BODY */}
        <div className="flex flex-col items-center w-full">
          <AnimatePresence mode="wait">
            {blockedMsg ? (
              <motion.div
                key="blocked"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full p-6 rounded-xl bg-[#0f0f0f] border border-[#333333] text-[#888888]"
              >
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs text-red-500 mb-3">
                  <Lock className="w-4 h-4" />
                  Access Restricted
                </div>
                <p className="text-sm font-medium text-[#cccccc] mb-6">
                  {blockedMsg}
                </p>

                <button
                  onClick={fetchQR}
                  className="w-full bg-[#333333] text-white font-bold uppercase tracking-wider text-xs py-3 rounded-xl hover:bg-[#444444] active:scale-95 transition-all"
                >
                  Retry Connection
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="active"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col items-center gap-6"
              >
                {/* QR Container - Maximized */}
                <div className="relative group w-full">
                  {/* Neon Red Glow behind QR */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#FF3131] to-[#7f1d1d] rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                  
                  {/* White Box */}
                  <div className="relative bg-white p-3 rounded-xl shadow-inner w-full aspect-square flex items-center justify-center">
                    <QRCodeCanvas 
                        value={qr} 
                        size={256} 
                        level="H" 
                        marginSize={1}
                        className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Timer Section */}
                <div className="w-full flex items-center justify-between px-4 py-4 bg-[#0f0f0f] border border-[#333333] rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#888888] flex items-center gap-2">
                    <ScanLine size={14} />
                    Auto Refresh
                  </p>
                  <p className="text-lg font-mono font-bold text-[#FF3131] tabular-nums drop-shadow-[0_0_5px_rgba(255,49,49,0.5)]">
                    {remaining}s
                  </p>
                </div>

                <button
                  onClick={fetchQR}
                  className="w-full flex items-center justify-center gap-2 bg-[#FF3131] text-white px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#ff1f1f] hover:shadow-[0_0_20px_rgba(255,49,49,0.4)] active:scale-95 transition-all group"
                >
                  <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                  Refresh Code
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
    </div>
  )
}