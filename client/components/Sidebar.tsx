'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  ShieldCheck
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'

interface Tab {
  id: string
  label: string
  icon: string
}

interface SidebarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  userRole: string
  onLogout?: () => void  // Optional logout callback
}

export default function Sidebar({ tabs, activeTab, onTabChange, userRole, onLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Logout handler
  const handleLogout = () => {
    if (onLogout) {
      onLogout()  // Call the passed logout function
    } else {
      // Fallback: clear localStorage and redirect
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
  }

  // Dynamic Icon Renderer
  const IconRenderer = ({ iconName, className }: { iconName: string, className?: string }) => {
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle
    return <Icon className={className} size={20} />
  }

  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full bg-[#1A1A1A] border-r border-orange-500/10">
      {/* Brand Section */}
      <div className={`p-6 border-b border-orange-500/10 ${!isMobile && !isExpanded ? 'px-4' : ''}`}>
        <motion.div 
          className="flex items-center gap-3 group cursor-pointer"
          whileHover={{ x: 2 }}
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
            <ShieldCheck className="text-white w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          {(isMobile || isExpanded) && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <h2 className="font-black text-white tracking-tight text-base sm:text-lg leading-tight">
                COUNCIL <span className="text-orange-500">CRM</span>
              </h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
                {userRole.replace('_', ' ')} Panel
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id
          return (
            <motion.button
              key={tab.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => {
                onTabChange(tab.id)
                setIsOpen(false)
              }}
              className={`w-full group relative flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                  : 'text-gray-400 hover:bg-[#252525] hover:text-white'
              }`}
            >
              {/* Active Indicator */}
              {isActive && (
                <motion.div 
                  layoutId="active-indicator"
                  className="absolute left-0 w-1 h-8 bg-orange-500 rounded-r-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              
              <div className={`${!isMobile && !isExpanded ? 'mx-auto' : ''}`}>
                <IconRenderer 
                  iconName={tab.icon} 
                  className={`${isActive ? 'text-orange-500' : 'text-gray-400 group-hover:text-orange-500'} transition-colors`} 
                />
              </div>
              
              {(isMobile || isExpanded) && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm font-medium tracking-wide"
                >
                  {tab.label}
                </motion.span>
              )}
              
              {isActive && (isMobile || isExpanded) && (
                <ChevronRight className="ml-auto opacity-50" size={16} />
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* Logout Section */}
      <div className="p-3 border-t border-orange-500/10">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 border border-transparent transition-all duration-200 font-medium text-sm ${!isMobile && !isExpanded ? 'justify-center' : ''}`}
        >
          <LogOut size={20} />
          {(isMobile || isExpanded) && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Logout
            </motion.span>
          )}
        </motion.button>
      </div>
    </div>
  )

  return (
    <>
      {/* MOBILE TRIGGER BUTTON */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30 text-white"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Menu size={24} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* MOBILE OVERLAY / DRAWER */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[280px] z-[80] shadow-2xl"
            >
              <NavContent isMobile={true} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DESKTOP SIDEBAR */}
      <motion.aside 
        initial={false}
        animate={{ width: isExpanded ? 280 : 80 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className="hidden lg:flex h-screen sticky top-0 flex-col shadow-2xl z-40"
      >
        <NavContent isMobile={false} />
      </motion.aside>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.4);
        }
      `}</style>
    </>
  )
}