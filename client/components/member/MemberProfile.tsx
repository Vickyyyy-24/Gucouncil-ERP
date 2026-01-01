'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { io } from 'socket.io-client'
import { 
  User, Mail, Phone, MapPin, Globe, 
  Instagram, Linkedin, Github, MessageSquare, 
  Edit3, Save, X, Camera, ShieldCheck, 
  Award, Layers, IdCard, Smartphone, Hash
} from 'lucide-react'

const socket = io('http://localhost:5005', {
  transports: ['websocket'],
})

export default function MemberProfile() {
  const [profile, setProfile] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    emailId: '',
    address: '',
    instagram: '',
    discord: '',
    linkedin: '',
    snapchat: '',
    github: '',
    memberPicture: null as File | null,
  })

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5005/api/profiles/my-profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setProfile(data)
      setFormData({
        name: data.name || '',
        phoneNumber: data.phone_number || '',
        emailId: data.email_id || '',
        address: data.address || '',
        instagram: data.instagram || '',
        discord: data.discord || '',
        linkedin: data.linkedin || '',
        snapchat: data.snapchat || '',
        github: data.github || '',
        memberPicture: null,
      })
    } catch {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    socket.on('profile_updated', (payload) => {
      if (payload.councilId === profile?.council_id) {
        setProfile(payload.profile)
        toast.info('Profile synchronized')
      }
    })
    return () => { socket.off('profile_updated') }
  }, [profile])

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0]
      setFormData((prev) => ({ ...prev, memberPicture: file }))
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const fd = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null) fd.append(key, value as any)
      })

      const res = await fetch('http://localhost:5005/api/profiles/update', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) throw new Error()
      toast.success('Profile updated')
      setIsEditing(false)
      setPreview(null)
      fetchProfile()
    } catch {
      toast.error('Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-pulse min-h-screen">
      <div className="h-48 w-full bg-slate-200 rounded-[2.5rem]" />
      <div className="flex gap-6 -mt-20 px-8">
        <div className="w-40 h-40 bg-slate-300 rounded-full border-4 border-white shadow-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-96 bg-white rounded-[3rem]" />
        <div className="h-96 bg-emerald-950 rounded-[3rem]" />
      </div>
    </div>
  )

  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  }

  return (
    <motion.div initial="hidden" animate="visible" className="max-w-6xl mx-auto pb-20 px-4 pt-6">
      
      {/* HEADER SECTION */}
      <motion.div variants={itemVars} className="bg-white rounded-[3rem] shadow-2xl shadow-emerald-900/10 border border-emerald-50 overflow-hidden mb-8">
        <div className="h-52 relative bg-emerald-950 overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className=" text-center"
            >
                <h2 className="text-amber-400 text-3xl md:text-5xl font-black uppercase tracking-[0.2em]">
                    GU Student Council
                </h2>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <div className="h-[1px] w-12 bg-amber-500/50" />
                  <span className="text-emerald-200 font-bold tracking-[0.5em] text-sm">2025-26</span>
                  <div className="h-[1px] w-12 bg-amber-500/50" />
                </div>
            </motion.div>
        </div>

        <div className="px-12 pb-12">
          <div className="relative flex flex-col md:flex-row md:items-end -mt-24 gap-10">
            <div className="relative group shrink-0">
              <img
                src={preview || profile.member_picture || '/placeholder-user.png'}
                className="w-48 h-48 rounded-full object-cover border-[8px] border-white shadow-2xl bg-white"
                alt="Profile"
              />
              {isEditing && (
                <label className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md flex flex-col items-center justify-center text-amber-400 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 border-4 border-amber-400/20">
                  <Camera className="w-8 h-8 mb-2" />
                  <span className="text-xs font-black uppercase tracking-widest">Update</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePictureChange} />
                </label>
              )}
            </div>
            
            <div className="flex-1 mb-2">
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    <input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="text-4xl font-black border-b-2 border-amber-500 outline-none w-full max-w-lg pb-1 bg-transparent text-emerald-950 focus:border-emerald-600 transition-colors"
                      placeholder="Your Name"
                    />
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h1 className="text-5xl font-black text-emerald-950 tracking-tight flex items-center gap-4">
                      {profile.name}
                      <div className="p-2 bg-amber-100 rounded-full">
                         <ShieldCheck className="text-amber-600 w-6 h-6" />
                      </div>
                    </h1>
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="text-emerald-700 font-bold mt-4 text-sm tracking-[0.3em] uppercase flex items-center gap-2">
                <Layers className="w-4 h-4" /> {profile.position} <span className="text-emerald-300">|</span> {profile.committee_name}
              </p>
            </div>

            <div className="flex gap-4 h-fit pb-2">
              {!isEditing ? (
                <motion.button
                  whileHover={{ y: -4, shadow: "0 20px 25px -5px rgb(6 78 59 / 0.1)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsEditing(true)}
                  className="px-10 py-4 bg-emerald-950 text-amber-400 text-xs font-black uppercase tracking-[0.2em] rounded-full flex items-center gap-3 transition-all"
                >
                  <Edit3 className="w-4 h-4" /> Edit Profile
                </motion.button>
              ) : (
                <div className="flex gap-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsEditing(false)}
                    className="p-4 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSave}
                    disabled={saving}
                    className="px-10 py-4 bg-amber-500 text-emerald-950 text-xs font-black uppercase tracking-[0.2em] rounded-full shadow-lg flex items-center gap-3"
                  >
                    <Save className="w-4 h-4" /> {saving ? 'Saving' : 'Commit Changes'}
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* BODY CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* LEFT: PERSONAL INFO */}
        <motion.div variants={itemVars} className="lg:col-span-2 space-y-10">
          <section className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-emerald-50/50">
            <div className="flex items-center justify-between mb-16">
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                    <User className="text-emerald-700 w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-emerald-950 uppercase tracking-[0.2em]">Council Identity</h3>
              </div>
              <Award className="text-amber-400 w-8 h-8 opacity-40" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-14">
              <InfoBlock icon={Hash} label="Council ID" value={profile.council_id} />
              <InfoBlock icon={Layers} label="Committee" value={profile.committee_name} />
              <EditableField
                icon={Mail}
                label="Corporate Email"
                value={formData.emailId}
                editing={isEditing}
                onChange={(v) => setFormData({ ...formData, emailId: v })}
              />
              <EditableField
                icon={Smartphone}
                label="Direct Line"
                value={formData.phoneNumber}
                editing={isEditing}
                onChange={(v) => setFormData({ ...formData, phoneNumber: v })}
              />
              <div className="md:col-span-2">
                <EditableField
                  icon={MapPin}
                  label="Office Location"
                  value={formData.address}
                  editing={isEditing}
                  textarea
                  onChange={(v) => setFormData({ ...formData, address: v })}
                />
              </div>
            </div>
          </section>
        </motion.div>

        {/* RIGHT: CONNECTIVITY */}
        <motion.div variants={itemVars}>
          <section className="bg-emerald-950 p-12 rounded-[3.5rem] shadow-2xl shadow-emerald-950/20 sticky top-8">
            <h3 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.4em] mb-12 flex items-center gap-3">
              <Globe className="w-4 h-4" /> Connectivity
            </h3>
            <div className="space-y-12">
              <EditableField icon={Linkedin} label="LinkedIn" value={formData.linkedin} editing={isEditing} dark onChange={(v)=>setFormData({...formData, linkedin:v})}/>
              <EditableField icon={Github} label="GitHub" value={formData.github} editing={isEditing} dark onChange={(v)=>setFormData({...formData, github:v})}/>
              <EditableField icon={Instagram} label="Instagram" value={formData.instagram} editing={isEditing} dark onChange={(v)=>setFormData({...formData, instagram:v})}/>
              <EditableField icon={MessageSquare} label="Discord" value={formData.discord} editing={isEditing} dark onChange={(v)=>setFormData({...formData, discord:v})}/>
            </div>
          </section>
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ================= THEMED COMPONENTS ================= */

function InfoBlock({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-start gap-4">
      <Icon className="w-5 h-5 text-amber-500 mt-1" />
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-emerald-950 font-extrabold text-lg">{value || 'N/A'}</p>
      </div>
    </div>
  )
}

function EditableField({ icon: Icon, label, value, editing, onChange, textarea, dark }: any) {
  return (
    <div className="flex items-start gap-5 group">
      <div className={`mt-1 p-2 rounded-xl transition-colors ${dark ? 'bg-emerald-900/50 group-hover:bg-amber-500/10' : 'bg-slate-50 group-hover:bg-emerald-50'}`}>
        <Icon className={`w-5 h-5 ${dark ? 'text-amber-500' : 'text-emerald-700'}`} />
      </div>
      <div className="flex-1 space-y-2">
        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${dark ? 'text-emerald-500' : 'text-slate-400'}`}>{label}</p>
        <AnimatePresence mode="wait">
          {editing ? (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {textarea ? (
                <textarea
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className={`w-full px-5 py-3 text-sm rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 transition-all border ${dark ? 'bg-emerald-900/50 text-white border-emerald-800' : 'bg-slate-50 text-emerald-950 border-slate-100 shadow-inner'}`}
                  rows={3}
                />
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className={`w-full px-5 py-3 text-sm rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 transition-all border ${dark ? 'bg-emerald-900/50 text-white border-emerald-800' : 'bg-slate-50 text-emerald-950 border-slate-100 shadow-inner'}`}
                />
              )}
            </motion.div>
          ) : (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`font-bold text-sm leading-relaxed ${dark ? 'text-emerald-50' : 'text-emerald-950'}`}>
              {value || 'Not provided'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}