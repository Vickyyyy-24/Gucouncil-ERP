'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import MemberProfile from '@/components/member/MemberProfile'
import AttendanceTracker from '@/components/member/AttendanceTracker'
import WorkReports from '@/components/member/WorkReports'
import LeaveApplications from '@/components/member/LeaveApplications'
import GSInsights from '@/components/gs/GSInsights'

export default function GSDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('insights')

  const tabs = [
    { id: 'insights', label: 'All Committees Insights', icon: '📊' },
    { id: 'profile', label: 'My Profile', icon: '👤' },
    { id: 'attendance', label: 'Attendance', icon: '⏰' },
    { id: 'reports', label: 'Work Reports', icon: '📄' },
    { id: 'leaves', label: 'Apply Leave', icon: '📅' }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'insights':
        return <GSInsights />
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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        tabs={tabs} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        userRole="gs"
      />
      
      <div className="flex-1 flex flex-col">
        <Header user={user} />
        
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}