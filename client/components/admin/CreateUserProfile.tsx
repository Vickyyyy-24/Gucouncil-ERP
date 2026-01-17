'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, User, Mail, Phone, Building, Briefcase, MapPin, 
  Github, Linkedin, Instagram, MessageCircle, Hash, 
  ShieldCheck, Camera, Eraser, CheckCircle2, ChevronRight,
  Cpu, Database, ArrowUpRight, RefreshCw
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
        resetForm()
      } catch (err: any) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          try { localStorage.removeItem('token') } catch {}
          return
        }
        throw err
      }
    } catch (err: any) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 sm:gap-6"
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20">
            <motion.div 
              className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div 
              className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xs sm:text-sm font-semibold text-indigo-500 text-center"
          >
            Processing Enrollment...
          </motion.p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white p-4 md:p-12 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
           <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-7xl mx-auto space-y-10"
      >
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-[0.4em]">
              <ShieldCheck className="w-4 h-4" /> Official Registry
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white">
              COUNCIL <span className="text-indigo-500">ENROLLMENT</span>
            </h1>
          </motion.div>
          
          <motion.button 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setIsEdit(!isEdit)}
            className={`px-6 md:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-lg ${
              isEdit 
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/30' 
                : 'bg-[#252525] text-indigo-400 border-indigo-500/20 hover:border-indigo-500/50'
            }`}
          >
            {isEdit ? '✓ Update Mode' : '+ New Entry'}
          </motion.button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
          {/* SIDEBAR: PHOTO & ID */}
          <div className="lg:col-span-4 space-y-6 md:space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#252525] border border-indigo-500/10 p-8 md:p-10 rounded-2xl md:rounded-3xl backdrop-blur-xl shadow-2xl flex flex-col items-center relative overflow-hidden group hover:border-indigo-500/20 transition-all"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 to-indigo-400 opacity-50" />
              <div className="relative">
                <div className="w-40 h-40 md:w-48 md:h-48 rounded-2xl border-2 border-dashed border-indigo-500/30 p-2 transition-all group-hover:border-indigo-500/60 bg-indigo-500/5 flex items-center justify-center overflow-hidden">
                  {previewImage ? (
                    <img src={previewImage} className="w-full h-full object-cover rounded-xl" alt="Preview" />
                  ) : (
                    <User className="w-12 h-12 md:w-16 md:h-16 text-indigo-500/30" />
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 bg-indigo-600 p-3 md:p-4 rounded-xl text-white cursor-pointer hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-500/50 active:scale-90">
                  <Camera className="w-4 h-4 md:w-5 md:h-5" />
                  <input type="file" hidden accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) { setSelectedFile(file); setPreviewImage(URL.createObjectURL(file)) }
                  }} />
                </label>
              </div>
              <h3 className="mt-6 md:mt-8 font-black text-indigo-400 uppercase text-[10px] tracking-[0.3em]">Portrait Manifest</h3>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#252525] border border-indigo-500/10 p-6 md:p-8 rounded-2xl backdrop-blur-xl shadow-2xl space-y-4 hover:border-indigo-500/20 transition-all"
            >
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Hash className="w-3 h-3 text-indigo-500" /> Council Unique ID
              </label>
              <input 
                required 
                value={councilId} 
                onChange={(e) => setCouncilId(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-indigo-500/20 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-gray-600 hover:border-indigo-500/30"
                placeholder="GU-2025-XXXX"
              />
            </motion.div>
          </div>

          {/* MAIN FORM: DETAILS */}
          <div className="lg:col-span-8 space-y-6 md:space-y-8">
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#252525] border border-indigo-500/10 p-6 md:p-8 lg:p-12 rounded-2xl md:rounded-3xl backdrop-blur-xl shadow-2xl space-y-8 md:space-y-12 hover:border-indigo-500/20 transition-all"
            >
              <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Institutional Registry Data
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-x-12 lg:gap-y-10">
                <FormField icon={User} label="Legal Full Name" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} required />
                <FormField icon={Hash} label="University Enrollment" value={formData.enrollmentNumber} onChange={(v) => setFormData({ ...formData, enrollmentNumber: v })} />
                <FormField icon={Building} label="Assigned Committee" value={formData.committeeName} onChange={(v) => setFormData({ ...formData, committeeName: v })} required />
                <FormField icon={Briefcase} label="Council Designation" value={formData.position} onChange={(v) => setFormData({ ...formData, position: v })} required />
                <FormField icon={Phone} label="Contact Mobile" value={formData.phoneNumber} onChange={(v) => setFormData({ ...formData, phoneNumber: v })} type="tel" />
                <FormField icon={Mail} label="Institutional Email" value={formData.emailId} onChange={(v) => setFormData({ ...formData, emailId: v })} type="email" />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-indigo-500" /> Locality Address
                </label>
                <textarea 
                  rows={3} 
                  value={formData.address} 
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-[#1A1A1A] border border-indigo-500/20 p-4 md:p-6 rounded-xl text-white font-medium outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none placeholder:text-gray-600 hover:border-indigo-500/30"
                  placeholder="Enter permanent residence details..."
                />
              </div>
            </motion.section>

            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-indigo-600/5 border border-indigo-500/10 p-6 md:p-8 lg:p-10 rounded-2xl md:rounded-3xl shadow-xl hover:border-indigo-500/20 transition-all"
            >
              <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-6 md:mb-10 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Social Handles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <SocialField icon={Instagram} value={formData.instagram} onChange={(v) => setFormData({ ...formData, instagram: v })} placeholder="Instagram Handle" />
                <SocialField icon={MessageCircle} value={formData.discord} onChange={(v) => setFormData({ ...formData, discord: v })} placeholder="Discord Tag" />
                <SocialField icon={Linkedin} value={formData.linkedin} onChange={(v) => setFormData({ ...formData, linkedin: v })} placeholder="LinkedIn Profile" />
                <SocialField icon={Github} value={formData.github} onChange={(v) => setFormData({ ...formData, github: v })} placeholder="GitHub Username" />
              </div>
            </motion.section>

            {/* ACTION BUTTONS */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-end gap-4 md:gap-6 pt-4 md:pt-6"
            >
              <button 
                type="button" 
                onClick={resetForm}
                className="text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-indigo-400 transition-colors flex items-center gap-2"
              >
                <Eraser className="w-4 h-4" /> Reset Form
              </button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={loading}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 md:px-12 py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 group"
              >
                {isEdit ? 'Update Changes' : 'Execute Profile'}
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </motion.button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* THEMED FORM FIELD */
function FormField({ icon: Icon, label, value, onChange, type = 'text', required }: any) {
  return (
    <motion.div 
      className="space-y-2 md:space-y-3 group"
    >
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 group-focus-within:text-indigo-400 transition-colors">
        <Icon className="w-3 h-3 text-indigo-500" /> {label}
      </label>
      <input 
        type={type} 
        value={value} 
        required={required} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-indigo-500/20 px-1 py-2 md:py-3 text-white font-bold outline-none focus:border-indigo-500 transition-all placeholder:text-gray-600 hover:border-indigo-500/40"
        placeholder={`Enter ${label.toLowerCase()}...`}
      />
    </motion.div>
  )
}

/* THEMED SOCIAL FIELD */
function SocialField({ icon: Icon, value, onChange, placeholder }: any) {
  return (
    <motion.div 
      className="flex items-center gap-4 bg-indigo-500/5 border border-indigo-500/20 p-4 md:p-5 rounded-xl focus-within:border-indigo-500/50 focus-within:bg-indigo-500/10 transition-all group hover:border-indigo-500/30"
    >
      <Icon className="w-4 h-4 md:w-5 md:h-5 text-indigo-500 group-focus-within:scale-110 transition-transform shrink-0" />
      <input 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder}
        className="bg-transparent border-none outline-none text-white font-bold text-xs md:text-sm placeholder:text-gray-600 w-full"
      />
    </motion.div>
  )
}