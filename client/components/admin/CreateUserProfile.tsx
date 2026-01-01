'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import {
  Upload, User, Mail, Phone, Building, Briefcase, MapPin, 
  Github, Linkedin, Instagram, MessageCircle, Hash, 
  ShieldCheck, Camera, Eraser, CheckCircle2, ChevronRight
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
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Unauthorized Access')

      const form = new FormData()
      form.append('councilId', councilId)
      Object.entries(formData).forEach(([key, value]) => form.append(key, value))
      if (selectedFile) form.append('memberPicture', selectedFile)

      const res = await fetch(`http://localhost:5005/api/profiles/${isEdit ? 'update' : 'create'}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      toast.success('Registry updated successfully')
      resetForm()
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
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto py-12 px-6 min-h-screen bg-[#f8fafc]"
    >
      {/* HEADER */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-emerald-900/10 pb-8 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 font-black text-xs uppercase tracking-[0.3em]">
            <ShieldCheck className="w-4 h-4" /> Official Registry
          </div>
          <h1 className="text-4xl font-black text-emerald-950 tracking-tight italic">
            Council <span className="text-amber-500 not-italic">Enrollment</span>
          </h1>
        </div>
        <button 
          onClick={() => setIsEdit(!isEdit)}
          className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
            isEdit ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-emerald-800 border-emerald-800'
          }`}
        >
          {isEdit ? 'Mode: Amending Records' : 'Mode: New Entry'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* SIDEBAR: PHOTO & ID */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-emerald-900 p-10 rounded-[3rem] shadow-2xl flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-amber-500" />
            <div className="relative group">
              <div className="w-44 h-44 rounded-full border-4 border-amber-500/30 p-2 overflow-hidden bg-emerald-950 flex items-center justify-center">
                {previewImage ? (
                  <img src={previewImage} className="w-full h-full object-cover rounded-full" alt="Preview" />
                ) : (
                  <User className="w-16 h-16 text-emerald-800" />
                )}
              </div>
              <label className="absolute bottom-1 right-1 bg-amber-500 p-3 rounded-full text-emerald-950 cursor-pointer hover:scale-110 transition-transform shadow-xl">
                <Camera className="w-5 h-5" />
                <input type="file" hidden accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) { setSelectedFile(file); setPreviewImage(URL.createObjectURL(file)) }
                }} />
              </label>
            </div>
            <h3 className="mt-6 font-black text-amber-500 uppercase text-xs tracking-[0.2em]">Member Portrait</h3>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-emerald-900/5 shadow-sm space-y-4">
            <label className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest flex items-center gap-2">
              <Hash className="w-3 h-3 text-amber-500" /> Unique Council ID
            </label>
            <input 
              required value={councilId} onChange={(e) => setCouncilId(e.target.value)}
              className="w-full bg-emerald-50/50 border-b-2 border-emerald-900/10 px-4 py-3 text-emerald-950 font-bold outline-none focus:border-amber-500 transition-colors"
              placeholder="Ex: GU-2025-XXXX"
            />
          </div>
        </div>

        {/* MAIN FORM: DETAILS */}
        <div className="lg:col-span-8 space-y-8">
          <section className="bg-white p-12 rounded-[3.5rem] border border-emerald-900/5 shadow-sm space-y-10">
            <h2 className="text-xs font-black text-emerald-900/30 uppercase tracking-[0.4em] flex items-center gap-3">
              Institutional Data
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              <FormField icon={User} label="Legal Full Name" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} required />
              <FormField icon={Hash} label="University Enrollment" value={formData.enrollmentNumber} onChange={(v) => setFormData({ ...formData, enrollmentNumber: v })} />
              <FormField icon={Building} label="Assigned Committee" value={formData.committeeName} onChange={(v) => setFormData({ ...formData, committeeName: v })} required />
              <FormField icon={Briefcase} label="Council Designation" value={formData.position} onChange={(v) => setFormData({ ...formData, position: v })} required />
              <FormField icon={Phone} label="Contact Mobile" value={formData.phoneNumber} onChange={(v) => setFormData({ ...formData, phoneNumber: v })} type="tel" />
              <FormField icon={Mail} label="Institutional Email" value={formData.emailId} onChange={(v) => setFormData({ ...formData, emailId: v })} type="email" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-3 h-3 text-amber-500" /> Permanent Address
              </label>
              <textarea 
                rows={3} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-emerald-50/30 border border-emerald-900/5 p-5 rounded-3xl outline-none focus:border-amber-500 transition-all resize-none font-medium"
              />
            </div>
          </section>

          <section className="bg-emerald-950 p-10 rounded-[3rem] shadow-xl">
            <h2 className="text-[10px] font-black text-amber-500/50 uppercase tracking-[0.4em] mb-8">Social Authentication</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SocialField icon={Instagram} value={formData.instagram} onChange={(v) => setFormData({ ...formData, instagram: v })} placeholder="Instagram Handle" />
              <SocialField icon={MessageCircle} value={formData.discord} onChange={(v) => setFormData({ ...formData, discord: v })} placeholder="Discord Tag" />
              <SocialField icon={Linkedin} value={formData.linkedin} onChange={(v) => setFormData({ ...formData, linkedin: v })} placeholder="LinkedIn Profile" />
              <SocialField icon={Github} value={formData.github} onChange={(v) => setFormData({ ...formData, github: v })} placeholder="GitHub Username" />
            </div>
          </section>

          <div className="flex items-center justify-end gap-6 pt-6">
            <button type="button" onClick={resetForm} className="text-emerald-900/40 font-black text-[10px] uppercase tracking-widest hover:text-red-500 transition-colors flex items-center gap-2">
              <Eraser className="w-4 h-4" /> Clear Entry
            </button>
            <button 
              type="submit" disabled={loading}
              className="bg-emerald-900 text-amber-500 px-12 py-5 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 hover:bg-emerald-800 disabled:opacity-50 transition-all"
            >
              {loading ? 'Processing...' : isEdit ? 'Update Records' : 'Validate & Enroll'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  )
}

function FormField({ icon: Icon, label, value, onChange, type = 'text', required }: any) {
  return (
    <div className="space-y-2 group">
      <label className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest flex items-center gap-2 group-focus-within:text-amber-600 transition-colors">
        <Icon className="w-3 h-3" /> {label}
      </label>
      <input 
        type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border-b-2 border-emerald-900/5 px-0 py-2 text-emerald-950 font-bold outline-none focus:border-amber-500 transition-all placeholder:text-emerald-900/10"
      />
    </div>
  )
}

function SocialField({ icon: Icon, value, onChange, placeholder }: any) {
  return (
    <div className="flex items-center gap-4 bg-emerald-900/50 border border-emerald-800 p-4 rounded-2xl focus-within:border-amber-500 transition-all">
      <Icon className="w-5 h-5 text-amber-500" />
      <input 
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="bg-transparent border-none outline-none text-white font-bold text-xs placeholder:text-white/20 w-full"
      />
    </div>
  )
}