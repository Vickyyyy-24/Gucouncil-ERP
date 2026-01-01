'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
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

  const handleSingleUserCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5003/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ councilId, password, role })
      })

      const data = await response.json()
      if (response.ok) {
        toast.success('Identity established successfully!')
        setCouncilId(''); setPassword(''); setRole('committee_member')
      } else {
        toast.error(data.message || 'Validation failed')
      }
    } catch (error) {
      toast.error('System synchronization error')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUpload = async () => {
    if (!csvFile) {
      toast.error('Identity file required')
      return
    }
    setLoading(true)
    const formData = new FormData()
    formData.append('csvFile', csvFile)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5003/api/admin/bulk-create-users', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      const data = await response.json()
      if (response.ok) {
        toast.success(`Migration complete: ${data.created} users established`)
        if (data.errors.length > 0) data.errors.forEach((err: string) => toast.warning(err))
        setCsvFile(null)
      } else {
        toast.error(data.message || 'Migration failed')
      }
    } catch (error) {
      toast.error('System processing error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto pb-12 px-4"
    >
      <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {/* Header Section */}
        <div className="bg-slate-900 px-8 py-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-10">
            <Shield className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <UserPlus className="text-emerald-400 w-8 h-8" />
              User Provisioning
            </h2>
            <p className="text-slate-400 mt-2 font-medium">Manage and establish secure credentials for council members.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          
          {/* Single User Creation */}
          <div className="p-8 md:p-12 space-y-8">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-emerald-500" />
                Manual Entry
              </h3>
              <p className="text-sm text-slate-500">Create a single identity record</p>
            </div>

            <form onSubmit={handleSingleUserCreate} className="space-y-6">
              <div className="space-y-4">
                <div className="group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block group-focus-within:text-emerald-600 transition-colors">Council Identifier</label>
                  <div className="relative">
                    <HashIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      type="text"
                      value={councilId}
                      onChange={(e) => setCouncilId(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold text-slate-700"
                      placeholder="e.g. TECH-001"
                      required
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block group-focus-within:text-emerald-600 transition-colors">Secret Key</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold text-slate-700"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block group-focus-within:text-emerald-600 transition-colors">Access Level</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none appearance-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold text-slate-700"
                    >
                      <option value="committee_member">Committee Member</option>
                      <option value="committee_head">Committee Head</option>
                      <option value="gs">General Secretary</option>
                    </select>
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-900 text-white font-black text-xs uppercase tracking-[0.2em] py-4 rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {loading ? 'Processing...' : 'Establish Identity'}
              </motion.button>
            </form>
          </div>

          {/* Bulk Upload */}
          <div className="p-8 md:p-12 space-y-8 bg-slate-50/30">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <FileUp className="w-5 h-5 text-indigo-500" />
                Bulk Provisioning
              </h3>
              <p className="text-sm text-slate-500">Import multiple identities via CSV</p>
            </div>
            
            <div className={`relative border-2 border-dashed rounded-[2rem] p-10 text-center transition-all group ${csvFile ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200 hover:border-indigo-400 bg-white'}`}>
              <input
                id="csv-file"
                type="file"
                className="sr-only"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
              
              <label htmlFor="csv-file" className="cursor-pointer space-y-4 block">
                <div className={`mx-auto h-16 w-16 rounded-2xl flex items-center justify-center transition-all ${csvFile ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-500 group-hover:text-white'}`}>
                  {csvFile ? <FileSpreadsheet className="w-8 h-8" /> : <FileUp className="w-8 h-8" />}
                </div>
                
                <div className="space-y-1">
                  <span className="block text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                    {csvFile ? csvFile.name : 'Drop migration file here'}
                  </span>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Accepted format: .CSV only
                  </p>
                </div>
              </label>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBulkUpload}
              disabled={loading || !csvFile}
              className="w-full bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] py-4 rounded-xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-300"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
              {loading ? 'Migrating...' : 'Execute Bulk Migration'}
            </motion.button>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-slate-400">
                <Info className="w-4 h-4" />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Protocol Specification</h4>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 overflow-x-auto">
                <code className="text-[10px] text-slate-500 font-mono leading-relaxed whitespace-pre">
                  {`Council-id,password,role
TECH001,pass123,committee_member
TECH002,pass456,committee_head`}
                </code>
              </div>
            </div>
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