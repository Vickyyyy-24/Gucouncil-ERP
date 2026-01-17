'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { onSocketEvent } from '@/lib/socket'
import { toast } from 'react-toastify'

import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

// Member Components
import MemberProfile from '@/components/member/MemberProfile'
import AttendanceTracker from '@/components/member/AttendanceTracker'
import WorkReports from '@/components/member/WorkReports'
import LeaveApplications from '@/components/member/LeaveApplications'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005'

export default function MemberDashboard() {
  const router = useRouter()
  const { user, loading, logout } = useAuth()

  const [activeTab, setActiveTab] = useState('profile')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  /* =====================================================
     🔐 CLIENT FALLBACK GUARD (MEMBER ONLY)
     ===================================================== */
  useEffect(() => {
    if (loading) return

    // ❌ Not logged in
    if (!user) {
      router.replace('/login')
      return
    }

    // ❌ Wrong role
    if (user.role !== 'committee_member') {
      logout()
      router.replace('/login')
    }
  }, [user, loading, logout, router])

  /* =====================================================
     👤 FETCH PROFILE (SECURE)
     ===================================================== */
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          console.warn('⛔ MemberDashboard: No token available')
          return
        }

        const res = await fetch(`${API_URL}/api/profiles/my-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setUserProfile(data)
          console.log('✅ Profile loaded successfully')
        } else if (res.status === 401 || res.status === 403) {
          console.error('❌ Unauthorized to fetch profile')
          logout()
          router.replace('/login')
        } else {
          console.error('❌ Failed fetching profile, status:', res.status)
        }
      } catch (err) {
        console.error('❌ Profile fetch failed:', err)
      }
    }

    fetchUserProfile()
  }, [user, refreshTrigger, logout, router])

  /* =====================================================
     🔌 SOCKET EVENT LISTENERS - GLOBAL SOCKET
     ===================================================== */
  useEffect(() => {
    if (!user) {
      console.warn('⛔ MemberDashboard: No user available for socket listeners')
      return
    }

    console.log('📡 Setting up socket listeners for user:', user.councilId)

    try {
      // Listen for profile updates
      const unsubscribeProfile = onSocketEvent('profile_updated', (payload) => {
        console.log('📡 profile_updated event received:', payload)
        if (payload?.councilId === user.councilId) {
          console.log('✅ Profile updated via socket')
          setRefreshTrigger((prev) => prev + 1)
          toast.info('Profile synchronized')
        }
      })

      // Listen for attendance updates
      const unsubscribeAttendance = onSocketEvent(
        'attendance:update',
        (payload) => {
          console.log('📡 attendance:update event received:', payload)
          if (payload?.userId === user.councilId || payload?.councilId === user.councilId) {
            console.log('✅ Attendance updated via socket')
            setRefreshTrigger((prev) => prev + 1)
          }
        }
      )

      // Listen for leave updates
      const unsubscribeLeave = onSocketEvent('leave:updated', (payload) => {
        console.log('📡 leave:updated event received:', payload)
        if (payload?.userId === user.councilId || payload?.councilId === user.councilId) {
          console.log('✅ Leave updated via socket')
          setRefreshTrigger((prev) => prev + 1)
          toast.info('Leave status updated')
        }
      })

      // Listen for report updates
      const unsubscribeReport = onSocketEvent('report:updated', (payload) => {
        console.log('📡 report:updated event received:', payload)
        if (payload?.userId === user.councilId || payload?.councilId === user.councilId) {
          console.log('✅ Report updated via socket')
          setRefreshTrigger((prev) => prev + 1)
          toast.info('Report status updated')
        }
      })

      // Cleanup all listeners when component unmounts or user changes
      return () => {
        console.log('🧹 Cleaning up socket listeners')
        unsubscribeProfile()
        unsubscribeAttendance()
        unsubscribeLeave()
        unsubscribeReport()
      }
    } catch (error) {
      console.error('❌ Socket listener setup error:', error)
    }
  }, [user, user?.councilId])

  /* =====================================================
     🧠 MERGE AUTH USER + PROFILE
     ===================================================== */
  const userWithAvatar = userProfile
    ? {
        ...user,
        name: userProfile.name,
        memberPicture:
          userProfile.member_picture || userProfile.memberPicture || null,
      }
    : user

  /* =====================================================
     📑 SIDEBAR TABS
     ===================================================== */
  const tabs = [
    { id: 'profile', label: 'My Profile', icon: 'UserCircle' },
    { id: 'attendance', label: 'Attendance', icon: 'Clock' },
    { id: 'reports', label: 'Work Reports', icon: 'FileText' },
    { id: 'leaves', label: 'Apply Leave', icon: 'Calendar' },
  ]

  /* =====================================================
     🧭 TAB RENDERER
     ===================================================== */
  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <MemberProfile />
      case 'attendance':
        return <AttendanceTracker />
      case 'reports':
        return <WorkReports />
      case 'leaves':
        return <LeaveApplications />
      default:
        return <MemberProfile />
    }
  }

  /* =====================================================
     🚪 LOGOUT HANDLER
     ===================================================== */
  const handleLogout = () => {
    logout()
    router.replace('/login')
  }

  /* =====================================================
     🧩 UI - RENDER GUARD
     ===================================================== */
  if (loading || !user || user.role !== 'committee_member') {
    return null
  }

  return (
    <div className="min-h-screen w-screen bg-[#1A1A1A] flex overflow-hidden fixed inset-0">
      {/* SIDEBAR */}
      <Sidebar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userRole="committee_member"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen">
        {/* HEADER */}
        <Header
          user={userWithAvatar}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          onProfileClick={() => setActiveTab('profile')}
          onLogout={handleLogout}
        />

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto bg-[#1A1A1A]">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}