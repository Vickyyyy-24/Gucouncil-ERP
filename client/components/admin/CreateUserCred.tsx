'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  UserPlus, 
  FileUp, 
  Shield, 
  Key, 
  UserCircle, 
  FileSpreadsheet, 
  Info, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

export default function CreateUserCred() {
  const [councilId, setCouncilId] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'committee_member' | 'committee_head' | 'gs'>('committee_member')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSingleUserCreate = async () => {
    if (!councilId || !password) {
      return
    }
    setLoading(true)
    try {
      const { apiClient, ApiError } = await import('@/lib/api')
      const payload = { councilId, password, role }
      try {
        await apiClient.post('http://localhost:5003/api/admin/create-user', payload)
        setCouncilId(''); setPassword(''); setRole('committee_member')
      } catch (err: any) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          try { localStorage.removeItem('token') } catch {}
          return
        }
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUpload = async () => {
    if (!csvFile) {
      return
    }
    setLoading(true)
    const formData = new FormData()
    formData.append('csvFile', csvFile)
    try {
      const { apiClient, ApiError } = await import('@/lib/api')
      try {
        const data = await apiClient.postRaw('http://localhost:5003/api/admin/bulk-create-users', { method: 'POST', body: formData })
        const body = await data.json()
        setCsvFile(null)
      } catch (err: any) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          try { localStorage.removeItem('token') } catch {}
          return
        }
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && councilId && password && !loading) {
      handleSingleUserCreate()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto pb-8 md:pb-12 px-4"
    >
      <div className="bg-[#1A1A1A] rounded-2xl md:rounded-3xl mt-5 shadow-2xl border border-indigo-500/10 overflow-hidden">
        {/* Header Section */}
        <div className="bg-[#1A1A1A] px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 md:p-10 opacity-5">
            <Shield className="w-20 h-20 md:w-32 md:h-32" />
          </div>
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white">
              USER <span className="text-indigo-500">PROVISIONING</span>
            </h1>
            <p className="text-indigo-100 mt-1.5 md:mt-2 font-medium text-xs sm:text-sm">
              Manage and establish secure credentials for council members.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-indigo-500/10">
          
          {/* Single User Creation */}
          <div className="p-4 sm:p-6 md:p-8 lg:p-12 space-y-6 md:space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-1"
            >
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                <UserCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                <span className="hidden sm:inline">Manual Entry</span>
                <span className="sm:hidden">Manual</span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-400">Create a single identity record</p>
            </motion.div>

            <div className="space-y-4 md:space-y-6" onKeyPress={handleKeyPress}>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-3 md:space-y-4"
              >
                <div className="group">
                  <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-2 block group-focus-within:text-indigo-400 transition-colors">
                    Council Identifier
                  </label>
                  <div className="relative">
                    <HashIcon className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                    <input
                      type="text"
                      value={councilId}
                      onChange={(e) => setCouncilId(e.target.value)}
                      className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-[#1A1A1A] border border-indigo-500/20 rounded-lg sm:rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-semibold text-white placeholder:text-gray-600 hover:border-indigo-500/30"
                      placeholder="e.g. TECH-001"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-2 block group-focus-within:text-indigo-400 transition-colors">
                    Secret Key
                  </label>
                  <div className="relative">
                    <Key className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-[#1A1A1A] border border-indigo-500/20 rounded-lg sm:rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-semibold text-white placeholder:text-gray-600 hover:border-indigo-500/30"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-2 block group-focus-within:text-indigo-400 transition-colors">
                    Access Level
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 pointer-events-none" />
                    <select
                      title="Access Level"
                      aria-label="Access Level"
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-[#1A1A1A] border border-indigo-500/20 rounded-lg sm:rounded-xl outline-none appearance-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-semibold text-white hover:border-indigo-500/30"
                    >
                      <option value="committee_member">Committee Member</option>
                      <option value="committee_head">Committee Head</option>
                      <option value="gs">General Secretary</option>
                    </select>
                  </div>
                </div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSingleUserCreate}
                disabled={loading}
                className="w-full bg-emerald-600 text-white font-black text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] py-3 sm:py-4 rounded-lg sm:rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                {loading ? 'Processing...' : 'Establish Identity'}
              </motion.button>
            </div>
          </div>

          {/* Bulk Upload */}
          <div className="p-4 sm:p-6 md:p-8 lg:p-12 space-y-6 md:space-y-8 bg-indigo-600/5">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-1"
            >
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                <FileUp className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                <span className="hidden sm:inline">Bulk Provisioning</span>
                <span className="sm:hidden">Bulk Upload</span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-400">Import multiple identities via CSV</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`relative border-2 border-dashed rounded-2xl sm:rounded-[2rem] p-6 sm:p-8 md:p-10 text-center transition-all group ${csvFile ? 'border-emerald-400 bg-emerald-500/10' : 'border-indigo-500/30 hover:border-indigo-500/60 bg-transparent'}`}
            >
              <input
                id="csv-file"
                type="file"
                className="sr-only"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
              
              <label htmlFor="csv-file" className="cursor-pointer space-y-3 sm:space-y-4 block">
                <div className={`mx-auto h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all ${csvFile ? 'bg-emerald-500 text-white' : 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/30'}`}>
                  {csvFile ? <FileSpreadsheet className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" /> : <FileUp className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />}
                </div>
                
                <div className="space-y-1">
                  <span className="block text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors break-all px-2">
                    {csvFile ? csvFile.name : 'Drop migration file here'}
                  </span>
                  <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Accepted format: .CSV only
                  </p>
                </div>
              </label>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBulkUpload}
              disabled={loading || !csvFile}
              className="w-full bg-slate-900 text-white font-black text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] py-3 sm:py-4 rounded-lg sm:rounded-xl shadow-lg shadow-slate-500/30 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <FileUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              <span className="hidden sm:inline">{loading ? 'Migrating...' : 'Execute Bulk Migration'}</span>
              <span className="sm:hidden">{loading ? 'Migrating...' : 'Bulk Upload'}</span>
            </motion.button>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#1A1A1A] rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-indigo-500/10 shadow-lg"
            >
              <div className="flex items-center gap-2 mb-3 sm:mb-4 text-gray-400">
                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Protocol Specification</h4>
              </div>
              <div className="bg-indigo-500/10 rounded-lg p-2.5 sm:p-3 overflow-x-auto border border-indigo-500/20">
                <code className="text-[9px] sm:text-[10px] text-indigo-300 font-mono leading-relaxed whitespace-pre block">
                  {`Council-id,password,role
TECH001,pass123,committee_member
TECH002,pass456,committee_head`}
                </code>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </motion.div>
  )
}

/* Helper Components */
function HashIcon({ className }: { className: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>
  )
}