'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { 
  Upload, User, Mail, Phone, Building, Briefcase, MapPin, 
  Github, Linkedin, Instagram, MessageCircle, Hash, 
  ShieldCheck, Camera, Eraser, CheckCircle2, ChevronRight,
  Cpu, Database, ArrowUpRight
} from 'lucide-react'

export default function CreateOrUpdateUserProfile() {
  const [councilId, setCouncilId] = useState('')
  const [loading, setLoading] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '', enrollmentNumber: '', committeeName: '', position: '',
    phoneNumber: '', emailId: '', address: '', instagram: '',
    discord: '', linkedin: '', snapchat: '', github: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { apiClient, ApiError } = await import('@/lib/api')
      const form = new FormData()
      form.append('councilId', councilId)
      Object.entries(formData).forEach(([key, value]) => form.append(key, value as any))
      if (selectedFile) form.append('memberPicture', selectedFile)

      try {
        const endpoint = `http://localhost:5005/api/profiles/${isEdit ? 'update' : 'create'}`
        const resp = await apiClient.postRaw(endpoint, { method: isEdit ? 'PUT' : 'POST', body: form })
        const body = await resp.json()
        if (!resp.ok) throw new Error(body?.message || 'Profile update failed')
        toast.success('Registry updated successfully')
        resetForm()
      } catch (err: any) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          try { localStorage.removeItem('token') } catch {}
          toast.error('Unauthorized — please login again')
          return
        }
        throw err
      }
    } catch (err: any) {
      toast.error(err.message || 'System error')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setCouncilId(''); setIsEdit(false); setSelectedFile(null); setPreviewImage(null)
    setFormData({
      name: '', enrollmentNumber: '', committeeName: '', position: '',
      phoneNumber: '', emailId: '', address: '', instagram: '',
      discord: '', linkedin: '', snapchat: '', github: ''
    })
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-12 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
      {/* Background Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-blue-600/10 blur-[100px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-7xl mx-auto space-y-10"
      >
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-[0.4em]"
            >
              <ShieldCheck className="w-4 h-4" /> Official Registry
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white italic uppercase">
              COUNCIL <span className="text-indigo-500 not-italic">ENROLLMENT</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => setIsEdit(!isEdit)}
              className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 shadow-2xl ${
                isEdit 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20' 
                  : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:border-indigo-500/50'
              }`}
            >
              {isEdit ? 'Mode: Update Entry' : 'Mode: New Entry'}
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* SIDEBAR: PHOTO & ID */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-slate-900/40 border border-slate-800/50 p-10 rounded-[3rem] backdrop-blur-xl shadow-2xl flex flex-col items-center relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 opacity-50" />
              <div className="relative">
                <div className="w-44 h-44 rounded-[2.5rem] border-2 border-dashed border-slate-700 p-2 transition-all group-hover:border-indigo-500/50 bg-black/20 flex items-center justify-center overflow-hidden">
                  {previewImage ? (
                    <img src={previewImage} className="w-full h-full object-cover rounded-[2rem]" alt="Preview" />
                  ) : (
                    <User className="w-16 h-16 text-slate-800" />
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 bg-white p-4 rounded-2xl text-black cursor-pointer hover:bg-indigo-500 hover:text-white transition-all shadow-2xl active:scale-90">
                  <Camera className="w-5 h-5" />
                  <input type="file" hidden accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) { setSelectedFile(file); setPreviewImage(URL.createObjectURL(file)) }
                  }} />
                </label>
              </div>
              <h3 className="mt-8 font-black text-indigo-400 uppercase text-[10px] tracking-[0.3em]">Portrait Manifest</h3>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/50 p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Hash className="w-3 h-3 text-indigo-500" /> Council Unique ID
              </label>
              <input 
                required value={councilId} onChange={(e) => setCouncilId(e.target.value)}
                className="w-full bg-black/40 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-700"
                placeholder="GU-2025-XXXX"
              />
            </div>
          </div>

          {/* MAIN FORM: DETAILS */}
          <div className="lg:col-span-8 space-y-8">
            <section className="bg-slate-900/40 border border-slate-800/50 p-8 md:p-12 rounded-[3.5rem] backdrop-blur-xl shadow-2xl space-y-12">
              <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Institutional Registry Data
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                <FormField icon={User} label="Legal Full Name" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} required />
                <FormField icon={Hash} label="University Enrollment" value={formData.enrollmentNumber} onChange={(v) => setFormData({ ...formData, enrollmentNumber: v })} />
                <FormField icon={Building} label="Assigned Committee" value={formData.committeeName} onChange={(v) => setFormData({ ...formData, committeeName: v })} required />
                <FormField icon={Briefcase} label="Council Designation" value={formData.position} onChange={(v) => setFormData({ ...formData, position: v })} required />
                <FormField icon={Phone} label="Contact Mobile" value={formData.phoneNumber} onChange={(v) => setFormData({ ...formData, phoneNumber: v })} type="tel" />
                <FormField icon={Mail} label="Institutional Email" value={formData.emailId} onChange={(v) => setFormData({ ...formData, emailId: v })} type="email" />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-2">
                  <MapPin className="w-3 h-3 text-indigo-500" /> Locality Address
                </label>
                <textarea 
                  rows={3} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-black/40 border border-slate-800 p-6 rounded-[2rem] text-white font-medium outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none placeholder:text-slate-800"
                  placeholder="Enter permanent residence details..."
                />
              </div>
            </section>

            <section className="bg-black/40 border border-slate-800/50 p-10 rounded-[3rem] shadow-xl">
              <h2 className="text-[10px] font-black text-indigo-400/50 uppercase tracking-[0.4em] mb-10 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Network Authentication Handles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SocialField icon={Instagram} value={formData.instagram} onChange={(v) => setFormData({ ...formData, instagram: v })} placeholder="Instagram Handle" />
                <SocialField icon={MessageCircle} value={formData.discord} onChange={(v) => setFormData({ ...formData, discord: v })} placeholder="Discord Tag" />
                <SocialField icon={Linkedin} value={formData.linkedin} onChange={(v) => setFormData({ ...formData, linkedin: v })} placeholder="LinkedIn Profile" />
                <SocialField icon={Github} value={formData.github} onChange={(v) => setFormData({ ...formData, github: v })} placeholder="GitHub Username" />
              </div>
            </section>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-6 pt-6">
              <button 
                type="button" 
                onClick={resetForm} 
                className="text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-red-400 transition-colors flex items-center gap-2"
              >
                <Eraser className="w-4 h-4" /> Flush Buffer
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full sm:w-auto bg-white text-black px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 hover:bg-indigo-500 hover:text-white disabled:opacity-50 transition-all active:scale-95 group"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {isEdit ? 'Sync Changes' : 'Execute Enrollment'}
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

/* THEMED FORM FIELD */
function FormField({ icon: Icon, label, value, onChange, type = 'text', required }: any) {
  return (
    <div className="space-y-3 group">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 group-focus-within:text-indigo-400 transition-colors ml-1">
        <Icon className="w-3 h-3" /> {label}
      </label>
      <input 
        type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-slate-800 px-1 py-3 text-white font-bold outline-none focus:border-indigo-500 transition-all placeholder:text-slate-800"
        placeholder={`Enter ${label.toLowerCase()}...`}
      />
    </div>
  )
}

/* THEMED SOCIAL FIELD */
function SocialField({ icon: Icon, value, onChange, placeholder }: any) {
  return (
    <div className="flex items-center gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-[1.5rem] focus-within:border-indigo-500/50 transition-all group">
      <Icon className="w-5 h-5 text-indigo-500 group-focus-within:scale-110 transition-transform" />
      <input 
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="bg-transparent border-none outline-none text-white font-bold text-xs placeholder:text-slate-700 w-full"
      />
    </div>
  )
}

function RefreshCw({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
  )
}