'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'

export default function GSInsights() {
  const [insights, setInsights] = useState<any>(null)
  const [allCommittees, setAllCommittees] = useState<any[]>([])
  const [pendingForGS, setPendingForGS] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGSInsights()
    fetchPendingApprovals()
  }, [])

  const fetchGSInsights = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/gs/all-committees-insights', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setInsights(data)
        
        // Convert object to array for easier rendering
        const committeeArray = Object.entries(data).map(([name, stats]: [string, any]) => ({
          name,
          ...stats
        }))
        setAllCommittees(committeeArray)
      }
    } catch (error) {
      toast.error('Failed to fetch GS insights')
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingApprovals = async () => {
    // Mock pending approvals for GS
    setPendingForGS([
      {
        id: 1,
        committee: 'Technical',
        councilId: 'TECH002',
        name: 'Jane Smith',
        title: 'Sick Leave',
        leaveFrom: '2024-01-20',
        leaveTo: '2024-01-21',
        reason: 'Feeling unwell',
        headApprovedAt: '2024-01-18 11:30:00',
        appliedAt: '2024-01-18 10:00:00'
      },
      {
        id: 2,
        committee: 'Cultural',
        councilId: 'CULT003',
        name: 'Mike Wilson',
        title: 'Personal Leave',
        leaveFrom: '2024-01-25',
        leaveTo: '2024-01-26',
        reason: 'Family function',
        headApprovedAt: '2024-01-19 09:15:00',
        appliedAt: '2024-01-19 08:30:00'
      }
    ])
  }

  const approveLeave = async (leaveId: number) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/gs/approve-leave/${leaveId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Leave approved successfully!')
        fetchPendingApprovals()
      } else {
        toast.error(data.message || 'Failed to approve leave')
      }
    } catch (error) {
      toast.error('Server error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">All Committees Insights</h2>
        
        {/* Committee Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {allCommittees.map((committee, index) => (
            <div key={index} className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">{committee.name}</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total Members:</span>
                  <span className="font-semibold text-slate-900">{committee.totalMembers}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Pending Leaves:</span>
                  <span className="font-semibold text-orange-600">{committee.pendingLeaves}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Pending Head Approval:</span>
                  <span className="font-semibold text-yellow-600">{committee.pendingHeadApproval}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Attendance Rate:</span>
                  <span className="font-semibold text-green-600">{committee.attendanceRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pending GS Approvals */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-slate-800 mb-4">Pending GS Approvals</h3>
          
          {pendingForGS.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-lg">
              <p className="text-slate-600">No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingForGS.map((leave) => (
                <div key={leave.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-slate-900">{leave.title}</h4>
                      <p className="text-sm text-slate-600">
                        {leave.name} ({leave.councilId}) - {leave.committee} Committee
                      </p>
                      <p className="text-sm text-slate-600">
                        {new Date(leave.leaveFrom).toLocaleDateString()} - {new Date(leave.leaveTo).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-slate-500">
                        Head Approved: {new Date(leave.headApprovedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      Approved by Head
                    </span>
                  </div>
                  
                  <p className="text-slate-700 mb-4">{leave.reason}</p>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => approveLeave(leave.id)}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Approve
                    </button>
                    <button
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overall Statistics */}
        <div>
          <h3 className="text-xl font-semibold text-slate-800 mb-4">Overall Statistics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {allCommittees.reduce((sum, c) => sum + c.totalMembers, 0)}
              </p>
              <p className="text-sm text-slate-600">Total Members</p>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {allCommittees.reduce((sum, c) => sum + c.pendingLeaves, 0)}
              </p>
              <p className="text-sm text-slate-600">Total Pending Leaves</p>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {allCommittees.reduce((sum, c) => sum + c.pendingHeadApproval, 0)}
              </p>
              <p className="text-sm text-slate-600">Pending Head Approval</p>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {Math.round(allCommittees.reduce((sum, c) => sum + c.attendanceRate, 0) / allCommittees.length)}%
              </p>
              <p className="text-sm text-slate-600">Average Attendance</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}