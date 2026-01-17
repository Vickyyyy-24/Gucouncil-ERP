"use client"

import type React from "react"
import { useState, useEffect } from "react"
import axios from "axios"
import { LogIn, AlertCircle, Loader } from "lucide-react"
import "../styles/admin-auth-electron.css"

interface AdminAuthPageProps {
  onAuthSuccess: (token: string, adminId: string, adminName: string) => void
}

function DigitalClock() {
  const [time, setTime] = useState<{ day: string; hours: string; minutes: string; seconds: string }>({
    day: "MO",
    hours: "00",
    minutes: "00",
    seconds: "00",
  })

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const days = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]
      const hours = String(now.getHours()).padStart(2, "0")
      const minutes = String(now.getMinutes()).padStart(2, "0")
      const seconds = String(now.getSeconds()).padStart(2, "0")

      setTime({
        day: days[now.getDay()],
        hours,
        minutes,
        seconds,
      })
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="digital-clock">
      <div className="digital-display">
        <div className="time-unit">
          <div className="time-value">{time.day}</div>
          <div className="time-label">DAY</div>
        </div>
        <div className="time-separator">:</div>
        <div className="time-unit">
          <div className="time-value">{time.hours}</div>
          <div className="time-label">HOURS</div>
        </div>
        <div className="time-separator">:</div>
        <div className="time-unit">
          <div className="time-value">{time.minutes}</div>
          <div className="time-label">MINUTES</div>
        </div>
        <div className="time-separator">:</div>
        <div className="time-unit">
          <div className="time-value">{time.seconds}</div>
          <div className="time-label">SECONDS</div>
        </div>
      </div>
    </div>
  )
}

export default function AdminAuthPage({ onAuthSuccess }: AdminAuthPageProps) {
  const [councilId, setCouncilId] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5005"

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Read directly from form to ensure you get current values
    const formData = new FormData(e.currentTarget)
    const councilIdValue = formData.get("councilId") as string
    const passwordValue = formData.get("password") as string

    try {
      const response = await axios.post(`${backendUrl}/api/auth/login`, {
        councilId: councilIdValue,
        password: passwordValue,
      })

      const { token, user } = response.data

      if (user.role !== "admin") {
        setError("Only Admin can access this system.")
        setLoading(false)
        return
      }

      localStorage.setItem("token", token)
      localStorage.setItem("adminId", councilIdValue)
      localStorage.setItem("adminName", user.adminName || "Admin")

      onAuthSuccess(token, councilIdValue, user.adminName || "Admin")
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed. Check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="electron-auth-container">
      <div className="electron-background"></div>

      <div className="electron-content">
        {/* Clock Widget - Top Right */}
        <div className="clock-widget">
          <DigitalClock />
        </div>

        {/* Left Section - Title overlay */}
        <div className="electron-left-section">
          <h1 className="electron-title">ADMIN LOGIN</h1>
          <p className="electron-subtitle">READY</p>
        </div>

        {/* Right Section - Form overlay */}
        <div className="electron-right-section">
          <form onSubmit={handleLogin} className="electron-form">
            <div className="electron-form-group">
              <input
                name="councilId"
                id="councilId"
                type="text"
                value={councilId}
                onChange={(e) => setCouncilId(e.target.value)}
                placeholder="ENTER YOU COUNCIL ID"
                disabled={loading}
                required
                className="electron-input"
                autoFocus
              />
            </div>

            <div className="electron-form-group">
              <input
                name="password"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ENTER YOUR PASSWORD"
                disabled={loading}
                required
                className="electron-input"
              />
            </div>

            {error && (
              <div className="electron-error-banner">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading || !councilId || !password} className="electron-login-button">
              {loading ? (
                <>
                  <Loader size={18} className="spinner-icon" />
                  Authenticating...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  LOGIN
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="electron-vertical-text">© 2026 STUDENT COUNCIL. ALL RIGHTS RESERVED.</div>

      <div className="electron-footer">
        <span className="electron-software-edition">ELECTRON SOFTWARE EDITION</span>
        <span className="electron-version">V.1.0.26</span>
      </div>
    </div>
  )
}