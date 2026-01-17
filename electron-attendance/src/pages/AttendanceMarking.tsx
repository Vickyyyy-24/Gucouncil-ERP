import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Fingerprint, AlertCircle, CheckCircle, Loader, LogOut } from 'lucide-react';
import '../styles/attendance.css';

interface AttendanceRecord {
  id: number;
  councilId: string;
  name: string;
  committee: string;
  status: 'punched_in' | 'punched_out';
  timestamp: string;
}

interface AttendanceMarkingProps {
  token: string;
  adminId: string;
  adminName: string;
  onLogout: () => void;
  onNavigateBack: () => void;
}

export default function AttendanceMarking({
  token,
  adminId,
  adminName,
  onLogout,
  onNavigateBack
}: AttendanceMarkingProps) {
  const [isActive, setIsActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<AttendanceRecord | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5005';

  useEffect(() => {
    checkDeviceStatus();
    loadTodayAttendance();

    // Poll device status every 2 seconds
    const interval = setInterval(checkDeviceStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const checkDeviceStatus = async () => {
    try {
      const result = await (window as any).electronAPI?.biometric?.getStatus?.();
      if (result?.connected) {
        setDeviceConnected(true);
      } else {
        setDeviceConnected(false);
      }
    } catch (err) {
      console.error('Device check error:', err);
      setDeviceConnected(false);
    }
  };

  const loadTodayAttendance = async () => {
    try {
      setLoadingRecords(true);
      const response = await axios.get(`${backendUrl}/api/attendance/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTodayAttendance(response.data || []);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleStartAttendance = () => {
    if (!deviceConnected) {
      setError('Fingerprint device not connected. Please connect the device.');
      return;
    }
    setIsActive(true);
    setSuccess('✅ Attendance system activated!');
    setError('');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleStopAttendance = () => {
    setIsActive(false);
    setSuccess('ℹ️ Attendance system deactivated!');
    setError('');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleScanFingerprint = async () => {
    if (!isActive) {
      setError('Please start the attendance system first');
      return;
    }

    if (!deviceConnected) {
      setError('Fingerprint device not connected');
      await checkDeviceStatus();
      return;
    }

    try {
      setScanning(true);
      setError('');
      setSuccess('');

      // Call Electron IPC to capture and verify fingerprint
      const result = await (window as any).electronAPI?.biometric?.capture?.({
        purpose: 'attendance'
      });

      if (!result?.success) {
        setError(result?.error || 'Failed to capture fingerprint');
        return;
      }

      // Verify biometric with backend
      const verifyResponse = await axios.post(
        `${backendUrl}/api/biometrics/verify`,
        { fingerprintTemplate: result.template },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!verifyResponse.data?.councilId) {
        setError('Fingerprint not recognized. Please register first.');
        return;
      }

      // Mark attendance
      const attendanceResponse = await axios.post(
        `${backendUrl}/api/attendance/punch-in`,
        { fingerprintTemplate: result.template },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const attendance = attendanceResponse.data.attendance;
      setLastScan({
        id: attendance.id,
        councilId: attendance.council_id,
        name: attendance.name || 'Unknown',
        committee: attendance.committee || 'N/A',
        status: attendance.status,
        timestamp: new Date(attendance.punch_in).toLocaleTimeString()
      });

      setSuccess(`✅ ${attendance.name} - ${attendance.status === 'punched_in' ? 'Punch In' : 'Punch Out'} recorded`);
      await loadTodayAttendance();

      // Clear message after 4 seconds
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to mark attendance');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="attendance-marking-container">
      <header className="admin-header">
        <div className="header-content">
          <div className="header-title">
            <Fingerprint className="header-icon" />
            <div>
              <h1>Mark Attendance</h1>
              <p>Biometric attendance recording</p>
            </div>
          </div>
          <div className="header-actions">
            <span>👤 {adminName}</span>
            <button onClick={onNavigateBack} className="btn btn-secondary">
              ← Back
            </button>
            <button onClick={onLogout} className="btn btn-logout">
              🚪 Logout
            </button>
          </div>
        </div>

        {/* Device Status */}
        <div className={`device-status ${deviceConnected ? 'connected' : 'disconnected'}`}>
          <div className="status-indicator"></div>
          <span>{deviceConnected ? '✓ Device Connected' : '✗ Device Disconnected'}</span>
          {!deviceConnected && (
            <button onClick={checkDeviceStatus} className="btn btn-small">
              🔄 Retry
            </button>
          )}
        </div>
      </header>

      <div className="attendance-content">
        {/* Control Panel */}
        <div className="control-panel">
          <div className="system-status">
            <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
              {isActive ? '🟢 SYSTEM ACTIVE' : '🔴 SYSTEM INACTIVE'}
            </span>
          </div>

          <div className="control-buttons">
            {!isActive ? (
              <button
                onClick={handleStartAttendance}
                disabled={!deviceConnected}
                className="btn btn-success btn-large"
              >
                ▶ Start Attendance
              </button>
            ) : (
              <button
                onClick={handleStopAttendance}
                className="btn btn-danger btn-large"
              >
                ⏹ Stop Attendance
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <CheckCircle size={20} />
            <span>{success}</span>
          </div>
        )}

        {/* Fingerprint Scanner */}
        <div className="scanner-section">
          <div 
            className={`fingerprint-scanner ${scanning ? 'scanning' : ''} ${!isActive ? 'inactive' : ''}`}
            onClick={handleScanFingerprint}
          >
            {scanning ? (
              <>
                <div className="scanner-pulse">
                  <Fingerprint size={100} />
                </div>
                <p className="scanner-text">Scanning fingerprint...</p>
                <p className="scanner-subtext">Keep your finger on the sensor</p>
              </>
            ) : (
              <>
                <Fingerprint size={100} />
                <p className="scanner-text">
                  {isActive ? 'Click to scan fingerprint' : 'Start system to scan'}
                </p>
                <p className="scanner-subtext">
                  {isActive ? 'Or press any key' : 'System inactive'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Last Scan Result */}
        {lastScan && (
          <div className="last-scan-card">
            <h3>✅ Last Attendance Record</h3>
            <div className="scan-details">
              <div className="detail-item">
                <span className="label">Council ID:</span>
                <span className="value">{lastScan.councilId}</span>
              </div>
              <div className="detail-item">
                <span className="label">Name:</span>
                <span className="value">{lastScan.name}</span>
              </div>
              <div className="detail-item">
                <span className="label">Committee:</span>
                <span className="value">{lastScan.committee}</span>
              </div>
              <div className="detail-item">
                <span className="label">Status:</span>
                <span className={`value status-${lastScan.status}`}>
                  {lastScan.status === 'punched_in' ? '📍 PUNCH IN' : '🚪 PUNCH OUT'}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Time:</span>
                <span className="value">{lastScan.timestamp}</span>
              </div>
            </div>
          </div>
        )}

        {/* Today's Attendance List */}
        <div className="attendance-list-section">
          <div className="list-header">
            <h3>📋 Today's Attendance Records</h3>
            <button 
              onClick={loadTodayAttendance} 
              className="btn btn-small"
              disabled={loadingRecords}
            >
              🔄 Refresh
            </button>
          </div>

          {loadingRecords ? (
            <div className="loading-state">
              <Loader className="spinner" />
              <p>Loading records...</p>
            </div>
          ) : todayAttendance.length === 0 ? (
            <div className="empty-state">
              <p>No attendance recorded yet today</p>
            </div>
          ) : (
            <div className="attendance-records">
              {todayAttendance.map((record, index) => (
                <div key={index} className="attendance-record">
                  <div className="record-avatar">
                    {record.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="record-info">
                    <p className="record-name">{record.name}</p>
                    <p className="record-meta">
                      {record.councilId} • {record.committee}
                    </p>
                  </div>
                  <div className="record-details">
                    <span className={`status-badge ${record.status}`}>
                      {record.status === 'punched_in' ? '✅ IN' : '🚪 OUT'}
                    </span>
                    <span className="record-time">{record.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}