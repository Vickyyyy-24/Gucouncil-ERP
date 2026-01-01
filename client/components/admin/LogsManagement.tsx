'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'

export default function LogsManagement() {
  const [activeLogTab, setActiveLogTab] = useState('attendance')

  const logTypes = [
    { id: 'attendance', label: 'Attendance Logs', icon: '⏰' },
    { id: 'reports', label: 'Report Logs', icon: '📄' },
    { id: 'leaves', label: 'Leave Application Logs', icon: '📅' },
    { id: 'login', label: 'Login Logs', icon: '🔐' }
  ]

  const mockLogs = {
    attendance: [
      { id: 1, user: 'TECH001', action: 'Punch In', timestamp: '2024-01-15 09:00:00', details: 'Biometric scan successful' },
      { id: 2, user: 'TECH001', action: 'Punch Out', timestamp: '2024-01-15 17:30:00', details: 'Total hours: 8.5' },
      { id: 3, user: 'CULT001', action: 'Punch In', timestamp: '2024-01-15 09:15:00', details: 'Biometric scan successful' }
    ],
    reports: [
      { id: 1, user: 'TECH001', action: 'Report Submitted', timestamp: '2024-01-15 16:00:00', details: 'Weekly progress report' },
      { id: 2, user: 'CULT001', action: 'Report Approved', timestamp: '2024-01-15 14:30:00', details: 'Approved by committee head' }
    ],
    leaves: [
      { id: 1, user: 'TECH002', action: 'Leave Applied', timestamp: '2024-01-14 10:00:00', details: 'Sick leave for 2 days' },
      { id: 2, user: 'TECH002', action: 'Leave Approved by Head', timestamp: '2024-01-14 11:30:00', details: 'Waiting for GS approval' }
    ],
    login: [
      { id: 1, user: 'ADMIN', action: 'Login', timestamp: '2024-01-15 08:00:00', details: 'Successful login from 192.168.1.1' },
      { id: 2, user: 'TECH001', action: 'Login', timestamp: '2024-01-15 08:45:00', details: 'Successful login from 192.168.1.2' }
    ]
  }

  const downloadPDF = (logType: string) => {
    // Simulate PDF download
    alert(`Downloading ${logType} logs PDF report...`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Logs & Reports</h2>
        
        {/* Log Type Tabs */}
        <div className="mb-6 border-b border-slate-200">
          <nav className="-mb-px flex space-x-8">
            {logTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setActiveLogTab(type.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeLogTab === type.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="mr-2">{type.icon}</span>
                {type.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Download Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => downloadPDF(activeLogTab)}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {mockLogs[activeLogTab as keyof typeof mockLogs].map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {log.user}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                    {log.action}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                    {log.timestamp}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">
              {mockLogs[activeLogTab as keyof typeof mockLogs].length}
            </p>
            <p className="text-sm text-slate-600">Total Entries</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">24</p>
            <p className="text-sm text-slate-600">Today</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">168</p>
            <p className="text-sm text-slate-600">This Week</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">672</p>
            <p className="text-sm text-slate-600">This Month</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}