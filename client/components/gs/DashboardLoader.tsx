'use client'

import { Activity, ShieldCheck, Zap } from 'lucide-react'

export default function DashboardLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020617]">
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 bg-[#1e1e1e]"></div>

      <div className="relative">
        {/* Outer Rotating Ring */}
        <div className="w-32 h-32 rounded-full border-t-2 border-b-2 border-cyan-500 animate-spin"></div>
        
        {/* Middle Pulse Ring */}
        <div className="absolute inset-0 m-auto w-24 h-24 rounded-full border-l-2 border-r-2 border-magenta-500 animate-[spin_3s_linear_infinite_reverse]"></div>
        
        {/* Inner Core */}
        <div className="absolute inset-0 m-auto w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.5)] animate-pulse">
          <Zap className="text-cyan-400" size={24} />
        </div>
      </div>

      {/* Boot Text */}
      <div className="mt-8 flex flex-col items-center space-y-2">
        <h2 className="text-blue-400 font-mono text-sm tracking-[0.3em] uppercase animate-pulse">
          Initializing Dashboard
        </h2>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-1 text-[10px] font-mono text-blue-500/60 uppercase">
            <ShieldCheck size={12} /> Encrypt_Link
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-blue-500/60 uppercase">
            <Activity size={12} /> Sync_Socket
          </div>
        </div>

        {/* Loading Bar */}
        <div className="w-48 h-1 bg-blue-900/30 rounded-full mt-4 overflow-hidden border border-blue-500/10">
          <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 animate-[loading_2s_ease-in-out_infinite]"></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes loading {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 100%; transform: translateX(0%); }
          100% { width: 0%; transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}