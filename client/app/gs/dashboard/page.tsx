'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ApiError, apiClient } from '@/lib/api'
import { getSocket } from '@/lib/socket'

import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import UserAttendanceQR from '@/components/common/UserAttendanceQR'

// GS / Member Components
import GSInsights from '@/components/gs/GSInsights'
import GsCommitteeActivity from '@/components/gs/GsCommitteeActivity'
import AttendanceManagement from '@/components/admin/AttendanceManagement'
import MemberProfile from '@/components/member/MemberProfile'
import AttendanceTracker from '@/components/member/AttendanceTracker'
import WorkReports from '@/components/member/WorkReports'
import LeaveApplications from '@/components/member/LeaveApplications'

export default function GsDashboard() {
  const router = useRouter()
  const { user, loading, logout, token } = useAuth()

  const [activeTab, setActiveTab] = useState('insights')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)

  /* =====================================================
     CLIENT FALLBACK GUARD (GS ONLY)
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
     FETCH PROFILE (WITH TOKEN & SOCKET LISTENER)
     ===================================================== */
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // SET TOKEN BEFORE CALLING API
        if (token) {
          apiClient.setToken(token)
        }

        const data = await apiClient.getMyProfile()
        setUserProfile(data)
      } catch (err: any) {
        // GS users might not have profiles - that's OK
        if (err instanceof ApiError && err.status === 404) {
          console.warn('⚠️ GS user profile not found (OK)')
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
  }, [token, logout, router])

  /* =====================================================
     SOCKET LISTENER FOR PROFILE UPDATES
     ===================================================== */
  useEffect(() => {
    try {
      const socket = getSocket()

      if (!socket) {
        console.warn('⛔ GsDashboard: Socket not initialized')
        return
      }

      const handleProfileUpdated = (payload: any) => {
        console.log('📡 Profile updated event received:', payload)
        if (payload?.councilId === user?.councilId) {
          console.log('✅ Refreshing profile for user:', user?.councilId)
          // Re-fetch profile
          if (token) {
            apiClient.setToken(token)
            apiClient
              .getMyProfile()
              .then((data) => setUserProfile(data))
              .catch((err) => console.error('Failed to refresh profile:', err))
          }
        }
      }

      socket.on('profile_updated', handleProfileUpdated)

      return () => {
        socket.off('profile_updated', handleProfileUpdated)
      }
    } catch (error) {
      console.error('❌ Socket listener error:', error)
    }
  }, [user?.councilId, token])

  /* =====================================================
     MERGE AUTH USER + PROFILE
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
      SIDEBAR TABS
     ===================================================== */
  const tabs = [
    { id: 'insights', label: 'All Committees Insights', icon: 'BarChart3' },
    { id: 'committee_activity', label: 'Committee Activity', icon: 'Activity' },
    { id: 'attendance1', label: 'Attendance Analytics', icon: 'Clock' },
    { id: 'profile', label: 'My Profile', icon: 'UserCircle' },
    { id: 'qr', label: 'QR Attendance', icon: 'QrCode' },
    { id: 'attendance', label: 'Attendance', icon: 'Clock' },
    { id: 'reports', label: 'Work Reports', icon: 'FileText' },
    { id: 'leaves', label: 'Apply Leave', icon: 'Calendar' },
  ]

  /* =====================================================
      TAB RENDERER
     ===================================================== */
  const renderContent = () => {
    switch (activeTab) {
      case 'insights':
        return <GSInsights />
      case 'committee_activity':
        return <GsCommitteeActivity />
      case 'attendance1':
        return <AttendanceManagement />
      case 'profile':
        return <MemberProfile />
      case 'qr':
        return <UserAttendanceQR />
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
      LOGOUT HANDLER
     ===================================================== */
  const handleLogout = () => {
    logout()
    router.replace('/login')
  }

  /* =====================================================
      UI
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