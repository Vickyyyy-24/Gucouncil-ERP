'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'

export default function AttendanceManagement() {
  const [selectedCommittee, setSelectedCommittee] = useState('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const committees = ['All Committees', 'Technical', 'Cultural', 'Sports', 'Literary', 'Social']
  
  const mockAttendanceData = [
    {
      committee: 'Technical',
      head: 'Alice Johnson',
      members: [
        { name: 'Bob Smith', attendance: 15, totalHours: 120, weeklyAvg: 8.5, dailyAvg: 1.2 },
        { name: 'Carol Davis', attendance: 18, totalHours: 145, weeklyAvg: 9.2, dailyAvg: 1.3 },
        { name: 'David Wilson', attendance: 12, totalHours: 98, weeklyAvg: 7.8, dailyAvg: 1.1 }
      ]
    },
    {
      committee: 'Cultural',
      head: 'Emma Brown',
      members: [
        { name: 'Frank Miller', attendance: 20, totalHours: 165, weeklyAvg: 10.2, dailyAvg: 1.5 },
        { name: 'Grace Lee', attendance: 17, totalHours: 138, weeklyAvg: 8.9, dailyAvg: 1.3 }
      ]
    }
  ]

  const generateReport = () => {
    // Simulate PDF generation
    alert('PDF report generated and downloaded!')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Attendance Management</h2>
        
        {/* Filters */}
        <div className="mb-6 p-4 bg-slate-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Committee
              </label>
              <select
                value={selectedCommittee}
                onChange={(e) => setSelectedCommittee(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {committees.map(committee => (
                  <option key={committee} value={committee.toLowerCase()}>
                    {committee}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={generateReport}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>

        {/* Attendance Data */}
        <div className="space-y-6">
          {mockAttendanceData.map((committeeData, index) => (
            <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">
                    {committeeData.committee} Committee
                  </h3>
                  <p className="text-sm text-slate-600">
                    Head: {committeeData.head}
                  </p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Total Attendance
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Total Hours
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Weekly Avg
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Daily Avg
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {committeeData.members.map((member, memberIndex) => (
                      <tr key={memberIndex}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {member.name}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                          {member.attendance} days
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                          {member.totalHours} hours
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                          {member.weeklyAvg} hours
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                          {member.dailyAvg} hours
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}