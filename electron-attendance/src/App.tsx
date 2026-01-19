import React, { useState, useEffect } from 'react';
import AdminAuthPage from './pages/AdminAuthPage';
import Dashboard from './pages/Dashboard';
import BiometricAdminPanel from './pages/BiometricAdminPanel';
import AttendanceMarking from './pages/AttendanceMarking';

type AppPage = 'auth' | 'dashboard' | 'biometric-admin' | 'attendance-marking' | 'registration' | 'attendance';

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('auth');
  const [token, setToken] = useState('');
  const [adminId, setAdminId] = useState('');
  const [adminName, setAdminName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deviceConnected, setDeviceConnected] = useState(false);

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    checkStoredAuth();
    initializeBiometric();

    // Listen for device connection changes
    const handleDeviceConnected = () => setDeviceConnected(true);
    const handleDeviceDisconnected = () => setDeviceConnected(false);

    (window as any).electronAPI?.onDeviceConnected?.(handleDeviceConnected);
    (window as any).electronAPI?.onDeviceDisconnected?.(handleDeviceDisconnected);

    return () => {
      // Cleanup listeners if needed
    };
  }, []);

  // Check biometric device status
  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const result = await (window as any).electronAPI?.biometric?.getStatus?.();
        console.log('✅ Device Status:', result);
        if (result?.connected) {
          setDeviceConnected(true);
        }
      } catch (err) {
        console.error('❌ Device check error:', err);
        setDeviceConnected(false);
      }
    };

    checkBiometric();
    const interval = setInterval(checkBiometric, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // ============================================
  // HANDLERS
  // ============================================

  const checkStoredAuth = () => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedAdminId = localStorage.getItem('adminId');
      const storedAdminName = localStorage.getItem('adminName');

      if (storedToken && storedAdminId) {
        setToken(storedToken);
        setAdminId(storedAdminId);
        setAdminName(storedAdminName || 'Admin');
        setCurrentPage('dashboard');
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      handleLogout();
    } finally {
      setIsLoading(false);
    }
  };

  const initializeBiometric = async () => {
    try {
      const result = await (window as any).electronAPI?.biometric?.init?.();
      if (result?.success) {
        setDeviceConnected(true);
        console.log('✅ Biometric device initialized:', result.message);
      } else {
        console.warn('⚠️ Biometric init warning:', result?.error);
        setDeviceConnected(false);
      }
    } catch (error) {
      console.error('❌ Failed to initialize biometric:', error);
      setDeviceConnected(false);
    }
  };

  const handleAuthSuccess = (
    newToken: string,
    newAdminId: string,
    newAdminName: string
  ) => {
    try {
      localStorage.setItem('token', newToken);
      localStorage.setItem('adminId', newAdminId);
      localStorage.setItem('adminName', newAdminName);

      setToken(newToken);
      setAdminId(newAdminId);
      setAdminName(newAdminName);
      setCurrentPage('dashboard');
    } catch (error) {
      console.error('Error storing auth data:', error);
      alert('Failed to save login session. Please try again.');
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('adminId');
      localStorage.removeItem('adminName');

      setToken('');
      setAdminId('');
      setAdminName('');
      setCurrentPage('auth');
    } catch (error) {
      console.error('Error during logout:', error);
      setToken('');
      setAdminId('');
      setAdminName('');
      setCurrentPage('auth');
    }
  };

  const handleNavigate = (page: AppPage) => {
    setCurrentPage(page);
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (isLoading) {
    return (
      <div className="app loading-screen">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="app">
      {/* AUTH PAGE */}
      {currentPage === 'auth' && (
        <AdminAuthPage onAuthSuccess={handleAuthSuccess} />
      )}

      {/* DASHBOARD */}
      {currentPage === 'dashboard' && token && adminId && (
        <Dashboard
          token={token}
          adminId={adminId}
          adminName={adminName}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      )}

      {/* BIOMETRIC ADMIN PANEL */}
      {currentPage === 'biometric-admin' && token && adminId && (
        <BiometricAdminPanel
          token={token}
          adminId={adminId}
          adminName={adminName}
          onLogout={handleLogout}
          onNavigateBack={() => setCurrentPage('dashboard')}
        />
      )}

      {/* ATTENDANCE MARKING - CORRECTED */}
      {currentPage === 'attendance-marking' && token && adminId && (
        <AttendanceMarking
          token={token}
          adminName={adminName}
          onLogout={handleLogout}
          onNavigateBack={() => setCurrentPage('dashboard')}
          isPublicKiosk={false}
        />
      )}

      {/* 
        LEGACY OPTIONS (Commented out - uncomment if needed)
        
        Web-based Registration:
        {currentPage === 'registration' && token && adminId && (
          <MemberBiometricRegistration
            token={token}
            adminId={adminId}
            adminName={adminName}
            onLogout={handleLogout}
            onNavigateBack={() => setCurrentPage('dashboard')}
          />
        )}

        Web-based Attendance:
        {currentPage === 'attendance' && token && adminId && (
          <MemberAttendanceMarking
            token={token}
            adminId={adminId}
            adminName={adminName}
            onLogout={handleLogout}
            onNavigateBack={() => setCurrentPage('dashboard')}
          />
        )}
      */}
    </div>
  );
}