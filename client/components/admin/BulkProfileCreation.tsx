'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { 
  CloudUpload, 
  FileSpreadsheet, 
  CheckCircle2, 
  RefreshCcw, 
  BarChart3, 
  Info,
  ChevronRight,
  ShieldCheck,
  X,
  Database,
  Terminal,
  Cpu,
  ArrowUpRight
} from 'lucide-react'

const API = 'http://localhost:5005'

export default function BulkProfileCreation() {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [result, setResult] = useState<{
    created: number
    updated: number
    total: number
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleBulkUpload = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file')
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      toast.error('Admin login required')
      return
    }

    try {
      setLoading(true)
      setResult(null)

      const formData = new FormData()
      formData.append('csvFile', csvFile)

      const res = await fetch(`${API}/api/admin/bulk-create-profiles`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

  const { apiClient, ApiError } = await import('@/lib/api')
  const resp = await apiClient.postRaw('/api/admin/bulk-create-profiles', { method: 'POST', body: formData })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.message || 'Upload failed')

      setResult({
        created: data.created,
        updated: data.updated,
        total: data.total,
      })

      toast.success('Bulk profile import completed')
      setCsvFile(null)
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setCsvFile(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-12 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Background Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-blue-600/10 blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-6xl mx-auto space-y-10"
      >
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-[0.4em]"
            >
              <ShieldCheck className="w-4 h-4" /> 
              Admin Control Center
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white italic">
              DATA <span className="text-indigo-500 not-italic">INGESTION</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-900/40 border border-slate-800/50 px-6 py-3 rounded-2xl backdrop-blur-xl group hover:border-indigo-500/50 transition-all">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none">System Status</p>
              <p className="text-sm font-bold text-emerald-400">Engine Operational</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/50 transition-all">
              <Cpu className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Upload Logic */}
          <div className="lg:col-span-8 space-y-8">
            <motion.div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group relative border-2 border-dashed rounded-[2.5rem] p-12 md:p-20 text-center transition-all cursor-pointer overflow-hidden
                ${dragActive ? 'border-indigo-500 bg-indigo-500/5 scale-[0.99] shadow-2xl shadow-indigo-500/10' : 'border-slate-800 bg-slate-900/20 hover:border-slate-700 hover:bg-slate-900/40'}
                ${csvFile ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}
            >
              {/* Internal Glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <input 
                ref={fileInputRef}
                type="file" 
                title="CSV Manifest"
                aria-label="CSV Manifest"
                accept=".csv" 
                className="hidden" 
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />

              <div className="relative z-10 space-y-6">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-2 transition-all duration-500 shadow-2xl
                  ${csvFile ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-800 group-hover:bg-indigo-600 group-hover:rotate-12'}`}>
                  {csvFile ? (
                    <FileSpreadsheet className="w-10 h-10 text-white" />
                  ) : (
                    <CloudUpload className="w-10 h-10 text-white" />
                  )}
                </div>
                
                <div className="space-y-2">
                  {csvFile ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <p className="text-2xl font-black text-white tracking-tight">{csvFile.name}</p>
                      <p className="text-emerald-400 text-sm font-mono tracking-tighter uppercase">{(csvFile.size / 1024).toFixed(2)} KB • VALIDATED PAYLOAD</p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCsvFile(null); }}
                        className="mt-6 px-6 py-2 rounded-full border border-slate-700 text-xs text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50 transition-all font-bold"
                      >
                        FLUSH BUFFER
                      </button>
                    </motion.div>
                  ) : (
                    <div className="space-y-3">
                      <h3 className="text-2xl font-black text-white italic">DROP MANIFEST <span className="text-slate-500 not-italic">HERE</span></h3>
                      <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed font-medium">
                        Drag and drop your encrypted CSV member registry or select from local storage.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            <button
              onClick={handleBulkUpload}
              disabled={loading || !csvFile}
              className="w-full relative h-16 bg-white disabled:bg-slate-800 disabled:text-slate-500 text-black rounded-3xl font-black uppercase tracking-[0.3em] text-sm overflow-hidden transition-all active:scale-[0.98] shadow-2xl disabled:shadow-none hover:bg-indigo-500 hover:text-white group"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                {loading ? (
                  <div className="flex items-center gap-3">
                    <RefreshCcw className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    DEPLOY PROFILES <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </div>
                )}
              </div>
            </button>

            {/* Results Grid */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <ResultCard icon={CheckCircle2} label="New Nodes" value={result.created} color="emerald" />
                  <ResultCard icon={RefreshCcw} label="Mutated Nodes" value={result.updated} color="sky" />
                  <ResultCard icon={BarChart3} label="Batch Total" value={result.total} color="indigo" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Information/Guide */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Database className="w-24 h-24" />
              </div>

              <div className="relative z-10 space-y-8">
                <div className="flex items-center gap-3 text-indigo-400 font-black text-xs uppercase tracking-widest">
                  <Terminal className="w-5 h-5" /> 
                  Structure Protocol
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-white font-black text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      Required Headers
                    </h4>
                    <div className="bg-black/60 p-5 rounded-2xl border border-slate-800/50 font-mono text-[11px] leading-relaxed text-slate-400 custom-scrollbar group-hover:border-indigo-500/30 transition-colors">
                      {`Member Picture, Name, Enrollment Number, Council-id, Committee/Team name, Position, Phone number, Email Id, Address, instagram, Discord, linkdin, Snapchat, Github`}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-800/50">
                    <GuideItem icon={Info} text="File encoding must be UTF-8" />
                    <GuideItem icon={ShieldCheck} text="Council-id used for primary indexing" />
                    <GuideItem icon={X} text="Avoid special characters in names" />
                  </div>
                </div>
              </div>
            </div>

            {/* Micro Stats Card */}
            {/* <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white space-y-2 group cursor-default">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Bulk Limit</p>
              <h4 className="text-3xl font-black italic tracking-tighter">Unlimited</h4>
              <p className="text-xs font-medium opacity-80 leading-relaxed">System processing is limited only by your browser's heap size and network latency.</p>
            </div> */}
          </aside>
        </div>
      </motion.div>
    </div>
  )
}

function ResultCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
  }

  return (
    <div className={`border p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center transition-all hover:bg-slate-900/40 ${colors[color]}`}>
      <div className="p-4 rounded-2xl bg-slate-900 mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-4xl font-black tracking-tighter text-white">{value}</p>
    </div>
  )
}

function GuideItem({ icon: Icon, text }: { icon: any, text: string }) {
  return (
    <div className="flex gap-4 items-center group/item">
      <div className="w-8 h-8 rounded-xl bg-slate-800/50 flex items-center justify-center shrink-0 border border-slate-700/50 group-hover/item:bg-indigo-500 transition-colors">
        <Icon className="w-4 h-4 text-slate-400 group-hover/item:text-white" />
      </div>
      <p className="text-xs text-slate-400 font-semibold group-hover/item:text-slate-200 transition-colors">{text}</p>
    </div>
  )
}