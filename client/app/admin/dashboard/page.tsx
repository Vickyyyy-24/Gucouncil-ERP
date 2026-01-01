'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import UserStats from '@/components/admin/UserStats'
import CreateUserCred from '@/components/admin/CreateUserCred'
import CreateUserProfile from '@/components/admin/CreateUserProfile'
import BulkProfileCreation from '@/components/admin/BulkProfileCreation'
import AttendanceManagement from '@/components/admin/AttendanceManagement'
import BiometricRegistration from '@/components/admin/BiometricRegistration'
import LogsManagement from '@/components/admin/LogsManagement'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'create-user-cred', label: 'Create User Credentials', icon: '👥' },
    { id: 'create-profile', label: 'Create User Profile', icon: '👤' },
    { id: 'bulk-profiles', label: 'Bulk Profile Creation', icon: '📋' },
    { id: 'attendance', label: 'Attendance Management', icon: '⏰' },
    { id: 'biometric', label: 'Biometric Registration', icon: '👆' },
    { id: 'logs', label: 'Logs & Reports', icon: '📄' }
  ]

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
      default:
        return <UserStats />
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        tabs={tabs} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        userRole="admin"
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