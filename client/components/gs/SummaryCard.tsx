'use client'

import { useEffect, useState } from 'react'

type Props = {
  title: string
  value: number
  variant?: 'blue' | 'cyan' | 'magenta' | 'warning'
}

export default function SummaryCard({ title, value, variant = 'blue' }: Props) {
  const [offset, setOffset] = useState(0)
  const size = 80
  const strokeWidth = 6
  const center = size / 2
  const radius = size / 2 - strokeWidth / 2
  const circumference = 2 * Math.PI * radius

  // Map variants to colors from your reference image
  const colors = {
    blue: { text: 'text-blue-400', stroke: '#3b82f6', glow: 'shadow-blue-500/20' },
    cyan: { text: 'text-cyan-400', stroke: '#06b6d4', glow: 'shadow-cyan-500/20' },
    magenta: { text: 'text-magenta-400', stroke: '#d946ef', glow: 'shadow-magenta-500/20' },
    warning: { text: 'text-yellow-400', stroke: '#f59e0b', glow: 'shadow-yellow-500/20' },
  }

  const activeColor = colors[variant]

  useEffect(() => {
    // Logic: Treat value as percentage for the ring animation
    // If value is > 100 (like total members), we use a placeholder fill
    const percentage = value > 100 ? 75 : value 
    const progressOffset = circumference - (percentage / 100) * circumference
    setOffset(progressOffset)
  }, [value, circumference])

  return (
    <div className={`relative bg-[#0f0f0f] border border-blue-500/20 backdrop-blur-md p-5 rounded-2xl flex items-center justify-between group hover:border-blue-400/50 transition-all duration-500 ${activeColor.glow} shadow-lg`}>
      
      {/* TEXT DATA */}
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500/70 mb-1">
          {title}
        </span>
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-mono font-bold ${activeColor.text}`}>
            {value}
          </span>
          <span className="text-[10px] text-blue-600 font-mono">_SYS.VOL</span>
        </div>
      </div>

      {/* CIRCULAR HUD GAUGE */}
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="rotate-[-90deg]">
          {/* Background Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-blue-900/30"
          />
          {/* Progress Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={activeColor.stroke}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            style={{ 
              strokeDashoffset: offset, 
              transition: 'stroke-dashoffset 1.5s ease-in-out',
              filter: `drop-shadow(0 0 3px ${activeColor.stroke})`
            }}
            strokeLinecap="round"
          />
        </svg>
        
        {/* Central Icon or Percentage Label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-[10px] font-mono font-bold ${activeColor.text}`}>
            {value > 100 ? 'MAX' : `${value}%`}
          </span>
        </div>
      </div>

      {/* Decorative Corner Bracket */}
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500/20 rounded-tr-xl group-hover:border-cyan-500/50 transition-colors" />
    </div>
  )
}