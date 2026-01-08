'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/contexts/AuthContext'
import { ApiError, apiClient } from '@/lib/api'

import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

// GS / Member Components
import GSInsights from '@/components/gs/GSInsights'
import AttendanceManagement from '@/components/admin/AttendanceManagement'
import MemberProfile from '@/components/member/MemberProfile'
import AttendanceTracker from '@/components/member/AttendanceTracker'
import WorkReports from '@/components/member/WorkReports'
import LeaveApplications from '@/components/member/LeaveApplications'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005'

export default function GsDashboard() {
  const router = useRouter()
  const { user, loading, logout, token } = useAuth()

  const [activeTab, setActiveTab] = useState('insights')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)

  /* =====================================================
     🔐 CLIENT FALLBACK GUARD (GS ONLY)
     ===================================================== */
  useEffect(() => {
    if (loading) return

    // ❌ Not logged in
    if (!user) {
      router.replace('/login')
      return
    }

    // ❌ Wrong role
    if (user.role !== 'gs') {
      logout()
      router.replace('/login')
    }
  }, [user, loading, logout, router])

  /* =====================================================
     👤 FETCH PROFILE (WITH TOKEN)
     ===================================================== */
  useEffect(() => {
    let socket: Socket | null = null

    const fetchUserProfile = async () => {
      try {
        // ✅ SET TOKEN BEFORE CALLING API
        if (token) {
          apiClient.setToken(token)
        }

        const data = await apiClient.getMyProfile()
        setUserProfile(data)
      } catch (err: any) {
        // GS users might not have profiles - that's OK
        if (err instanceof ApiError && err.status === 404) {
          console.warn('ℹ️ GS user profile not found (OK)')
          setUserProfile(null)
          return
        }

        // Auth errors
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          console.error('❌ Auth error:', err.message)
          logout()
          router.replace('/login')
          return
        }

        // Other errors
        console.error('❌ Profile fetch failed:', err)
        setUserProfile(null)
      }
    }

    // Only fetch if token is available
    if (token) {
      fetchUserProfile()
    }

    // Setup socket connection
    if (token) {
      socket = io(API_URL, {
        transports: ['websocket'],
        auth: {
          token: token
        }
      })

      socket.on('profile_updated', (payload) => {
        if (payload?.councilId === user?.councilId) {
          fetchUserProfile()
        }
      })
    }

    return () => {
      if (socket) socket.disconnect()
    }
  }, [token, user?.councilId, logout, router])

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
    { id: 'insights', label: 'All Committees Insights', icon: 'BarChart3' },
    { id: 'attendance1', label: 'Attendance Analytics', icon: 'Clock' },
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
      case 'insights':
        return <GSInsights />
      case 'attendance1':
        return <AttendanceManagement />
      case 'profile':
        return <MemberProfile />
      case 'attendance':
        return <AttendanceTracker />
      case 'reports':
        return <WorkReports />
      case 'leaves':
        return <LeaveApplications />
      default:
        return <GSInsights />
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
     🧩 UI
     ===================================================== */
  if (loading || !user || user.role !== 'gs') {
    return null
  }

  return (
    <div className="min-h-screen w-screen bg-[#1A1A1A] flex overflow-hidden fixed inset-0">
      {/* SIDEBAR */}
      <Sidebar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userRole="gs"
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
        <main className="flex-1 overflow-y-auto bg-white">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}