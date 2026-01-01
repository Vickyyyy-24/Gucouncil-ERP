'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import MemberProfile from '@/components/member/MemberProfile'
import AttendanceTracker from '@/components/member/AttendanceTracker'
import WorkReports from '@/components/member/WorkReports'
import LeaveApplications from '@/components/member/LeaveApplications'

export default function MemberDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: '👤' },
    { id: 'attendance', label: 'Attendance', icon: '⏰' },
    { id: 'reports', label: 'Work Reports', icon: '📄' },
    { id: 'leaves', label: 'Apply Leave', icon: '📅' }
  ]

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

  return (
    <div className="min-h-screen z-50 bg-slate-50 flex">
      <Sidebar 
        tabs={tabs} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        userRole="committee_member"
      />
      
      <div className="flex-1 flex flex-col">
        <Header user={user} />
        
        <main className="flex-1  p-6">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}