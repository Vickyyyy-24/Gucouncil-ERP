'use client'

import { useEffect, useState } from 'react'
import { getSocket } from '@/lib/socket'
import { apiClient, ApiError } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Terminal, Activity } from 'lucide-react'

type LogItem = {
  action?: string
  description?: string
  created_at?: string
}

export default function LiveActivityFeed({ refresh }: { refresh: number }) {
  const [logs, setLogs] = useState<LogItem[]>([])
  const router = useRouter()
  const { token, logout } = useAuth() // ✅ use AuthContext token

  /* ================= FETCH LOGS ================= */

  useEffect(() => {
    if (!token) {
      console.warn('⛔ LiveActivityFeed: token not ready, skipping API call')
      return
    }

    apiClient.setToken(token) // ✅ CRITICAL

    let mounted = true

    const fetchLogs = async () => {
      try {
        const data = await apiClient.get('/api/admin/logs?type=system')
        const normalized = Array.isArray(data) ? data : data ? [data] : []
        if (mounted) setLogs(normalized)
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          try { localStorage.removeItem('token') } catch {}
          try { logout() } catch {}
          router.replace('/login')
          return
        }

        console.error('Failed to load system logs:', err)
        if (mounted) setLogs([])
      }
    }

    fetchLogs()

    return () => {
      mounted = false
    }
  }, [token, refresh])

  /* ================= SOCKET UPDATES ================= */

  useEffect(() => {
    const socket = getSocket()
    if (!socket.connected) socket.connect()

    socket.on('system:log', (log: LogItem) => {
      setLogs(prev => [log, ...prev].slice(0, 20))
    })

    return () => {
      socket.off('system:log')
    }
  }, [])

  /* ================= UI ================= */

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      {/* TERMINAL HEADER */}
      <div className="flex items-center justify-between px-4 py-2 bg-blue-500/10 border-x border-t border-blue-500/30 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-cyan-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">
            System_Logs.exe
          </span>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/40" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/40" />
          <div className="w-2 h-2 rounded-full bg-green-500/40" />
        </div>
      </div>

      {/* TERMINAL BODY */}
      <div className="flex-1 bg-black/40 backdrop-blur-md border border-blue-500/30 rounded-b-xl overflow-hidden relative">
        <div className="p-4 h-[350px] overflow-y-auto custom-scrollbar">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-2 opacity-50">
              <Activity className="animate-pulse text-blue-500" />
              <p className="text-xs font-mono text-blue-400 uppercase">
                Waiting for incoming data...
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {logs.map((log, i) => (
                <li key={i} className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleTimeString([], { hour12: false })
                        : '00:00:00'}
                    </span>
                    <span className="text-[11px] font-bold text-blue-100 uppercase">
                      {log.action || 'INTERNAL'}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-blue-300/80 pl-2 border-l border-blue-500/20 ml-1">
                    <span className="text-blue-500 mr-2">{'>'}</span>
                    {log.description || 'Executing system process...'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
