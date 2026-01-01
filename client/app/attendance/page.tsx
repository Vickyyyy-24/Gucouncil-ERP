'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

interface AttendanceRecord {
  id: number
  councilId: string
  name: string
  committee: string
  timestamp: string
  status: 'punched_in' | 'punched_out'
}

export default function BiometricAttendance() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [isActive, setIsActive] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState<AttendanceRecord | null>(null)
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([])
  const [fingerprintReader, setFingerprintReader] = useState<any>(null)

  useEffect(() => {
    // Check authentication and admin role
    if (!user || user.role !== 'admin') {
      toast.error('Unauthorized access')
      router.push('/login')
      return
    }

    // Initialize fingerprint reader
    initializeFingerprintReader()

    // Load attendance state
    const attendanceActive = localStorage.getItem('attendanceActive')
    if (attendanceActive === 'true') {
      setIsActive(true)
      fetchTodayAttendance()
    }
  }, [user])

  const startAttendance = () => {
    setIsActive(true)
    localStorage.setItem('attendanceActive', 'true')
    toast.success('Attendance system activated!')
  }

  const stopAttendance = () => {
    setIsActive(false)
    localStorage.removeItem('attendanceActive')
    toast.info('Attendance system deactivated!')
  }

  const initializeFingerprintReader = async () => {
    try {
      // Request USB device access
      const device = await navigator.usb.requestDevice({
        filters: [{ vendorId: 0x096e }] // Common fingerprint reader vendor ID, adjust if needed
      });
      
      await device.open();
      setFingerprintReader(device);
      toast.success('Fingerprint reader connected');
    } catch (error) {
      console.error('Failed to initialize fingerprint reader:', error);
      toast.error('Failed to connect fingerprint reader');
    }
  }

  const fetchTodayAttendance = async () => {
    try {
      const response = await fetch('http://localhost:5003/api/attendance/today', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTodayAttendance(data);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      toast.error('Failed to load today\'s attendance');
    }
  }

  const markAttendance = async (fingerprintData: any) => {
    try {
      const response = await fetch('http://localhost:5003/api/attendance/mark', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fingerprintData })
      });

      if (response.ok) {
        const data = await response.json();
        setLastScan(data);
        await fetchTodayAttendance(); // Refresh attendance list
        toast.success(`Attendance marked for ${data.name}`);
      } else {
        throw new Error('Failed to mark attendance');
      }
    } catch (error) {
      console.error('Failed to mark attendance:', error);
      toast.error('Failed to mark attendance');
    }
  }

  const handleFingerprintScan = async () => {
    if (!isActive) {
      toast.error('Please start attendance first');
      return;
    }

    if (!fingerprintReader) {
      toast.error('Fingerprint reader not connected');
      await initializeFingerprintReader();
      return;
    }

    setScanning(true);
    try {
      // Initialize fingerprint capture
      await fingerprintReader.selectConfiguration(1);
      await fingerprintReader.claimInterface(0);

      // Send command to capture fingerprint
      const data = new Uint8Array([0x00, 0x01]); // Example command, adjust based on your reader
      await fingerprintReader.transferOut(1, data);

      // Read fingerprint data
      const result = await fingerprintReader.transferIn(1, 64);
      const fingerprintData = new Uint8Array(result.data.buffer);
      
      // Send fingerprint data to server
      await markAttendance(Array.from(fingerprintData));
    } catch (error) {
      console.error('Failed to scan fingerprint:', error);
      toast.error('Failed to scan fingerprint');
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl"
      >
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-primary-600 to-primary-700 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Biometric Attendance</h1>
            <p className="text-slate-300">Scan your fingerprint to record attendance</p>
            
            {/* Device Status */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className={`w-3 h-3 rounded-full ${fingerprintReader ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-slate-300">
                {fingerprintReader ? 'Reader Connected' : 'Reader Disconnected'}
              </span>
              {!fingerprintReader && (
                <button
                  onClick={initializeFingerprintReader}
                  className="ml-2 text-sm text-primary-500 hover:text-primary-400"
                >
                  Connect Reader
                </button>
              )}
            </div>
          </div>

          {/* Control Panel */}
          <div className="mb-8 p-6 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-center space-x-4">
              {!isActive ? (
                <button
                  onClick={startAttendance}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200"
                >
                  Start Attendance
                </button>
              ) : (
                <button
                  onClick={stopAttendance}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200"
                >
                  Stop Attendance
                </button>
              )}
              
              <div className={`px-4 py-2 rounded-lg ${
                isActive ? 'bg-green-500/20 text-green-300' : 'bg-slate-500/20 text-slate-300'
              }`}>
                {isActive ? 'System Active' : 'System Inactive'}
              </div>
            </div>
          </div>

          {/* Fingerprint Scanner */}
          <div className="mb-8 text-center">
            <div 
              className={`w-48 h-48 mx-auto mb-6 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${
                scanning 
                  ? 'bg-orange-500/20 border-4 border-orange-400 animate-pulse' 
                  : isActive 
                  ? 'bg-white/10 border-4 border-white/30 hover:bg-white/20' 
                  : 'bg-slate-500/20 border-4 border-slate-500/30'
              }`}
              onClick={handleFingerprintScan}
            >
              {scanning ? (
                <svg className="w-24 h-24 text-orange-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              )}
            </div>
            
            <p className="text-slate-300">
              {scanning ? 'Scanning fingerprint...' : 
               isActive ? 'Click to scan your fingerprint' : 
               'Please start attendance first'}
            </p>
          </div>

          {/* Last Scan Result */}
          {lastScan && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="mb-8 p-6 bg-white/10 rounded-lg border border-white/10"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Last Scan Result</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-slate-300 text-sm">Council ID</p>
                  <p className="text-white font-semibold">{lastScan.councilId}</p>
                </div>
                <div>
                  <p className="text-slate-300 text-sm">Name</p>
                  <p className="text-white font-semibold">{lastScan.name}</p>
                </div>
                <div>
                  <p className="text-slate-300 text-sm">Committee</p>
                  <p className="text-white font-semibold">{lastScan.committee}</p>
                </div>
                <div>
                  <p className="text-slate-300 text-sm">Status</p>
                  <p className="text-green-300 font-semibold">{lastScan.status}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Today's Attendance */}
          <div className="bg-white/5 rounded-lg border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Today's Attendance</h3>
            
            {todayAttendance.length === 0 ? (
              <p className="text-slate-400 text-center">No attendance recorded yet today</p>
            ) : (
              <div className="space-y-2">
                {todayAttendance.map((record, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {record.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{record.name}</p>
                        <p className="text-slate-400 text-sm">{record.councilId} • {record.committee}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-green-300 font-medium">{record.status}</p>
                      <p className="text-slate-400 text-sm">{record.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}