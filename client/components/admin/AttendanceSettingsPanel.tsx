'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import {
  ShieldCheck,
  Settings,
  ToggleLeft,
  ToggleRight,
  Clock,
  Timer,
  CalendarClock,
  Save,
  RefreshCw,
  AlertTriangle,
  Users,
  Ban,
  CheckCircle2,
  Search,
  X
} from 'lucide-react'

type AttendanceSettings = {
  qr_enabled: boolean
  qr_expiry_seconds: number
  time_window_enabled: boolean
  start_time: string
  end_time: string
  punchout_min_minutes: number
  updated_at?: string
}

type QRUserStatus = {
  user_id: string
  council_id: string
  role: string
  qr_blocked: boolean
  qr_block_reason?: string | null
  qr_blocked_at?: string | null
  name?: string | null
  committee_name?: string | null
}

export default function AttendanceSettingsPanel() {
  const [settings, setSettings] = useState<AttendanceSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // ✅ QR BLOCK PANEL STATE
  const [users, setUsers] = useState<QRUserStatus[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [blockingId, setBlockingId] = useState<string | null>(null)

  // modal
  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<QRUserStatus | null>(null)
  const [reason, setReason] = useState('')

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const isWindowValid = useMemo(() => {
    if (!settings?.time_window_enabled) return true
    if (!settings.start_time || !settings.end_time) return false
    return true
  }, [settings])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users

    return users.filter((u) => {
      const text = `${u.name || ''} ${u.council_id || ''} ${u.committee_name || ''} ${u.role || ''}`.toLowerCase()
      return text.includes(q)
    })
  }, [users, search])

  // ==========================================
  // ✅ SETTINGS APIs
  // ==========================================
  const fetchSettings = async () => {
    if (!token) return
    try {
      setLoading(true)
      const { apiClient } = await import('@/lib/api')
      const res = await apiClient.get('/api/admin/attendance/settings')
      if (res?.success && res.settings) {
        setSettings(res.settings)
      } else {
        toast.error('Failed to load attendance settings')
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to load attendance settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!token || !settings) return
    if (settings.time_window_enabled && !isWindowValid) {
      toast.error('Please set Start Time and End Time')
      return
    }

    try {
      setSaving(true)
      const { apiClient } = await import('@/lib/api')
      const res = await apiClient.put('/api/admin/attendance/settings', settings)

      if (res?.success && res.settings) {
        setSettings(res.settings)
        toast.success('✅ Attendance settings saved')
      } else {
        toast.error('Save failed')
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  // ==========================================
  // ✅ QR BLOCK APIs
  // ==========================================
  const fetchQRUsers = async () => {
    if (!token) return
    try {
      setUsersLoading(true)
      const { apiClient } = await import('@/lib/api')
      const res = await apiClient.get('/api/admin/users/qr-status')

      if (res?.success && Array.isArray(res.users)) {
        setUsers(res.users)
      } else {
        toast.error('Failed to load QR status list')
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to load QR status list')
    } finally {
      setUsersLoading(false)
    }
  }

  const openBlockModal = (u: QRUserStatus) => {
    setSelectedUser(u)
    setReason(u.qr_block_reason || '')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedUser(null)
    setReason('')
  }

  const toggleUserBlock = async (u: QRUserStatus) => {
    if (!token) return
    if (!u?.user_id) return

    try {
      setBlockingId(u.user_id)

      const { apiClient } = await import('@/lib/api')
      const res = await apiClient.put(`/api/admin/users/${u.user_id}/qr-block`, {
        blocked: !u.qr_blocked,
        reason: !u.qr_blocked ? reason || 'Blocked by admin' : null,
      })

      if (res?.success && res.user) {
        const updated = res.user

        setUsers((prev) =>
          prev.map((x) =>
            x.user_id === updated.id
              ? {
                  ...x,
                  qr_blocked: updated.qr_blocked,
                  qr_block_reason: updated.qr_block_reason,
                  qr_blocked_at: updated.qr_blocked_at,
                }
              : x
          )
        )

        toast.success(
          updated.qr_blocked ? '✅ User QR blocked' : '✅ User QR unblocked'
        )
        closeModal()
      } else {
        toast.error('Update failed')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err?.response?.data?.message || 'Failed to update QR block')
    } finally {
      setBlockingId(null)
    }
  }

  useEffect(() => {
    fetchSettings()
    fetchQRUsers()
  }, [])

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-12 font-sans overflow-x-hidden">
      {/* BG glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-blue-600/10 blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-5xl mx-auto space-y-10"
      >
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-[0.4em]">
              <ShieldCheck className="w-4 h-4" />
              Admin Attendance Control
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white italic uppercase">
              ATTENDANCE{' '}
              <span className="text-indigo-500 not-italic">SETTINGS</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                fetchSettings()
                fetchQRUsers()
              }}
              disabled={loading || usersLoading}
              className="flex items-center gap-2 bg-slate-900/40 border border-slate-800 text-slate-300 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:border-indigo-500/50 hover:bg-slate-800 transition-all active:scale-95 shadow-2xl disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading || usersLoading ? 'animate-spin' : ''}
              />
              Refresh
            </button>

            <button
              onClick={saveSettings}
              disabled={saving || !settings}
              className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-500 hover:text-white transition-all active:scale-95 disabled:opacity-50 shadow-2xl"
            >
              {saving ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save
            </button>
          </div>
        </header>

        {/* SETTINGS CONTENT */}
        {!settings ? (
          <div className="bg-slate-900/40 border border-slate-800/50 p-10 rounded-[2.5rem] text-center">
            <RefreshCw className="mx-auto text-indigo-400 animate-spin" size={40} />
            <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-xs">
              Loading settings...
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-slate-800/50 p-6 md:p-10 rounded-[2.5rem] backdrop-blur-xl shadow-2xl space-y-8">
            {/* QR Enable */}
            <Row
              title="QR Attendance"
              subtitle="Enable or disable QR-based attendance for kiosk"
              icon={Settings}
              right={
                <Toggle
                  enabled={settings.qr_enabled}
                  onToggle={(v: boolean) =>
                    setSettings((s) => (s ? { ...s, qr_enabled: v } : s))
                  }
                />
              }
            />

            {/* QR Expiry */}
            <Row
              title="QR Expiry Seconds"
              subtitle="QR regenerates automatically after expiry (recommended 10-20 sec)"
              icon={Timer}
              right={
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={settings.qr_expiry_seconds}
                  onChange={(e) =>
                    setSettings((s) =>
                      s ? { ...s, qr_expiry_seconds: Number(e.target.value) } : s
                    )
                  }
                  className="w-[160px] bg-black/40 border border-slate-800 text-white rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
              }
            />

            {/* Time Window Enable */}
            <Row
              title="Attendance Window"
              subtitle="Restrict attendance to a fixed time window (example 09:00 - 18:00)"
              icon={CalendarClock}
              right={
                <Toggle
                  enabled={settings.time_window_enabled}
                  onToggle={(v: boolean) =>
                    setSettings((s) => (s ? { ...s, time_window_enabled: v } : s))
                  }
                />
              }
            />

            {/* Window Times */}
            {settings.time_window_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2 flex items-center gap-2">
                    <Clock size={12} className="text-indigo-500" />
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={settings.start_time || ''}
                    onChange={(e) =>
                      setSettings((s) =>
                        s ? { ...s, start_time: e.target.value } : s
                      )
                    }
                    className="w-full bg-black/40 border border-slate-800 text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none font-bold [color-scheme:dark]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2 flex items-center gap-2">
                    <Clock size={12} className="text-indigo-500" />
                    End Time
                  </label>
                  <input
                    type="time"
                    value={settings.end_time || ''}
                    onChange={(e) =>
                      setSettings((s) =>
                        s ? { ...s, end_time: e.target.value } : s
                      )
                    }
                    className="w-full bg-black/40 border border-slate-800 text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none font-bold [color-scheme:dark]"
                  />
                </div>
              </div>
            )}

            {/* Punchout Rule */}
            <Row
              title="Punch-out Min Minutes"
              subtitle="User must wait before punch-out (default 30 min)"
              icon={AlertTriangle}
              right={
                <input
                  type="number"
                  min={0}
                  max={240}
                  value={settings.punchout_min_minutes}
                  onChange={(e) =>
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            punchout_min_minutes: Number(e.target.value),
                          }
                        : s
                    )
                  }
                  className="w-[160px] bg-black/40 border border-slate-800 text-white rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
              }
            />
          </div>
        )}

        {/* ============================================= */}
        {/* ✅ ADMIN QR BLOCK PANEL */}
        {/* ============================================= */}
        <div className="bg-slate-900/40 border border-slate-800/50 p-6 md:p-10 rounded-[2.5rem] backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-[0.3em]">
                <Users className="w-4 h-4" />
                Admin QR Block Control
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                QR Block Panel
              </h2>
              <p className="text-slate-500 text-sm font-medium mt-1">
                Block members from generating QR attendance (Kiosk scan)
              </p>
            </div>

            <button
              onClick={fetchQRUsers}
              disabled={usersLoading}
              className="flex items-center gap-2 bg-slate-900/40 border border-slate-800 text-slate-300 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:border-indigo-500/50 hover:bg-slate-800 transition-all active:scale-95 shadow-2xl disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={usersLoading ? 'animate-spin' : ''}
              />
              Refresh Users
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 bg-black/30 border border-slate-800 rounded-2xl px-4 py-3">
            <Search size={16} className="text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / council id / committee / role..."
              className="w-full bg-transparent outline-none text-slate-200 placeholder:text-slate-600 font-semibold text-sm"
            />
            {search && (
              <button
                className="text-slate-500 hover:text-white transition"
                onClick={() => setSearch('')}
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Users List */}
          {usersLoading ? (
            <div className="text-center py-10">
              <RefreshCw className="mx-auto text-indigo-400 animate-spin" size={40} />
              <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-xs">
                Loading users...
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-slate-500 font-semibold">
              No users found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredUsers.map((u) => (
                <div
                  key={u.user_id}
                  className="border border-slate-800/60 bg-black/20 rounded-[1.8rem] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center font-black text-indigo-200">
                      {(u.name || u.council_id || '?').charAt(0).toUpperCase()}
                    </div>

                    <div className="space-y-1">
                      <p className="text-white font-black text-lg">
                        {u.name || 'Unknown'}
                      </p>
                      <p className="text-slate-500 text-sm font-semibold">
                        {u.council_id} • {u.committee_name || 'No Committee'} •{' '}
                        <span className="uppercase">{u.role}</span>
                      </p>

                      {u.qr_blocked && (
                        <p className="text-red-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                          <Ban size={14} />
                          BLOCKED {u.qr_block_reason ? `• ${u.qr_block_reason}` : ''}
                        </p>
                      )}

                      {!u.qr_blocked && (
                        <p className="text-emerald-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 size={14} />
                          ACTIVE
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openBlockModal(u)}
                      className="px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-xs border border-slate-800 bg-slate-900/30 hover:bg-slate-800 transition-all active:scale-95"
                    >
                      Manage
                    </button>

                    <button
                      disabled={blockingId === u.user_id}
                      onClick={() => {
                        setSelectedUser(u)
                        setReason(u.qr_block_reason || '')
                        toggleUserBlock(u)
                      }}
                      className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50 ${
                        u.qr_blocked
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15'
                          : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/15'
                      }`}
                    >
                      {blockingId === u.user_id ? (
                        <RefreshCw size={16} className="animate-spin inline" />
                      ) : u.qr_blocked ? (
                        'Unblock'
                      ) : (
                        'Block'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ✅ MODAL */}
        {showModal && selectedUser && (
          <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-[#050b1d] border border-slate-800 rounded-[2rem] p-6 md:p-8 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-indigo-400 text-xs font-black uppercase tracking-[0.3em]">
                    QR Block Control
                  </p>
                  <h3 className="text-2xl font-black text-white mt-1">
                    {selectedUser.name || 'Unknown'}{' '}
                    <span className="text-slate-500 text-sm font-bold">
                      ({selectedUser.council_id})
                    </span>
                  </h3>
                  <p className="text-slate-500 text-sm font-semibold mt-1">
                    Committee: {selectedUser.committee_name || 'No Committee'} • Role:{' '}
                    {selectedUser.role}
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  className="text-slate-500 hover:text-white transition"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="mt-6 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">
                  Block Reason (Optional)
                </label>

                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Example: Misuse detected / Not allowed today / Pending verification..."
                  className="w-full bg-black/30 border border-slate-800 rounded-2xl p-4 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600 font-semibold"
                />
              </div>

              <div className="mt-6 flex flex-col md:flex-row gap-3 md:justify-end">
                <button
                  onClick={closeModal}
                  className="px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs border border-slate-800 bg-slate-900/30 hover:bg-slate-800 transition-all active:scale-95"
                >
                  Cancel
                </button>

                <button
                  disabled={blockingId === selectedUser.user_id}
                  onClick={() => toggleUserBlock(selectedUser)}
                  className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50 ${
                    selectedUser.qr_blocked
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15'
                      : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/15'
                  }`}
                >
                  {blockingId === selectedUser.user_id ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </span>
                  ) : selectedUser.qr_blocked ? (
                    'Unblock QR'
                  ) : (
                    'Block QR'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

/* UI HELPERS */

function Row({ title, subtitle, icon: Icon, right }: any) {
  return (
    <div className="flex flex-col md:flex-row justify-between gap-6 md:items-center border border-slate-800/50 bg-black/20 p-6 rounded-[2rem]">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/20 rounded-2xl flex items-center justify-center">
          <Icon className="text-indigo-300" size={22} />
        </div>
        <div>
          <h3 className="text-white font-black uppercase tracking-tight text-lg">
            {title}
          </h3>
          <p className="text-slate-500 text-sm font-medium mt-1">{subtitle}</p>
        </div>
      </div>
      <div>{right}</div>
    </div>
  )
}

function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 border ${
        enabled
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : 'bg-red-500/10 text-red-400 border-red-500/30'
      }`}
    >
      {enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
      {enabled ? 'Enabled' : 'Disabled'}
    </button>
  )
}
