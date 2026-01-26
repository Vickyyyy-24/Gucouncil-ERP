import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  UserPlus, 
  Fingerprint, 
  Settings, 
  LogOut, 
  Search, 
  ShieldCheck, 
  Cpu, 
  History, 
  RefreshCw,
  Clock,
  Menu,
  X
} from 'lucide-react';
import '../styles/erp-dashboard.css';

interface DeviceInfo {
  id: string;
  vendorName: string;
  vendorId: string;
  productId: string;
  connected: boolean;
  status: string;
  captureCount: number;
  errorCount: number;
  lastUsed: string | null;
  isActive: boolean;
}

interface DashboardProps {
  token: string;
  adminId: string;
  adminName: string;
  onLogout: () => void;
  onNavigate: (page: 'auth' | 'dashboard' | 'biometric-admin' | 'attendance-marking' | 'attendance-qr' |'registration' | 'attendance') => void;
}

export default function Dashboard({
  adminName,
  onLogout,
  onNavigate
}: DashboardProps) {
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [checkingDevice, setCheckingDevice] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    checkDeviceStatus();
    const statusInterval = setInterval(checkDeviceStatus, 5000);
    return () => {
      clearInterval(timer);
      clearInterval(statusInterval);
    };
  }, []);

  const checkDeviceStatus = async () => {
    try {
      setCheckingDevice(true);
      const result = await (window as any).electronAPI?.biometric?.getStatus?.();
      
      // Extract and set only the necessary values
      const isConnected = result?.connected === true;
      const device = result?.device || null;
      
      setDeviceConnected(isConnected);
      setDeviceInfo(device);
    } catch (error) {
      console.error('Error checking device status:', error);
      setDeviceConnected(false);
      setDeviceInfo(null);
    } finally {
      setCheckingDevice(false);
    }
  };

  return (
    <div className="erp-dashboard">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">
            <ShieldCheck size={20} color="white" />
          </div>
          <div className="logo-text">
            <span className="logo-main">BIO-CORE</span>
            <span className="logo-sub">ERP</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">Main Menu</div>
          <button className="nav-item active">
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </button>
          <button className="nav-item" onClick={() => onNavigate('biometric-admin')}>
            <UserPlus size={18} />
            <span>Enrollment</span>
          </button>
          <button className="nav-item" onClick={() => onNavigate('attendance-marking')}>
            <Fingerprint size={18} />
            <span>Terminal</span>
          </button>
          
          <div className="nav-group">System</div>
          <button className="nav-item">
            <History size={18} />
            <span>Activity Logs</span>
          </button>
          <button className="nav-item">
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button onClick={onLogout} className="btn-logout">
            <LogOut size={16} />
            <span>Logout Session</span>
          </button>
        </div>
      </aside>

      {/* Sidebar Toggle */}
      <button 
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Main Area */}
      <main className="main-content">
        <header className="top-bar">
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search members by ID or name..." 
              className="search-input"
            />
          </div>
          
          <div className="header-right">
            <div className="clock-widget">
              <Clock size={16} />
              <span className="time-display">
                {currentTime.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                })}
              </span>
            </div>
            <div className="user-pill">
              <div className="avatar">{adminName.charAt(0)}</div>
              <span className="admin-name">{adminName}</span>
            </div>
          </div>
        </header>

        <div className="content-container">
          <div className="welcome-section">
            <div className="welcome-text">
              <h1>System Overview</h1>
              <p>Welcome back, {adminName}. Hardware monitoring is active.</p>
            </div>
            <button 
              className={`refresh-btn ${checkingDevice ? 'spinning' : ''}`}
              onClick={checkDeviceStatus}
              title="Synchronize hardware status"
            >
              <RefreshCw size={16} />
              <span>Sync Hardware</span>
            </button>
          </div>

          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Device Status</span>
                <Cpu size={20} className={deviceConnected ? 'icon-green' : 'icon-red'} />
              </div>
              <div className="kpi-body">
                <h2 className={deviceConnected ? 'text-green' : 'text-red'}>
                  {deviceConnected ? 'Connected' : 'Offline'}
                </h2>
                <p>
                  {deviceConnected && deviceInfo 
                    ? deviceInfo.vendorName 
                    : 'No device detected'}
                </p>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">System Load</span>
                <LayoutDashboard size={20} className="icon-blue" />
              </div>
              <div className="kpi-body">
                <h2 className="text-blue">Stable</h2>
                <p>All cloud services reachable</p>
              </div>
            </div>
          </div>

          <h3 className="section-label">Quick Actions</h3>
          <div className="action-grid">
            {/* Action 1 */}
            <div className="action-card primary">
              <div className="action-card-icon blue">
                <UserPlus size={24} />
              </div>
              <div className="action-card-content">
                <h3>Member Enrollment</h3>
                <p>Register new fingerprint templates to the secure database.</p>
                <button 
                  disabled={!deviceConnected}
                  onClick={() => onNavigate('biometric-admin')}
                  className="action-btn"
                  title={!deviceConnected ? 'Device not connected' : 'Start registration'}
                >
                  Start Registration
                </button>
              </div>
            </div>

            {/* Action 2 */}
            <div className="action-card success">
              <div className="action-card-icon green">
                <Fingerprint size={24} />
              </div>
              <div className="action-card-content">
                <h3>Attendance Terminal</h3>
                <p>Launch the high-speed biometric scanning interface.</p>
                <button 
                  disabled={!deviceConnected}
                  onClick={() => onNavigate('attendance-marking')}
                  className="action-btn"
                  title={!deviceConnected ? 'Device not connected' : 'Open terminal'}
                >
                  Open Terminal
                </button>
              </div>
            </div>
          </div>

          {/* Legacy Toggle Section */}
          <div className="legacy-footer">
            <div className="legacy-info">
              <h4>Legacy WebUSB Options</h4>
              <p>Only use these if the native Electron bridge is failing.</p>
            </div>
            <div className="legacy-actions">
              <button 
                className="legacy-btn"
                onClick={() => onNavigate('attendance')}
              >
                Web Register
              </button>
              <button 
                className="legacy-btn"
                onClick={() => onNavigate('attendance-qr')}
              >
                Web Mark
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}