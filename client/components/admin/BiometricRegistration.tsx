'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { useAuth } from '@/contexts/AuthContext'

interface BiometricRecord {
  id: number;
  councilId: string;
  name: string;
  registeredAt: string;
  fingerprintTemplate: string;
}

interface UserDetails {
  name: string;
  committee: string;
  role: string;
}

export default function BiometricRegistration() {
  const { token } = useAuth()
  const [councilId, setCouncilId] = useState('')
  const [scanning, setScanning] = useState(false)
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
  const [registeredBiometrics, setRegisteredBiometrics] = useState<BiometricRecord[]>([])
  const [fingerprintReader, setFingerprintReader] = useState<any>(null)
  const [fingerprintTemplate, setFingerprintTemplate] = useState<string | null>(null)
  const [initializingReader, setInitializingReader] = useState(false)

  useEffect(() => {
    fetchRegisteredBiometrics()
  }, [])

  const fetchRegisteredBiometrics = async () => {
    try {
      const response = await fetch('http://localhost:5003/api/biometrics/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRegisteredBiometrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch biometrics:', error);
      toast.error('Failed to load registered biometrics');
    }
  };

  const initializeFingerprintReader = async () => {
    setInitializingReader(true);
    try {
      const device = await navigator.usb.requestDevice({
        filters: [{ vendorId: 0x096e }] // Common fingerprint reader vendor ID
      });
      
      await device.open();
      await device.selectConfiguration(1);
      await device.claimInterface(0);
      
      setFingerprintReader(device);
      toast.success('Fingerprint reader connected');
    } catch (error) {
      console.error('Failed to initialize fingerprint reader:', error);
      toast.error('Failed to connect fingerprint reader');
    } finally {
      setInitializingReader(false);
    }
  };

  const fetchUserDetails = async (councilId: string) => {
    try {
      const response = await fetch(`http://localhost:5003/api/users/${councilId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserDetails(data);
        return true;
      } else {
        toast.error('User not found');
        setUserDetails(null);
        return false;
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      toast.error('Failed to fetch user details');
      setUserDetails(null);
      return false;
    }
  };

  const captureFingerprintTemplate = async () => {
    if (!fingerprintReader) {
      toast.error('Fingerprint reader not connected');
      return null;
    }

    try {
      // Send command to capture fingerprint
      const captureCommand = new Uint8Array([0x00, 0x01]); // Example command - adjust for your reader
      await fingerprintReader.transferOut(1, captureCommand);

      // Read fingerprint data
      const result = await fingerprintReader.transferIn(1, 64);
      const rawTemplate = new Uint8Array(result.data.buffer);
      
      // Convert to base64 for storage
      return btoa(String.fromCharCode.apply(null, Array.from(rawTemplate)));
    } catch (error) {
      console.error('Failed to capture fingerprint:', error);
      toast.error('Failed to capture fingerprint');
      return null;
    }
  };

  const handleScan = async () => {
    if (!councilId) {
      toast.error('Please enter Council ID');
      return;
    }

    if (!fingerprintReader) {
      await initializeFingerprintReader();
      return;
    }

    setScanning(true);
    try {
      const template = await captureFingerprintTemplate();
      if (template) {
        setFingerprintTemplate(template);
        toast.success('Fingerprint scanned successfully!');
      }
    } finally {
      setScanning(false);
    }
  };

  const handleRegister = async () => {
    if (!councilId) {
      toast.error('Please enter Council ID');
      return;
    }

    if (!fingerprintTemplate) {
      toast.error('Please scan fingerprint first');
      return;
    }

    try {
      // First verify if user exists and get their details
      const userExists = await fetchUserDetails(councilId);
      if (!userExists) return;

      // Register the biometric
      const response = await fetch('http://localhost:5003/api/biometrics/register', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          councilId,
          fingerprintTemplate,
          name: userDetails?.name
        })
      });

      if (response.ok) {
        toast.success('Biometric registered successfully!');
        setCouncilId('');
        setFingerprintTemplate(null);
        setUserDetails(null);
        await fetchRegisteredBiometrics();
      } else {
        throw new Error('Failed to register biometric');
      }
    } catch (error) {
      console.error('Failed to register biometric:', error);
      toast.error('Failed to register biometric');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:5003/api/biometrics/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setRegisteredBiometrics(registeredBiometrics.filter(b => b.id !== id));
        toast.success('Biometric registration deleted');
      } else {
        throw new Error('Failed to delete biometric registration');
      }
    } catch (error) {
      console.error('Failed to delete biometric:', error);
      toast.error('Failed to delete biometric registration');
    }
    toast.success('Biometric registration deleted!')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Biometric Registration</h2>
        
        {/* Device Status */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${fingerprintReader ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-slate-600">
                {fingerprintReader ? 'Reader Connected' : 'Reader Disconnected'}
              </span>
            </div>
            {!fingerprintReader && (
              <button
                onClick={initializeFingerprintReader}
                disabled={initializingReader}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium disabled:opacity-50"
              >
                {initializingReader ? 'Connecting...' : 'Connect Reader'}
              </button>
            )}
          </div>
        </div>

        {/* Registration Form */}
        <div className="mb-8 p-6 bg-slate-50 rounded-lg">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Register New Biometric</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Council ID
              </label>
              <input
                type="text"
                value={councilId}
                onChange={(e) => {
                  setCouncilId(e.target.value);
                  if (e.target.value) fetchUserDetails(e.target.value);
                }}
                placeholder="Enter Council ID"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* User Details */}
            {userDetails && (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <h4 className="text-sm font-medium text-slate-700 mb-2">User Details</h4>
                <div className="space-y-1">
                  <p className="text-sm text-slate-600">Name: {userDetails.name}</p>
                  <p className="text-sm text-slate-600">Committee: {userDetails.committee}</p>
                  <p className="text-sm text-slate-600">Role: {userDetails.role}</p>
                </div>
              </div>
            )}

            {/* Fingerprint Status */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${fingerprintTemplate ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-sm text-slate-600">
                    {fingerprintTemplate ? 'Fingerprint Captured' : 'Waiting for Scan'}
                  </span>
                </div>
                <button
                  onClick={handleScan}
                  disabled={scanning || !councilId || !fingerprintReader}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {scanning ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Scanning...
                    </div>
                  ) : (
                    'Scan Fingerprint'
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                onClick={handleRegister}
                disabled={scanning || !councilId || !fingerprintTemplate || !userDetails}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Register Biometric
              </button>
            </div>
          </div>
        </div>

        {/* Existing Registrations */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Registered Biometrics</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Council ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Registered Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {registeredBiometrics.map((biometric) => (
                  <tr key={biometric.id}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {biometric.councilId}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                      {biometric.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                      {biometric.registeredAt}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                      <button
                        onClick={() => handleDelete(biometric.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  )
}