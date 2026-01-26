import React, { useEffect, useState, useCallback } from "react"
import axios from "axios"
import { Fingerprint, AlertCircle, CheckCircle, Loader, RefreshCw } from "lucide-react"
import '../styles/attendance.css';




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

interface AttendanceMarkingProps {
  token?: string
  adminId?: string
  adminName?: string
  onLogout?: () => void
  onNavigateBack?: () => void
  isPublicKiosk?: boolean
}

/**
 * Electron Capture Result type
 * This is RAW template capture (NOT match)
 */
type ElectronCaptureResponse =
  | { success: true; template: string }
  | { success: false; error: string }



export default function AttendanceMarking({
  token,
  adminName,
  onLogout,
  onNavigateBack,
  isPublicKiosk = true,
}: AttendanceMarkingProps) {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5005"
  const [enrolledReady, setEnrolledReady] = useState(false)
  const [deviceConnected, setDeviceConnected] = useState(false)
  const [isActive, setIsActive] = useState(false)

  const [scanning, setScanning] = useState(false)
  const [autoMode, setAutoMode] = useState(true) // kiosk auto scan
  const [loadingRecords, setLoadingRecords] = useState(false)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [lastScan, setLastScan] = useState<AttendanceRecordUI | null>(null)
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecordUI[]>([])

  // ---------------- HELPERS ----------------
  const resetMessages = (ms = 3500) => {
    setTimeout(() => {
      setError("")
      setSuccess("")
    }, ms)
  }

  // ---------------- DEVICE CHECK ----------------
  const checkDeviceStatus = useCallback(async () => {
    try {
      const res = await window.electronAPI?.biometric?.getStatus?.()
      setDeviceConnected(res?.connected === true)
    } catch (err) {
      console.error("Device check error:", err)
      setDeviceConnected(false)
    }
  }, [])


useEffect(() => {
  console.log("AUTO MODE CHECK:", { isActive, deviceConnected, enrolledReady })

  if (!isPublicKiosk) return
  if (!isActive) return
  if (!deviceConnected) return
  if (!enrolledReady) return

  console.log("✅ AUTO LOOP STARTED")
}, [isActive, deviceConnected, enrolledReady])

const initBiometricSystem = async () => {
  try {
    setLoadingRecords(true)
    setError("")
    setSuccess("")

    // ✅ init device
    const initRes = await window.electronAPI?.biometric?.init?.()
    if (!initRes?.success) {
      setError("❌ Biometric init failed. Check device drivers.")
      return
    }

    // ✅ load enrolled templates into Electron cache
    // IMPORTANT: this requires token
    if (token) {
      const loadRes = await window.electronAPI?.biometric?.loadEnrolled?.(token)

      if (!loadRes?.success) {
        setError("❌ Failed to load enrolled templates from backend.")
        return
      }

      setEnrolledReady(true)
      setSuccess(`✅ Enrolled Loaded: ${loadRes.count || 0}`)
    } else {
      // kiosk mode without token - can't load enrolled
      setError("❌ Token missing. Enrolled templates cannot load.")
      setEnrolledReady(false)
    }
  } catch (err) {
    setError("❌ Biometric init error.")
    setEnrolledReady(false)
  } finally {
    setLoadingRecords(false)
    resetMessages(3000)
  }
}

  // ---------------- ADMIN: LIVE LIST ----------------
  const loadTodayAttendance = async () => {
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
  }
const formatTime = (dateStr?: string) => {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const formatDuration = (mins?: number) => {
  if (!mins || mins <= 0) return "-"
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
  // ---------------- SYSTEM START/STOP ----------------
  const handleStartAttendance = () => {
    if (!deviceConnected) {
      setError("❌ Fingerprint device not connected. Please check USB connection.")
      resetMessages()
      return
    }
    setIsActive(true)
    setError("")
    setSuccess("✅ Attendance system activated! Ready to scan.")
    resetMessages(2500)
  }

  const handleStopAttendance = () => {
    setIsActive(false)
    setError("")
    setSuccess("ℹ️ Attendance system deactivated.")
    resetMessages(2500)
  }

 useEffect(() => {
  checkDeviceStatus()
  if (token) initBiometricSystem()

  if (!isPublicKiosk && token) {
    loadTodayAttendance()
  }

  const interval = setInterval(checkDeviceStatus, 2000)
  return () => clearInterval(interval)
}, [])
  // ==========================================================
  // ✅ NEW MAIN SCAN FLOW (CAPTURE TEMPLATE -> SEND TO BACKEND)
  // ==========================================================
  const handleScanFingerprint = async () => {
  if (!isActive) {
    setError("⚠️ Please start attendance system first.")
    resetMessages()
    return
  }

  if (!deviceConnected) {
    setError("❌ Fingerprint device not connected.")
    await checkDeviceStatus()
    resetMessages()
    return
  }

  if (!enrolledReady) {
    setError("⚠️ Enrolled fingerprints not loaded. Please INIT again.")
    resetMessages()
    return
  }
  if (scanning) return

  try {
    setScanning(true)
    setError("")
    setSuccess("")

    // ✅ 1) Capture (gets ansiPath)
    const capRes = await window.electronAPI?.biometric?.capture?.({
      purpose: "attendance",
    })

    if (!capRes?.success || !capRes.ansiPath) {
      setError(capRes?.error || "❌ Capture failed (ANSI missing).")
      resetMessages()
      return
    }

    // ✅ 2) Match locally using DLL
    const matchRes = await window.electronAPI?.biometric?.match?.(capRes.ansiPath)

    if (!matchRes?.success) {
      setError(matchRes?.error || "❌ Match failed.")
      resetMessages()
      return
    }

    if (!matchRes?.matched || !matchRes?.councilId) {
      setError(`❌ No match found. Score: ${matchRes?.score || 0}`)
      resetMessages(4000)
      return
    }

    const councilId = matchRes.councilId

    // ✅ 3) Punch-in / Punch-out based on backend state
    // We'll call punch-in first; if backend returns already punched-in then punch-out
    try {
      const punchInRes = await axios.post(`${backendUrl}/api/attendance/kiosk/punch-in`, {
        councilId,
        score: matchRes.score || 0,
      })

      if (punchInRes.data?.success === true) {
        const member = punchInRes.data?.member
        setLastScan({
          id: Date.now(),
          council_id: member.council_id,
          name: member.name,
          committee: member.committee,
          status: "punched_in",
          punch_in: member.punch_in,
        })

        setSuccess(`✅ ${member.name} PUNCHED IN successfully!`)
        resetMessages(5000)

        if (!isPublicKiosk && token) await loadTodayAttendance()
        return
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || ""

      // ✅ Already punched in -> try punch out
      if (String(msg).toLowerCase().includes("already punched in")) {
        await tryPunchOutByCouncilId(councilId, matchRes)
        return
      }

      throw err
    }
  } catch (err: any) {
    const msg = err?.response?.data?.message || err.message
    setError("❌ " + String(msg || "Attendance failed"))
    resetMessages()
  } finally {
    setScanning(false)
  }
}

  // ✅ Punch-out flow with 30 min rule handled by backend
  const tryPunchOutByCouncilId = async (councilId: string, matchRes?: any) => {
  try {
    setScanning(true)
    setError("")
    setSuccess("")

    const punchOutRes = await axios.post(`${backendUrl}/api/attendance/kiosk/punch-out`, {
      councilId,
      score: matchRes?.score || 0,
    })

    if (punchOutRes.data?.success !== true) {
      setError("❌ " + String(punchOutRes.data?.message || "Punch-out failed"))
      resetMessages()
      return
    }

    const member = punchOutRes.data?.member
    const duration = punchOutRes.data?.duration_minutes || 0

    setLastScan({
      id: Date.now(),
      council_id: member.council_id,
      name: member.name,
      committee: member.committee,
      status: "completed",
      punch_in: member.punch_in,
      punch_out: member.punch_out,
      duration_minutes: duration,
    })

    setSuccess(`✅ ${member.name} PUNCHED OUT! Duration: ${duration} minutes`)
    resetMessages(5000)

    if (!isPublicKiosk && token) await loadTodayAttendance()
  } catch (err: any) {
    const msg = err?.response?.data?.message || err.message

    if (String(msg).toLowerCase().includes("need to work")) {
      setError("⏳ " + msg)
      resetMessages(6000)
      return
    }

    setError("❌ " + String(msg || "Punch-out failed"))
    resetMessages()
  } finally {
    setScanning(false)
  }
}


  // ==========================================================
  // ✅ PUBLIC KIOSK UI
  // ==========================================================
  if (isPublicKiosk) {
    return (
      <div className="attendance-container kiosk">
        <header className="topbar">
          <div className="topbar-left">
          <button className="mini-btn" onClick={initBiometricSystem}>
          <RefreshCw size={16} /> INIT + Load
           </button>
            <Fingerprint className="topbar-icon" />
            <div>
              <h1>Attendance Kiosk</h1>
              <p>Scan fingerprint to punch in/out</p>
            </div>
          </div>

          <div className={`device-pill ${deviceConnected ? "ok" : "bad"}`}>
            {deviceConnected ? "✅ Device Connected" : "❌ Device Disconnected"}
            {!deviceConnected && (
              <button className="mini-btn" onClick={checkDeviceStatus}>
                <RefreshCw size={16} /> Retry
              </button>
            )}
          </div>
        </header>

        <main className="content">
          <div className="system-controls">
            {!isActive ? (
              <button
                className="action-btn success"
                onClick={handleStartAttendance}
                disabled={!deviceConnected}
              >
                ▶ Start Attendance
              </button>
            ) : (
              <button className="action-btn danger" onClick={handleStopAttendance}>
                ⏹ Stop Attendance
              </button>
            )}
          </div>

          {error && (
            <div className="alert error">
              <AlertCircle size={20} /> <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert success">
              <CheckCircle size={20} /> <span>{success}</span>
            </div>
          )}

          <section className="scanner-area">
            <div
              className={`scanner-box ${scanning ? "scanning" : ""} ${!isActive ? "inactive" : ""}`}
              onClick={handleScanFingerprint}
            >
              {scanning ? (
                <>
                  <div className="pulse">
                    <Fingerprint size={140} />
                  </div>
                  <h2>Scanning...</h2>
                  <p>Keep finger still on sensor</p>
                </>
              ) : (
                <>
                  <Fingerprint size={140} />
                  <h2>{isActive ? "Tap to Scan" : "Start system to scan"}</h2>
                  <p>{isActive ? "Ready for punch in/out" : "System inactive"}</p>
                </>
              )}
            </div>
          </section>

          {lastScan && (
  <div className="last-card">
    <h3>✅ Last Record</h3>

    <div className="row">
      <span className="label">Name</span>
      <span className="value">{lastScan.name}</span>
    </div>

    <div className="row">
      <span className="label">Committee</span>
      <span className="value">{lastScan.committee}</span>
    </div>

    <div className="row">
      <span className="label">Status</span>
      <span className={`value badge ${lastScan.status}`}>
        {lastScan.status === "punched_in" ? "📍 PUNCH IN" : "✅ PUNCH OUT"}
      </span>
    </div>

    {/* ✅ Show Exact Punch In Time */}
    <div className="row">
      <span className="label">Punch In</span>
      <span className="value">{formatTime(lastScan.punch_in)}</span>
    </div>

    {/* ✅ Show Punch Out Only If Completed */}
    {lastScan.punch_out && (
      <div className="row">
        <span className="label">Punch Out</span>
        <span className="value">{formatTime(lastScan.punch_out)}</span>
      </div>
    )}

    {/* ✅ Duration */}
    {typeof lastScan.duration_minutes === "number" && lastScan.duration_minutes > 0 && (
      <div className="row">
        <span className="label">Duration</span>
        <span className="value">{formatDuration(lastScan.duration_minutes)}</span>
      </div>
    )}
  </div>
)}
      </main>
      </div>
    )
  }

  // ==========================================================
  // ✅ ADMIN MODE UI
  // ==========================================================
  return (
    <div className="attendance-container admin">
      <header className="topbar">
        <div className="topbar-left">
          <Fingerprint className="topbar-icon" />
          <div>
            <h1>Mark Attendance</h1>
            <p>Biometric attendance recording</p>
          </div>
        </div>

        <div className="topbar-right">
          <span className="admin-name">👤 {adminName}</span>
          <button className="mini-btn" onClick={onNavigateBack}>
            ← Back
          </button>
          <button className="mini-btn logout" onClick={onLogout}>
            🚪 Logout
          </button>
        </div>
      </header>

      <div className={`device-banner ${deviceConnected ? "ok" : "bad"}`}>
        <span>{deviceConnected ? "✅ Device Connected" : "❌ Device Disconnected"}</span>
        {!deviceConnected && (
          <button className="mini-btn" onClick={checkDeviceStatus}>
            <RefreshCw size={16} /> Retry
          </button>
        )}
      </div>

      <main className="content">
        <div className="system-controls">
          <div className={`system-pill ${isActive ? "on" : "off"}`}>
            {isActive ? "🟢 SYSTEM ACTIVE" : "🔴 SYSTEM INACTIVE"}
          </div>

          {!isActive ? (
            <button
              className="action-btn success"
              onClick={handleStartAttendance}
              disabled={!deviceConnected}
            >
              ▶ Start Attendance
            </button>
          ) : (
            <button className="action-btn danger" onClick={handleStopAttendance}>
              ⏹ Stop Attendance
            </button>
            
          )}
          <button className="mini-btn" onClick={initBiometricSystem}>
          <RefreshCw size={16} /> INIT + Load
           </button>
        </div>

        {error && (
          <div className="alert error">
            <AlertCircle size={20} /> <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert success">
            <CheckCircle size={20} /> <span>{success}</span>
          </div>
        )}

        <section className="scanner-area">
          <div
            className={`scanner-box ${scanning ? "scanning" : ""} ${!isActive ? "inactive" : ""}`}
            onClick={handleScanFingerprint}
          >
            {scanning ? (
              <>
                <div className="pulse">
                  <Fingerprint size={110} />
                </div>
                <h2>Scanning...</h2>
                <p>Keep finger still on sensor</p>
              </>
            ) : (
              <>
                <Fingerprint size={110} />
                <h2>{isActive ? "Click to Scan" : "Start system to scan"}</h2>
                <p>{isActive ? "Ready" : "System inactive"}</p>
              </>
            )}
          </div>
        </section>

        {lastScan && (
  <div className="last-card">
    <h3>✅ Last Record</h3>

    <div className="row">
      <span className="label">Name</span>
      <span className="value">{lastScan.name}</span>
    </div>

    <div className="row">
      <span className="label">Committee</span>
      <span className="value">{lastScan.committee}</span>
    </div>

    <div className="row">
      <span className="label">Status</span>
      <span className={`value badge ${lastScan.status}`}>
        {lastScan.status === "punched_in" ? "📍 PUNCH IN" : "✅ PUNCH OUT"}
      </span>
    </div>

    {/* ✅ Show Exact Punch In Time */}
    <div className="row">
      <span className="label">Punch In</span>
      <span className="value">{formatTime(lastScan.punch_in)}</span>
    </div>

    {/* ✅ Show Punch Out Only If Completed */}
    {lastScan.punch_out && (
      <div className="row">
        <span className="label">Punch Out</span>
        <span className="value">{formatTime(lastScan.punch_out)}</span>
      </div>
    )}

    {/* ✅ Duration */}
    {typeof lastScan.duration_minutes === "number" && lastScan.duration_minutes > 0 && (
      <div className="row">
        <span className="label">Duration</span>
        <span className="value">{formatDuration(lastScan.duration_minutes)}</span>
      </div>
    )}
  </div>
)}


        <section className="live-list">
          <div className="live-header">
            <h3>📋 Today's Live Attendance</h3>
            <button className="mini-btn" onClick={loadTodayAttendance} disabled={loadingRecords}>
              <RefreshCw size={16} /> {loadingRecords ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loadingRecords ? (
            <div className="loading">
              <Loader className="spin" />
              <p>Loading records...</p>
            </div>
          ) : todayAttendance.length === 0 ? (
            <div className="empty">
              <p>No one is currently punched-in today.</p>
            </div>
          ) : (
            <div className="records">
              {todayAttendance.map((r) => (
                <div key={r.id} className="record">
                  <div className="avatar">{r.name?.charAt(0)?.toUpperCase() || "?"}</div>
                  <div className="info">
                    <p className="name">{r.name}</p>
                    <p className="meta">
                      {r.council_id} • {r.committee}
                    </p>
                  </div>
                  <div className="right">
  <span className={`pill ${r.status === "completed" ? "out" : "in"}`}>
    {r.status === "completed" ? "🚪 OUT" : "✅ IN"}
  </span>

  <div className="time-stack">
    <span className="time">{formatTime(r.punch_in)} IN</span>

    {r.punch_out ? (
      <span className="time">{formatTime(r.punch_out)} OUT</span>
    ) : (
      <span className="time">-- OUT</span>
    )}
  </div>
</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
