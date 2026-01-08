'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/contexts/AuthContext'

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

  /* =====================================================
     🔐 CLIENT FALLBACK GUARD (COMMITTEE HEAD ONLY)
     ===================================================== */
  useEffect(() => {
    if (loading) return

    // ❌ Not logged in
    if (!user) {
      router.replace('/login')
      return
    }

    // ❌ Wrong role
    if (user.role !== 'committee_head') {
      logout()
      router.replace('/login')
    }
  }, [user, loading, logout, router])

  // Do not return early here; we'll block render after all hooks to keep hook order stable

  /* =====================================================
     👤 FETCH PROFILE (COOKIE / AUTH HEADER)
     ===================================================== */
  useEffect(() => {
    let socket: Socket | null = null

    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const res = await fetch(`${API_URL}/api/profiles/my-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setUserProfile(data)
        } else {
          console.error('Failed fetching profile, status:', res.status)
        }
      } catch (err) {
        console.error('Profile fetch failed:', err)
      }
    }

    fetchUserProfile()

    socket = io(API_URL, {
      transports: ['websocket'],
      auth: { token: localStorage.getItem('token') || null }
    })

    socket.on('profile_updated', (payload) => {
      if (payload?.councilId === user.councilId) {
        fetchUserProfile()
      }
    })

    return () => {
      if (socket) socket.disconnect()
    }
  }, [user])

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
     🧭 TAB RENDERER
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
     🧩 UI
     ===================================================== */
  // Final render guard to prevent UI flash; placed after all hooks so hook order is stable
  if (loading || !user || user.role !== 'committee_head') {
    return null
  }

  return (
    <div className="min-h-screen w-screen bg-[#1A1A1A] flex overflow-hidden fixed inset-0">
      {/* SIDEBAR */}
      <Sidebar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userRole="committee_head"
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
