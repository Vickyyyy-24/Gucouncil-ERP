'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { onSocketEvent } from '@/lib/socket'
import { apiClient } from '@/lib/api'
import { 
  User, Mail, Phone, MapPin, Globe, 
  Instagram, Linkedin, Github, MessageSquare, 
  Edit3, Save, X, Camera, ShieldCheck, 
  Award, Layers, Smartphone, Hash
} from 'lucide-react'

export default function MemberProfile() {
  const [profile, setProfile] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)

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

  const getProfileImageUrl = (imagePath: string | null | undefined) => {
    if (!imagePath) return '/placeholder-user.png'
    
    // Already a full URL
    if (imagePath.startsWith('http')) {
      return imagePath
    }
    
    // Relative path - add backend URL
    return `http://localhost:5005${imagePath}`
  }

  const fetchProfile = async () => {
    try {
      const data = await apiClient.getMyProfile()
      setProfile(data)
      setImageError(false)
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
      console.log('✅ Member profile loaded successfully')
    } catch (err) {
      console.error('❌ Failed to load profile', err)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  /* ================= FETCH PROFILE ON MOUNT ================= */
  useEffect(() => {
    fetchProfile()
  }, [])

  /* ================= SOCKET LISTENER FOR PROFILE UPDATES ================= */
  useEffect(() => {
    try {
      const unsubscribe = onSocketEvent('profile_updated', (payload) => {
        console.log('📡 profile_updated event received:', payload)
        if (payload?.councilId === profile?.council_id) {
          console.log('✅ Member profile updated via socket, refreshing...')
          setProfile(payload.profile)
          setImageError(false)
          toast.info('Profile synchronized')
        }
      })

      return () => {
        console.log('🧹 Cleaning up member profile socket listener')
        unsubscribe()
      }
    } catch (error) {
      console.error('❌ Socket listener error:', error)
    }
  }, [profile?.council_id])

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
      const { memberPicture, ...profileDataWithoutFile } = formData
      
      await apiClient.updateProfile(profileDataWithoutFile, memberPicture as File)
      
      toast.success('Profile updated')
      setIsEditing(false)
      setPreview(null)
      setImageError(false)
      fetchProfile()
    } catch (err) {
      console.error('❌ Profile update failed:', err)
      toast.error('Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8 animate-pulse min-h-screen">
      <div className="h-32 sm:h-40 lg:h-48 w-full bg-slate-200 rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem]" />
      <div className="flex gap-4 sm:gap-6 -mt-12 sm:-mt-16 lg:-mt-20 px-4 sm:px-6 lg:px-8">
        <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 bg-slate-300 rounded-full border-2 sm:border-4 border-white shadow-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div className="lg:col-span-2 h-64 sm:h-80 lg:h-96 bg-white rounded-2xl sm:rounded-3xl lg:rounded-[3rem]" />
        <div className="h-64 sm:h-80 lg:h-96 bg-emerald-950 rounded-2xl sm:rounded-3xl lg:rounded-[3rem]" />
      </div>
    </div>
  )

  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  }

  return (
    <motion.div initial="hidden" animate="visible" className="max-w-7xl mx-auto pb-12 sm:pb-16 lg:pb-20 px-3 sm:px-4 lg:px-6 pt-4 sm:pt-6">
      
      {/* HEADER SECTION */}
      <motion.div variants={itemVars} className="bg-white rounded-2xl sm:rounded-3xl lg:rounded-[3rem] shadow-xl sm:shadow-2xl shadow-emerald-900/10 border border-emerald-50 overflow-hidden mb-6 sm:mb-8">
        <div className="h-36 sm:h-44 lg:h-52 relative bg-emerald-950 overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center px-4"
            >
                <h2 className="text-amber-400 text-xl sm:text-3xl lg:text-5xl font-black uppercase tracking-[0.15em] sm:tracking-[0.2em]">
                    GU Student Council
                </h2>
                <div className="flex items-center justify-center gap-2 sm:gap-4 mt-1 sm:mt-2">
                  <div className="h-[1px] w-8 sm:w-12 bg-amber-500/50" />
                  <span className="text-emerald-200 font-bold tracking-[0.3em] sm:tracking-[0.5em] text-xs sm:text-sm">2025-26</span>
                  <div className="h-[1px] w-8 sm:w-12 bg-amber-500/50" />
                </div>
            </motion.div>
        </div>

        <div className="px-4 sm:px-8 lg:px-12 pb-6 sm:pb-10 lg:pb-12">
          <div className="relative flex flex-col gap-6 sm:gap-8 lg:gap-10">
            {/* Profile Picture & Name Row */}
            <div className="flex flex-col sm:flex-row sm:items-end -mt-16 sm:-mt-20 lg:-mt-24 gap-4 sm:gap-6 lg:gap-10">
              <div className="relative group shrink-0 mx-auto sm:mx-0">
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full overflow-hidden border-4 sm:border-6 lg:border-[8px] border-white shadow-2xl bg-white">
                  {/* Profile Picture */}
                  {!imageError && (
                    <img
                      src={preview || getProfileImageUrl(profile?.member_picture)}
                      className="w-full h-full object-cover"
                      alt="Profile"
                      onError={() => {
                        console.warn('❌ Profile image failed to load')
                        setImageError(true)
                      }}
                      onLoad={() => {
                        console.log('✅ Profile image loaded successfully')
                      }}
                    />
                  )}

                  {/* Fallback Avatar */}
                  <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 ${!imageError ? 'hidden' : 'flex'}`}>
                    <User className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-white/80" />
                  </div>
                </div>

                {isEditing && (
                  <label className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md flex flex-col items-center justify-center text-amber-400 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 border-2 sm:border-4 border-amber-400/20">
                    <Camera className="w-6 h-6 sm:w-8 sm:h-8 mb-1 sm:mb-2" />
                    <span className="text-[9px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest">Update</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePictureChange} />
                  </label>
                )}
              </div>
              
              <div className="flex-1 text-center sm:text-left mb-2">
                <AnimatePresence mode="wait">
                  {isEditing ? (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                      <input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="text-2xl sm:text-3xl lg:text-4xl font-black border-b-2 border-amber-500 outline-none w-full pb-1 bg-transparent text-emerald-950 focus:border-emerald-600 transition-colors"
                        placeholder="Your Name"
                      />
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-emerald-950 tracking-tight flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-4">
                        <span className="break-words max-w-full">{profile?.name}</span>
                        <div className="p-1.5 sm:p-2 bg-amber-100 rounded-full shrink-0">
                           <ShieldCheck className="text-amber-600 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                        </div>
                      </h1>
                    </motion.div>
                  )}
                </AnimatePresence>
                <p className="text-emerald-700 font-bold mt-3 sm:mt-4 text-[10px] sm:text-xs lg:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2">
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <Layers className="w-3 h-3 sm:w-4 sm:h-4" /> {profile?.position}
                  </span>
                  <span className="hidden sm:inline text-emerald-300">|</span> 
                  <span>{profile?.committee_name}</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center sm:justify-end gap-3 sm:gap-4">
              {!isEditing ? (
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto px-6 sm:px-8 lg:px-10 py-3 sm:py-3.5 lg:py-4 bg-emerald-950 text-amber-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] rounded-full flex items-center justify-center gap-2 sm:gap-3 transition-all shadow-lg"
                >
                  <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Edit Profile
                </motion.button>
              ) : (
                <div className="flex flex-col xs:flex-row gap-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsEditing(false)}
                    className="w-full xs:w-auto px-6 py-3 sm:py-3.5 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 font-bold text-sm"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="xs:hidden">Cancel</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full xs:w-auto px-6 sm:px-8 lg:px-10 py-3 sm:py-3.5 lg:py-4 bg-amber-500 text-emerald-950 text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] rounded-full shadow-lg flex items-center justify-center gap-2 sm:gap-3"
                  >
                    <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {saving ? 'Saving...' : 'Save Changes'}
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* BODY CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
        
        {/* LEFT: PERSONAL INFO */}
        <motion.div variants={itemVars} className="lg:col-span-2 space-y-6 sm:space-8 lg:space-y-10">
          <section className="bg-white p-6 sm:p-8 lg:p-12 rounded-2xl sm:rounded-3xl  shadow-sm border border-emerald-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-12 lg:mb-16">
              <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-emerald-50 rounded-xl sm:rounded-2xl flex items-center justify-center">
                    <User className="text-emerald-700 w-5 h-5 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                  <h3 className="text-sm sm:text-base lg:text-lg font-black text-emerald-950 uppercase tracking-[0.15em] sm:tracking-[0.2em]">Council Identity</h3>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-x-12 lg:gap-x-20 sm:gap-y-10 lg:gap-y-14">
              <InfoBlock icon={Hash} label="Council ID" value={profile?.council_id} />
              <InfoBlock icon={Layers} label="Committee" value={profile?.committee_name} />
              <EditableField
                icon={Mail}
                label="Student Email"
                value={formData.emailId}
                editing={isEditing}
                onChange={(v) => setFormData({ ...formData, emailId: v })}
              />
              <EditableField
                icon={Smartphone}
                label="Contact Number"
                value={formData.phoneNumber}
                editing={isEditing}
                onChange={(v) => setFormData({ ...formData, phoneNumber: v })}
              />
              <div className="sm:col-span-2">
                <EditableField
                  icon={MapPin}
                  label="Address"
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
          <section className="bg-emerald-950 p-6 sm:p-8 lg:p-12 rounded-2xl sm:rounded-3xl  shadow-xl sm:shadow-2xl shadow-emerald-950/20 lg:sticky lg:top-8">
            <h3 className="text-[10px] sm:text-[11px] font-black text-amber-500 uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-8 sm:mb-10 lg:mb-12 flex items-center gap-2 sm:gap-3">
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Social Connectivity
            </h3>
            <div className="space-y-8 sm:space-y-10 lg:space-y-12">
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
    <div className="flex items-start gap-3 sm:gap-4">
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 mt-0.5 sm:mt-1 shrink-0" />
      <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider sm:tracking-widest">{label}</p>
        <p className="text-emerald-950 font-extrabold text-sm sm:text-base lg:text-lg break-words">{value || 'N/A'}</p>
      </div>
    </div>
  )
}

function EditableField({ icon: Icon, label, value, editing, onChange, textarea, dark }: any) {
  return (
    <div className="flex items-start gap-3 sm:gap-4 lg:gap-5 group">
      <div className={`mt-0.5 sm:mt-1 p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-colors shrink-0 ${dark ? 'bg-emerald-900/50 group-hover:bg-amber-500/10' : 'bg-slate-50 group-hover:bg-emerald-50'}`}>
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${dark ? 'text-amber-500' : 'text-emerald-700'}`} />
      </div>
      <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
        <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] ${dark ? 'text-emerald-500' : 'text-slate-400'}`}>{label}</p>
        <AnimatePresence mode="wait">
          {editing ? (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {textarea ? (
                <textarea
                  title={label}
                  aria-label={label}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className={`w-full px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm rounded-xl sm:rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 transition-all border ${dark ? 'bg-emerald-900/50 text-white border-emerald-800' : 'bg-slate-50 text-emerald-950 border-slate-100 shadow-inner'}`}
                  rows={3}
                />
              ) : (
                <input
                  title={label}
                  aria-label={label}
                  type="text"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className={`w-full px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm rounded-xl sm:rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 transition-all border ${dark ? 'bg-emerald-900/50 text-white border-emerald-800' : 'bg-slate-50 text-emerald-950 border-slate-100 shadow-inner'}`}
                />
              )}
            </motion.div>
          ) : (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`font-bold text-xs sm:text-sm leading-relaxed break-words ${dark ? 'text-emerald-50' : 'text-emerald-950'}`}>
              {value || 'Not provided'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}