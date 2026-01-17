'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getSocket } from '@/lib/socket'

import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

// Admin Components
import UserStats from '@/components/admin/UserStats'
import CreateUserCred from '@/components/admin/CreateUserCred'
import CreateUserProfile from '@/components/admin/CreateUserProfile'
import BulkProfileCreation from '@/components/admin/BulkProfileCreation'
import AttendanceManagement from '@/components/admin/AttendanceManagement'
import BiometricRegistration from '@/components/admin/BiometricRegistration'
import LogsManagement from '@/components/admin/LogsManagement'

// Head components (admin view)
import CommitteeInsights from '@/components/head/CommitteeInsights'
import CommitteeActivityPage from '@/components/head/committee-activity'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading, logout } = useAuth()

  /* ================= ALL HOOKS FIRST ================= */
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)

  /* ================= AUTH GUARD ================= */
  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace('/login')
      return
    }

    if (user.role !== 'admin') {
      logout()
      router.replace('/login')
    }
  }, [user, loading, logout, router])

  /* ================= PROFILE FETCH ================= */
  useEffect(() => {
    if (!user || user.role !== 'admin') return

    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          console.warn('⛔ AdminDashboard: No token available')
          return
        }

        const res = await fetch(`${API_URL}/api/profiles/my-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setUserProfile(data)
          console.log('✅ Admin profile loaded successfully')
        } else if (res.status === 401 || res.status === 403) {
          console.error('❌ Unauthorized to fetch admin profile')
          logout()
          router.replace('/login')
        } else {
          console.error('❌ Failed to fetch admin profile, status:', res.status)
        }
      } catch (err) {
        console.error('❌ Profile fetch failed:', err)
      }
    }

    fetchProfile()
  }, [user, logout, router])

  /* ================= SOCKET LISTENER FOR PROFILE UPDATES ================= */
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      console.warn('⛔ AdminDashboard: No admin user available for socket listeners')
      return
    }

    try {
      const socket = getSocket()

      if (!socket) {
        console.warn('⛔ AdminDashboard: Socket not initialized')
        return
      }

      console.log('📡 Setting up socket listener for admin profile updates')

      const handleProfileUpdated = (payload: any) => {
        console.log('📡 profile_updated event received:', payload)
        if (payload?.councilId === user.councilId) {
          console.log('✅ Admin profile updated via socket, refreshing...')
          // Re-fetch profile
          const token = localStorage.getItem('token')
          if (token) {
            fetch(`${API_URL}/api/profiles/my-profile`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((res) => res.ok && res.json())
              .then((data) => {
                if (data) setUserProfile(data)
              })
              .catch((err) => console.error('Failed to refresh profile:', err))
          }
        }
      }

      socket.on('profile_updated', handleProfileUpdated)

      return () => {
        console.log('🧹 Cleaning up admin socket listener')
        socket.off('profile_updated', handleProfileUpdated)
      }
    } catch (error) {
      console.error('❌ Socket listener error:', error)
    }
  }, [user, user?.councilId])

  /* ================= SAFE RENDER BLOCK ================= */
  if (loading || !user || user.role !== 'admin') {
    return null
  }

  /* ================= MERGED USER ================= */
  const userWithAvatar = userProfile
    ? {
        ...user,
        name: userProfile.name,
        memberPicture:
          userProfile.member_picture || userProfile.memberPicture || null,
      }
    : user

  /* ================= TABS ================= */
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { id: 'create-user-cred', label: 'Create User Credentials', icon: 'UserPlus' },
    { id: 'create-profile', label: 'Create User Profile', icon: 'UserCircle' },
    { id: 'bulk-profiles', label: 'Bulk Profile Creation', icon: 'ClipboardList' },
    { id: 'attendance', label: 'Attendance Analytics', icon: 'Clock' },
    { id: 'biometric', label: 'Biometric Registration', icon: 'Fingerprint' },
    { id: 'logs', label: 'Logs & Reports', icon: 'FileText' },
    { id: 'insights', label: 'Committee Insights', icon: 'BarChart3' },
    { id: 'committee', label: 'Committee Activity', icon: 'Users' },
  ]

  /* ================= CONTENT ================= */
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <UserStats />
      case 'create-user-cred':
        return <CreateUserCred />
      case 'create-profile':
        return <CreateUserProfile />
      case 'bulk-profiles':
        return <BulkProfileCreation />
      case 'attendance':
        return <AttendanceManagement />
      case 'biometric':
        return <BiometricRegistration />
      case 'logs':
        return <LogsManagement />
      case 'insights':
        return <CommitteeInsights />
      case 'committee':
        return <CommitteeActivityPage />
      default:
        return <UserStats />
    }
  }

  /* ================= UI ================= */
  return (
    <div className="min-h-screen w-screen bg-[#252525] flex overflow-hidden fixed inset-0">
      <Sidebar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userRole="admin"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col h-screen">
        <Header
          user={userWithAvatar}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          onProfileClick={() => setActiveTab('create-profile')}
          onLogout={logout}
        />

        <main className="flex-1 overflow-y-auto bg-[#1A1A1A]">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}