import React, { useEffect, useRef, useState, useCallback } from "react"
import axios from "axios"
import { Html5Qrcode } from "html5-qrcode"
import {
  Camera,
  RefreshCw,
  Loader,
} from "lucide-react"
import "../styles/attendance-qr.css"

interface AttendanceMarkingQRProps {
  token?: string
  adminName?: string
  onLogout?: () => void
  onNavigateBack?: () => void
  isPublicKiosk?: boolean
}

type ScanResultUI = {
  success: boolean
  action?: "punch_in" | "punch_out" | "blocked"
  message: string
  remaining_minutes?: number
  duration_minutes?: number
  member?: {
    council_id: string
    name: string
    committee?: string
    punch_in?: string
    punch_out?: string
  }
}

interface AttendanceRecordUI {
  id: number
  council_id: string
  name: string
  committee: string
  status: "punched_in" | "completed"
  punch_in: string
  punch_out?: string
  duration_minutes?: number
  biometric_quality?: number
}

export default function AttendanceMarkingQR({
  token,
  adminName,
  onLogout,
  onNavigateBack,
  isPublicKiosk = false, // Defaulting to false as the design shown is the Admin/Controller view
}: AttendanceMarkingQRProps) {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5005"

  const [isActive, setIsActive] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)

  const [loadingRecords, setLoadingRecords] = useState(false)
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecordUI[]>([])

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [lastScan, setLastScan] = useState<ScanResultUI | null>(null)

  // ✅ manual scan controller
  const [manualScanMode, setManualScanMode] = useState(false)

  // ✅ Scanner refs
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const busyRef = useRef(false)
  const mountedRef = useRef(true)
  const activeRef = useRef(false)

  // ✅ Unique kiosk identity
  const kioskDeviceId = "COUNCIL_ROOM_PC_1"

  const resetMessages = (ms = 3500) => {
    setTimeout(() => {
      if (!mountedRef.current) return
      setError("")
      setSuccess("")
    }, ms)
  }

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "-"
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // ============================================
  // ✅ LIVE ATTENDANCE (ADMIN MODE ONLY)
  // ============================================
  const loadTodayAttendance = useCallback(async () => {
    if (!token) return
    try {
      setLoadingRecords(true)
      const response = await axios.get(`${backendUrl}/api/attendance/today/live`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const raw = response.data?.records || []
      const mapped: AttendanceRecordUI[] = raw.map((r: any, idx: number) => ({
        id: idx + 1,
        council_id: r.council_id,
        name: r.name,
        committee: r.committee,
        status: r.status,
        punch_in: r.punch_in,
        punch_out: r.punch_out,
        duration_minutes: Math.floor(Number(r.duration_minutes || 0)),
        biometric_quality: r.biometric_quality,
      }))
      setTodayAttendance(mapped)
    } catch (err) {
      console.error("loadTodayAttendance error:", err)
    } finally {
      setLoadingRecords(false)
    }
  }, [backendUrl, token])

  // ============================================
  // ✅ SCANNER LIFECYCLE
  // ============================================
  const destroyScanner = useCallback(async () => {
    try {
      if (scannerRef.current) {
        try { await scannerRef.current.stop() } catch {}
        try { await scannerRef.current.clear() } catch {}
      }
    } catch {}
    scannerRef.current = null
    setScanning(false)
  }, [])

  const ensureScannerInstance = useCallback(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode("qr-reader")
    }
    return scannerRef.current
  }, [])

  const processQrToken = useCallback(
    async (decodedText: string) => {
      if (!decodedText || busyRef.current) return
      busyRef.current = true

      try {
        const res = await axios.post(`${backendUrl}/api/attendance/kiosk/scan-qr`, {
          qr: decodedText,
          kioskDeviceId,
        })

        const data = res.data as ScanResultUI
        setLastScan(data)

        if (data.success) {
            // Short success message for the UI
          setSuccess(`${data.member?.name || "Member"} - ${data.action === "punch_in" ? "IN" : "OUT"}`)
          setError("")
        } else {
          setError(data.message || "Scan rejected")
          setSuccess("")
        }
        
        resetMessages(4500)

        if (!isPublicKiosk && token) {
          await loadTodayAttendance()
        }
      } catch (err: any) {
        const payload = err?.response?.data || { success: false, message: "Failed to scan" }
        setLastScan(payload)
        setError(payload.message)
        setSuccess("")
        resetMessages(5000)
      } finally {
        setTimeout(() => { busyRef.current = false }, 1200)
      }
    },
    [backendUrl, isPublicKiosk, kioskDeviceId, loadTodayAttendance, token]
  )

  const startScanner = useCallback(async () => {
    if (scanning || !activeRef.current) return
    setError("")
    setSuccess("")
    setCameraReady(true)
    const qr = ensureScannerInstance()

    try {
      setScanning(true)
      await qr.start(
        { facingMode: "environment" },
        { 
    fps: 15, 
    qrbox: { width: 600, height: 350 }, 
    aspectRatio: 1.777778, 
    disableFlip: false 
  },
        async (decodedText) => {
          if (manualScanMode) return
          await processQrToken(decodedText)
        },
        () => {}
      )
    } catch (err) {
      console.error("Camera error:", err)
      setScanning(false)
      setCameraReady(false)
      setError("Camera access denied")
    }
  }, [ensureScannerInstance, manualScanMode, processQrToken, scanning])

  const stopScanner = useCallback(async () => {
    await destroyScanner()
    setCameraReady(false)
  }, [destroyScanner])

  const toggleSystem = async () => {
    if (isActive) {
      setIsActive(false)
      activeRef.current = false
      await stopScanner()
    } else {
      setIsActive(true)
      activeRef.current = true
      setLastScan(null)
      await startScanner()
    }
  }

  // Handle Manual Scan Logic
  const handleManualScanNow = async () => {
     if (!scannerRef.current) return;
     // This function is tricky with html5-qrcode standard loop. 
     // In a real scenario, we might pause the loop and grab a frame, 
     // but here we just rely on the loop picking it up if we toggle logic flags.
     // For this UI demo, we will assume standard auto-scan is primary.
     alert("Manual scan triggered (Simulated)");
  }

  useEffect(() => {
    mountedRef.current = true
    if (!isPublicKiosk && token) loadTodayAttendance()
    return () => {
      mountedRef.current = false
      activeRef.current = false
      destroyScanner()
    }
  }, [destroyScanner, isPublicKiosk, loadTodayAttendance, token])

  // Restart scanner if system active but scanner stopped
  useEffect(() => {
    if (isActive && activeRef.current && !cameraReady) {
      startScanner()
    }
  }, [cameraReady, isActive, startScanner])

  // ==========================================================
  // ✅ RENDER
  // ==========================================================
  return (
    <div className="erp-layout">
      {/* --- HEADER --- */}
      <header className="erp-header">
        <div className="erp-logo-section">
          <div className="erp-logo-icon">erp</div>
          <span className="erp-logo-text">ELECTRON</span>
          
        </div>

        <div className="erp-status-section">
            <span className="status-label">
                SYSTEM {isActive ? "ACTIVE" : "INACTIVE"}
            </span>
            <span className={`status-dot ${isActive ? "active" : "inactive"}`}></span>
        </div>

        <nav className="erp-nav">
          <button className="erp-nav-item" onClick={toggleSystem}>
            {isActive ? "STOP" : "START"}
          </button>
          <div className="erp-nav-divider">|</div>
          
          <button 
            className="erp-nav-item" 
            onClick={() => setManualScanMode(!manualScanMode)}
          >
            {manualScanMode ? "MANUAL ON" : "MANUAL OFF"}
          </button>
          <div className="erp-nav-divider">|</div>

          <button className="erp-nav-item" onClick={onNavigateBack}>
            BACK
          </button>
          <div className="erp-nav-divider">|</div>

          <button className="erp-nav-item" onClick={onLogout}>
            LOGOUT
          </button>
        </nav>
      </header>
      <div className="gold-bar"></div>

      {/* --- MAIN CONTENT --- */}
      <main className="erp-main">
        
        {/* TOP: SCANNER AREA */}
        <div className="erp-scanner-container">
            <div className="scanner-label">START SYSTEM TO SCAN......</div>
            
            <div className="scanner-frame-wrapper">
                <div id="qr-reader" className="erp-qr-reader"></div>
                
                {/* Overlays for inactive state */}
                {!isActive && (
                    <div className="scanner-overlay">
                        <Camera size={40} color="#333" />
                        <p>SYSTEM OFF</p>
                    </div>
                )}
                
                {/* Result Overlay (Toast style inside box) */}
                {(error || success) && (
                    <div className={`scan-feedback ${error ? "error" : "success"}`}>
                        {error || success}
                    </div>
                )}
            </div>
        </div>

        {/* RIGHT: VERTICAL TEXT */}
        <div className="erp-copyright-vertical">
            © 2025-26 STUDENT COUNCIL. ALL RIGHTS RESERVED.
        </div>

        {/* BOTTOM: ATTENDANCE LIST */}
        <div className="erp-attendance-panel">
            <div className="attendance-header">
                <h3>TODAY'S LIVE ATTENDANCE</h3>
                <button 
                    className="erp-refresh-btn" 
                    onClick={loadTodayAttendance}
                    disabled={loadingRecords}
                >
                    {loadingRecords ? <Loader className="spin" size={14}/> : "REFRESH"}
                </button>
            </div>

            <div className="attendance-body">
                {todayAttendance.length === 0 ? (
                    <div className="empty-state">NO ONE IS MARKED TODAY.</div>
                ) : (
                    <div className="attendance-list">
                         {todayAttendance.map((record) => (
                             <div key={record.id} className="erp-record-row">
                                 <span className="rec-name">{record.name}</span>
                                 <span className="rec-id">{record.council_id}</span>
                                 <span className="rec-time">{formatTime(record.punch_in)}</span>
                                 <span className={`rec-status ${record.status === 'completed' ? 'out' : 'in'}`}>
                                     {record.status === 'completed' ? 'OUT' : 'IN'}
                                 </span>
                             </div>
                         ))}
                    </div>
                )}
            </div>
        </div>

      </main>

      {/* --- FOOTER --- */}
      <footer className="erp-footer">
          <div className="gold-bar"></div>
          <div className="footer-content">
              <span>SOFTWARE EDITION</span>
          </div>
      </footer>
    </div>
  )
}