'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { onSocketEvent } from '@/lib/socket'
import { toast } from 'react-toastify'

import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

// Head / Member Components
import CommitteeInsights from '@/components/head/CommitteeInsights'
import CommitteeActivityPage from '@/components/head/committee-activity'
import MemberProfile from '@/components/member/MemberProfile'
import AttendanceTracker from '@/components/member/AttendanceTracker'
import WorkReports from '@/components/member/WorkReports'
import LeaveApplications from '@/components/member/LeaveApplications'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005'

export default function HeadDashboard() {
  const router = useRouter()
  const { user, loading, logout } = useAuth()

  const [activeTab, setActiveTab] = useState('insights')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  /* =====================================================
     🔐 CLIENT FALLBACK GUARD (COMMITTEE HEAD ONLY)
     ===================================================== */
  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace('/login')
      return
    }

    if (user.role !== 'committee_head') {
      logout()
      router.replace('/login')
    }
  }, [user, loading, logout, router])

  /* =====================================================
     👤 FETCH PROFILE
     ===================================================== */
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          console.warn('⛔ HeadDashboard: No token available')
          return
        }

        const res = await fetch(`${API_URL}/api/profiles/my-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setUserProfile(data)
          console.log('✅ Head profile loaded successfully')
        } else if (res.status === 401 || res.status === 403) {
          console.error('❌ Unauthorized to fetch head profile')
          logout()
          router.replace('/login')
        } else {
          console.error('❌ Failed to fetch head profile, status:', res.status)
        }
      } catch (err) {
        console.error('❌ Profile fetch failed:', err)
      }
    }

    fetchUserProfile()
  }, [user, refreshTrigger, logout, router])

  /* =====================================================
     🔌 SOCKET EVENT LISTENERS (GLOBAL SOCKET)
     ===================================================== */
  useEffect(() => {
    if (!user) {
      console.warn('⛔ HeadDashboard: No user available for socket listeners')
      return
    }

    console.log('📡 Setting up socket listeners for committee head:', user.councilId)

    try {
      // Profile updates
      const unsubProfile = onSocketEvent('profile_updated', (payload) => {
        console.log('📡 profile_updated event received:', payload)
        if (payload?.councilId === user.councilId) {
          console.log('✅ Head profile updated via socket')
          setRefreshTrigger((p) => p + 1)
          toast.info('Profile updated')
        }
      })

      // Committee attendance updates
      const unsubAttendance = onSocketEvent('attendance:update', (payload) => {
        console.log('📡 attendance:update event received:', payload)
        setRefreshTrigger((p) => p + 1)
      })

      // Leave events (committee scope)
      const unsubLeave = onSocketEvent('leave:updated', (payload) => {
        console.log('📡 leave:updated event received:', payload)
        setRefreshTrigger((p) => p + 1)
        toast.info('Leave activity updated')
      })

      // Work report updates
      const unsubReport = onSocketEvent('report:updated', (payload) => {
        console.log('📡 report:updated event received:', payload)
        setRefreshTrigger((p) => p + 1)
        toast.info('Report activity updated')
      })

      return () => {
        console.log('🧹 Cleaning up head dashboard socket listeners')
        unsubProfile()
        unsubAttendance()
        unsubLeave()
        unsubReport()
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
    { id: 'insights', label: 'Committee Insights', icon: 'BarChart3' },
    { id: 'committee', label: 'Committee Activity', icon: 'Users' },
    { id: 'profile', label: 'My Profile', icon: 'UserCircle' },
    { id: 'attendance', label: 'Attendance', icon: 'Clock' },
    { id: 'reports', label: 'Work Reports', icon: 'FileText' },
    { id: 'leaves', label: 'Apply Leave', icon: 'Calendar' },
  ]

  /* =====================================================
     🧭 CONTENT RENDERER
     ===================================================== */
  const renderContent = () => {
    switch (activeTab) {
      case 'insights':
        return <CommitteeInsights />
      case 'committee':
        return <CommitteeActivityPage />
      case 'profile':
        return <MemberProfile />
      case 'attendance':
        return <AttendanceTracker />
      case 'reports':
        return <WorkReports />
      case 'leaves':
        return <LeaveApplications />
      default:
        return <CommitteeInsights />
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
     🧩 RENDER GUARD
     ===================================================== */
  if (loading || !user || user.role !== 'committee_head') {
    return null
  }

  /* =====================================================
     UI
     ===================================================== */
  return (
    <div className="min-h-screen w-screen bg-[#1A1A1A] flex overflow-hidden fixed inset-0">
      <Sidebar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userRole="committee_head"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col h-screen">
        <Header
          user={userWithAvatar}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          onProfileClick={() => setActiveTab('profile')}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto bg-[#1A1A1A]">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}