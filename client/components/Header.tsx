'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { io } from 'socket.io-client'
import { 
  ShieldCheck, 
  User, 
  LogOut, 
  Search,
  Command,
  X,
  Menu,
  Bell,
  Settings
} from 'lucide-react'

interface UserType {
  id: number
  councilId: string
  role: string
  memberPicture?: string
  name?: string
}

interface HeaderProps {
  user: UserType | null
  onMenuClick?: () => void
  onProfileClick?: () => void
  onLogout?: () => void
}

// Real NotificationBell component with Socket.io
function NotificationBell() {
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    const socket = io('http://localhost:5005')

    socket.on('leave_update', (payload) => {
      setCount((c) => c + 1)
      setNotifications((prev) => [
        {
          id: Date.now(),
          message: `Leave ${payload.type.replaceAll('_', ' ')}`,
          time: new Date().toLocaleTimeString()
        },
        ...prev
      ])
    })

    socket.on('attendance:update', (payload) => {
      setCount((c) => c + 1)
      setNotifications((prev) => [
        {
          id: Date.now(),
          message: `${payload.name} punched ${payload.type === 'punch_in' ? 'IN' : 'OUT'}`,
          time: new Date().toLocaleTimeString()
        },
        ...prev
      ])
    })

    return () => socket.disconnect()
  }, [])

  const toggle = () => {
    setOpen(!open)
    if (!open) setCount(0)
  }

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggle}
        className="relative rounded-xl p-2 text-gray-400 transition-all hover:bg-[#252525] hover:text-orange-500"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white"
          >
            {count}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-3 w-72 sm:w-80 rounded-2xl border border-orange-500/20 bg-[#252525] shadow-2xl z-50 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-orange-500/10">
                <p className="text-sm font-bold text-white">Notifications</p>
              </div>

              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">
                  No new notifications
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="px-4 py-3 border-b border-orange-500/5 hover:bg-[#2A2A2A] transition-colors"
                    >
                      <p className="text-sm text-white font-medium">{n.message}</p>
                      <span className="text-xs text-gray-500 mt-1">
                        {n.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// User Avatar Component with Profile Picture
function UserAvatar({ user }: { user: UserType | null }) {
  const [showImage, setShowImage] = useState(true)

  // Get image URL
  const getImageUrl = () => {
    if (!user?.memberPicture) return null
    
    if (user.memberPicture.startsWith('http')) {
      return user.memberPicture
    }
    
    // Construct full URL for backend images
    return `http://localhost:5005${user.memberPicture}`
  }

  const imageUrl = getImageUrl()

  return (
    <div className="relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-2xl border-2 border-orange-500/20 bg-[#252525] shadow-lg transition-all group-hover:border-orange-500/50 group-hover:shadow-orange-500/20 overflow-hidden">
      
      {/* Profile Picture */}
      {imageUrl && showImage && (
        <img
          src={imageUrl}
          alt={user?.name || user?.councilId || 'User'}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => {
            console.warn('❌ Profile image failed to load:', imageUrl)
            setShowImage(false)
          }}
          onLoad={() => {
            console.log('✅ Profile image loaded successfully')
          }}
        />
      )}

      {/* Fallback Avatar (always visible as background) */}
      <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 text-xs sm:text-sm font-black text-white ${
        showImage && imageUrl ? 'hidden' : 'flex'
      }`}>
        {user?.councilId
          ? user.councilId.charAt(0).toUpperCase()
          : <User className="w-4 h-4 sm:w-5 sm:h-5" />
        }
      </div>
    </div>
  )
}

export default function Header({ user, onMenuClick, onProfileClick, onLogout }: HeaderProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleLogout = () => {
    setShowUserMenu(false)
    
    if (onLogout) {
      onLogout()
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
  }

  const handleProfileClick = () => {
    setShowUserMenu(false)
    if (onProfileClick) {
      onProfileClick()
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-orange-500/10 bg-[#1A1A1A]/95 backdrop-blur-xl">
      <div className="w-full px-3 sm:px-4 lg:px-6">
        <div className="flex h-16 sm:h-20 items-center justify-between gap-2 sm:gap-4">
          
          {/* LEFT: HAMBURGER MENU (Mobile) OR BRANDING (Desktop) */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className={`flex items-center gap-2 sm:gap-3 min-w-fit ${mobileSearchOpen ? 'hidden sm:flex' : 'flex'}`}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onMenuClick}
              className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30 text-white"
            >
              <Menu className="w-5 h-5" strokeWidth={2.5} />
            </motion.button>

            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="hidden lg:flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30 shrink-0"
            >
              <ShieldCheck className="text-white w-6 h-6" />
            </motion.div>

            <div className="hidden sm:flex flex-col">
              <h2 className="font-black text-white tracking-tight text-base sm:text-lg leading-tight">
                COUNCIL <span className="text-orange-500">ERP</span>
              </h2>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange-500"></span>
                </span>
                <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  System Online
                </p>
              </div>
            </div>
          </motion.div>

          {/* CENTER: COMMAND SEARCH (OMNIBAR) */}
          <div className={`flex-1 max-w-md ${mobileSearchOpen ? 'block' : 'hidden md:block'}`}>
            <div className={`relative flex items-center w-full transition-all duration-300 ${isSearchFocused ? 'scale-[1.02]' : 'scale-100'}`}>
              <Search className={`absolute left-3 sm:left-4 w-4 h-4 transition-colors ${isSearchFocused ? 'text-orange-500' : 'text-gray-400'}`} />
              <input 
                type="text"
                autoFocus={mobileSearchOpen}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => {
                  setIsSearchFocused(false)
                  setTimeout(() => setMobileSearchOpen(false), 100)
                }}
                placeholder="Search registry..."
                className={`w-full rounded-xl sm:rounded-2xl border bg-[#252525] py-2 sm:py-2.5 pl-10 sm:pl-11 pr-12 sm:pr-20 text-xs sm:text-sm font-medium text-white placeholder-gray-500 outline-none transition-all ${
                  isSearchFocused 
                    ? 'border-orange-500 ring-4 ring-orange-500/20 shadow-lg shadow-orange-500/20' 
                    : 'border-orange-500/20 hover:border-orange-500/40'
                }`}
              />
              <div className="absolute right-3 hidden sm:flex items-center gap-1 rounded-lg border border-orange-500/20 bg-[#2A2A2A] px-2 py-1 shadow-sm">
                <Command size={10} className="text-gray-400" />
                <span className="text-[10px] font-black text-gray-400">K</span>
              </div>
              {mobileSearchOpen && (
                <button 
                  onClick={() => setMobileSearchOpen(false)}
                  className="absolute right-3 p-1 text-gray-400 hover:text-white transition-colors md:hidden"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: SYSTEM ACTIONS & USER PROFILE */}
          <div className={`flex items-center gap-2 sm:gap-3 ${mobileSearchOpen ? 'hidden' : 'flex'}`}>
            
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileSearchOpen(true)}
              className="p-2 text-gray-400 hover:text-orange-500 md:hidden hover:bg-[#252525] rounded-xl transition-all"
            >
              <Search size={20} />
            </motion.button>

            <div className="relative border-r border-orange-500/10 pr-2 sm:pr-3">
              <NotificationBell />
            </div>

            <motion.button
              whileHover={{ scale: 1.05, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
              className="hidden sm:flex rounded-xl p-2 text-gray-400 transition-all hover:bg-[#252525] hover:text-orange-500"
            >
              <Settings className="w-5 h-5" />
            </motion.button>

            {/* User Profile Section */}
            <div className="flex items-center gap-2 sm:gap-3 border-l border-orange-500/10 pl-2 sm:pl-3">
              <div className="hidden lg:flex flex-col text-right">
                <p className="text-xs font-black uppercase tracking-wider text-white leading-none">
                  {user?.councilId || 'GUEST'}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase text-orange-500 tracking-wide">
                  {user?.role?.replace('_', ' ') || 'Pending'}
                </p>
              </div>

              {/* User Avatar with Dropdown */}
              <div className="relative">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="group relative cursor-pointer shrink-0"
                >
                  <UserAvatar user={user} />

                  {/* Online Status Indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-[#1A1A1A] shadow-sm border border-orange-500/20">
                    <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  </div>
                </motion.button>

                {/* User Dropdown Menu */}
                <AnimatePresence>
                  {showUserMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setShowUserMenu(false)}
                      />
                      
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full mt-3 w-56 sm:w-64 rounded-2xl border border-orange-500/20 bg-[#252525] shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="border-b border-orange-500/10 p-4">
                          <p className="text-sm font-bold text-white">{user?.councilId || 'Guest User'}</p>
                          <p className="text-xs text-gray-400 mt-1">{user?.role?.replace('_', ' ') || 'No Role Assigned'}</p>
                        </div>

                        <div className="p-2">
                          <MenuItem icon={User} label="Profile" onClick={handleProfileClick} />
                          <MenuItem icon={Settings} label="Settings" onClick={() => setShowUserMenu(false)} />
                          <div className="my-2 border-t border-orange-500/10" />
                          <MenuItem icon={LogOut} label="Logout" onClick={handleLogout} danger />
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger = false }: any) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        danger 
          ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' 
          : 'text-gray-300 hover:bg-orange-500/10 hover:text-orange-500'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </motion.button>
  )
}