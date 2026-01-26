import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Fingerprint, 
  AlertCircle, 
  CheckCircle, 
  Loader, 
  Search, 
  Plus, 
  LogOut, 
  ArrowLeft, 
  RefreshCw, 
  Users, 
  Wifi, 
  WifiOff 
} from 'lucide-react';

// --- Types ---
interface Member {
  user_id: number;
  council_id: string;
  name: string;
  committee_name: string;
  position: string;
}

interface BiometricAdminPanelProps {
  token: string;
  adminId: string;
  adminName: string;
  onLogout: () => void;
  onNavigateBack: () => void;
}

// Add strict typing for the Electron Bridge
declare global {
  interface Window {
    electronAPI?: {
      biometric: {
        init: () => Promise<any>;
        getStatus: () => Promise<{ connected: boolean; device?: string }>;
        loadEnrolled: (token: string) => Promise<any>;

        capture: (opts: { purpose: string; councilId?: string }) => Promise<{
  success: boolean;
  ansiPath?: string;
  template?: string;
  quality?: number;
  error?: string;
}>;
        readAnsiBase64: (ansiPath: string) => Promise<{
  success: boolean
  ansi_base64?: string
  error?: string
}>;

        match: (scannedInput: any) => Promise<{
          success: boolean;
          matched?: boolean;
          score?: number;
          councilId?: string;
          userId?: string;
          name?: string;
          committee?: string;
          error?: string;
        }>;
      };
    };
  }
}

// --- CSS Styles ---
const styles = `
:root {
  --primary: #5B21B6;
  --primary-dark: #4C1D95;
  --primary-light: #7C3AED;
  --secondary: #0EA5E9;
  --success: #10B981;
  --success-light: #34D399;
  --error: #EF4444;
  --warning: #F59E0B;
  --gray-50: #F9FAFB;
  --gray-100: #F3F4F6;
  --gray-200: #E5E7EB;
  --gray-500: #6B7280;
  --gray-900: #111827;
  --radius: 12px;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

* { box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.biometric-admin-container {
  min-height: 100vh;
  background: var(--gray-50);
}

/* Header */
.admin-header {
  background: white;
  border-bottom: 1px solid var(--gray-200);
  padding: 0;
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: var(--shadow-sm);
}

.header-top-accent {
  height: 4px;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  width: 100%;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand-icon-wrapper {
  background: linear-gradient(135deg, var(--primary-light), var(--primary));
  padding: 10px;
  border-radius: var(--radius);
  color: white;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}

.brand-text h1 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--gray-900);
  margin: 0;
}

.brand-text p {
  font-size: 0.875rem;
  color: var(--gray-500);
  margin: 0;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.admin-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: var(--gray-100);
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--gray-900);
}

.avatar {
  width: 28px;
  height: 28px;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

/* Device Status Bar */
.status-bar {
  background: white;
  border-bottom: 1px solid var(--gray-200);
  padding: 8px 0;
}

.status-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: flex-end;
}

.connection-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.connection-badge.connected {
  background: #ECFDF5;
  color: #059669;
  border: 1px solid #D1FAE5;
}

.connection-badge.disconnected {
  background: #FEF2F2;
  color: #DC2626;
  border: 1px solid #FEE2E2;
}

/* Main Content */
.biometric-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
}

/* Search Area */
.toolbar {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
}

.search-field {
  flex: 1;
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 48px;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s;
}

.search-field:focus-within {
  border-color: var(--primary-light);
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}

.search-field input {
  border: none;
  outline: none;
  width: 100%;
  font-size: 0.95rem;
  color: var(--gray-900);
}

.btn {
  height: 48px;
  padding: 0 20px;
  border-radius: var(--radius);
  font-weight: 600;
  font-size: 0.9rem;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-secondary {
  background: white;
  border: 1px solid var(--gray-200);
  color: var(--gray-900);
  box-shadow: var(--shadow-sm);
}

.btn-secondary:hover { background: var(--gray-50); }

.btn-primary {
  background: var(--primary);
  color: white;
  box-shadow: 0 4px 6px rgba(91, 33, 182, 0.2);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark);
  transform: translateY(-1px);
}

.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid var(--gray-200);
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-500);
  cursor: pointer;
  transition: 0.2s;
}
.btn-icon:hover { background: var(--gray-50); color: var(--gray-900); }
.btn-icon.logout:hover { background: #FEF2F2; color: #DC2626; border-color: #FEE2E2; }

/* Grid */
.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}

.member-card {
  background: white;
  border-radius: var(--radius);
  border: 1px solid var(--gray-200);
  padding: 24px;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.member-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary-light);
}

.card-header-info h3 {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  color: var(--gray-900);
}

.id-badge {
  font-family: monospace;
  background: var(--gray-100);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--gray-500);
}

.card-meta {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}
.meta-label { color: var(--gray-500); }
.meta-value { font-weight: 500; color: var(--gray-900); }

.card-action { margin-top: 24px; }

/* Registration Modal (Replaces View) */
.registration-overlay {
  position: fixed; inset: 0;
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
  animation: fadeIn 0.3s ease;
}

.registration-modal {
  background: white;
  width: 100%; max-width: 480px;
  border-radius: 24px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--gray-200);
  overflow: hidden;
}

.modal-header {
  background: var(--gray-50);
  padding: 20px 32px;
  border-bottom: 1px solid var(--gray-200);
  text-align: center;
}
.modal-header h2 { margin: 0; font-size: 1.25rem; }
.modal-header p { margin: 4px 0 0; color: var(--gray-500); font-size: 0.9rem; }

.modal-body { padding: 32px; }

/* Scanner Visual */
.scanner-visual {
  height: 200px;
  background: linear-gradient(135deg, #F5F3FF, #EFF6FF);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--primary-light);
  margin-bottom: 24px;
  position: relative;
}

.scanner-visual.scanning {
  border-style: solid;
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1);
  animation: pulse-border 2s infinite;
}

.scanner-icon-wrap {
  color: var(--primary);
  transition: 0.3s;
}
.scanning .scanner-icon-wrap { transform: scale(1.1); }

.progress-section { margin-top: 20px; }
.progress-track {
  height: 8px; background: var(--gray-200); border-radius: 4px; overflow: hidden;
}
.progress-fill {
  height: 100%; background: var(--success); transition: width 0.3s ease;
}

.msg-box {
  margin-top: 16px; padding: 12px; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;
}
.msg-box.error { background: #FEF2F2; color: #DC2626; }
.msg-box.success { background: #ECFDF5; color: #059669; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes pulse-border { 0% { border-color: var(--primary-light); } 50% { border-color: var(--secondary); } 100% { border-color: var(--primary-light); } }
`;

export default function BiometricAdminPanel({
  token,
  adminId,
  adminName,
  onLogout,
  onNavigateBack
}: BiometricAdminPanelProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanCount, setScanCount] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<string | null>(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5005';

  // --- Logic ---

  const checkDeviceStatus = useCallback(async () => {
    try {
      const result = await (window as any).electronAPI?.biometric?.getStatus?.();
      // Ensure connected is always a boolean
      setDeviceConnected(result?.connected === true);
    } catch (err) {
      setDeviceConnected(false);
    }
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/admin/all-members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMembers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError('Could not sync member database');
    } finally {
      setLoading(false);
    }
  }, [backendUrl, token]);

  // Initial Load & Polling
  useEffect(() => {
    loadMembers();
    checkDeviceStatus();
    const interval = setInterval(checkDeviceStatus, 3000);
    return () => clearInterval(interval);
  }, [loadMembers, checkDeviceStatus]);

  const filteredMembers = members.filter(member =>
    member.council_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
const handleInitBiometric = async () => {
  try {
    setLoading(true);
    setError("");
    const res = await (window as any).electronAPI?.biometric?.init?.();

    if (!res?.success) {
      setError("Biometric init failed. Please check device + drivers.");
      return;
    }

    setSuccess("✅ Biometric Initialized");
    setTimeout(() => setSuccess(""), 2000);

    await checkDeviceStatus();
  } catch {
    setError("Init failed. Restart application.");
  } finally {
    setLoading(false);
  }
};

  const handleStartRegistration = (member: Member) => {
    if (!deviceConnected) {
      setError('Scanner disconnected. Check USB connection.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setSelectedMember(member);
    setScanCount(0);
    setError('');
    setSuccess('');
    setCurrentTemplate(null);
  };

  const handleScanFingerprint = async () => {
  if (!selectedMember) return;

  try {
    setScanning(true);
    setError("");
    setSuccess("");

    const result = await (window as any).electronAPI?.biometric?.capture?.({
      councilId: selectedMember.council_id,
      purpose: "registration",
    });

    if (!result?.success) {
      setError(result?.error || "Capture failed. Lift finger and try again.");
      return;
    }

    if (!result?.ansiPath) {
      setError("ANSI file not generated. Please re-scan (hardware issue).");
      return;
    }

    // ✅ show scan progress only (we only need ONE scan for ANSI enrollment)
    setSuccess("✅ Fingerprint captured. Saving enrollment...");

    // ✅ save enrollment now
    await handleRegisterBiometric(result.ansiPath);

  } catch (err: any) {
    setError("Hardware communication error.");
  } finally {
    setScanning(false);
  }
};

 const handleRegisterBiometric = async (ansiPath: string) => {
  if (!selectedMember || !ansiPath) return;

  try {
    setScanning(true);
    setError("");
    setSuccess("✅ Fingerprint captured. Saving enrollment...");

    // ✅ 1) Read ANSI file base64 using Electron
    const readRes = await window.electronAPI?.biometric?.readAnsiBase64?.(ansiPath);

    if (!readRes?.success || !readRes?.ansi_base64) {
      setError(readRes?.error || "❌ ANSI file read failed. Please scan again.");
      return;
    }

    const ansi_base64 = readRes.ansi_base64;

    // ✅ 2) Send correct payload to backend
    const res = await axios.post(
      `${backendUrl}/api/biometric/enroll-save`,
      {
        user_id: selectedMember.user_id,
        council_id: selectedMember.council_id,
        name: selectedMember.name,
        committee_name: selectedMember.committee_name,
        ansi_base64,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (res.data?.success !== true) {
      setError(res.data?.error || res.data?.message || "❌ Enrollment failed.");
      return;
    }

    setSuccess(`✅ Success! ${selectedMember.name} enrolled.`);
    setTimeout(() => {
      setSelectedMember(null);
      setSuccess("");
      loadMembers();
    }, 1500);

  } catch (err: any) {
    console.error(err);

    const msg =
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      "❌ Server refused enrollment.";

    setError(msg);
  } finally {
    setScanning(false);
  }
};


  return (
    <>
      <style>{styles}</style>
      <div className="biometric-admin-container">
        
        {/* Header */}
        <header className="admin-header">
          <div className="header-top-accent"></div>
          <div className="header-content">
            <div className="header-brand">
              <div className="brand-icon-wrapper">
                <Fingerprint size={24} />
              </div>
              <div className="brand-text">
                <h1>Biometric Admin</h1>
                <p>Enrollment Station</p>
              </div>
            </div>

            <div className="header-controls">
               <div className="admin-pill">
                 <div className="avatar">{adminName.charAt(0)}</div>
                 <span>{adminName}</span>
               </div>
               <button onClick={onNavigateBack} className="btn-icon" title="Go Back">
                 <ArrowLeft size={20} />
               </button>
               <button onClick={onLogout} className="btn-icon logout" title="Logout">
                 <LogOut size={20} />
               </button>
            </div>
          </div>

          <div className="status-bar">
            <div className="status-container">
               <div className={`connection-badge ${deviceConnected ? 'connected' : 'disconnected'}`}>
                 {deviceConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                 {deviceConnected ? 'Device Online' : 'Device Offline'}
               </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="biometric-content">
          
          {/* Toolbar */}
          <div className="toolbar">
            <div className="search-field">
              <Search size={20} color="#9CA3AF" />
              <input 
                type="text" 
                placeholder="Search Council ID or Name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button onClick={loadMembers} className="btn btn-secondary" disabled={loading}>
              <RefreshCw size={18} />
              Sync Data
            </button>
          </div>

          {/* Members Grid */}
          <div className="members-grid">
            {filteredMembers.length === 0 ? (
               <div className="empty-state">
                 <Users size={48} color="#E5E7EB" />
                 <p style={{ marginTop: 16, color: '#6B7280' }}>No members found in database.</p>
               </div>
            ) : (
              filteredMembers.map(member => (
                <div key={member.council_id} className="member-card">
                  <div className="card-header-info">
                    <span className="id-badge">{member.council_id}</span>
                    <h3>{member.name}</h3>
                  </div>
                  
                  <div className="card-meta">
                    <div className="meta-row">
                      <span className="meta-label">Committee</span>
                      <span className="meta-value">{member.committee_name || '-'}</span>
                    </div>
                    <div className="meta-row">
                      <span className="meta-label">Position</span>
                      <span className="meta-value">{member.position || 'Member'}</span>
                    </div>
                  </div>

                  <div className="card-action">
                    <button 
                      onClick={() => handleStartRegistration(member)}
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center' }}
                      disabled={!deviceConnected}
                    >
                      <Plus size={18} /> Enroll Fingerprint
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Registration Modal Overlay */}
        {selectedMember && (
          <div className="registration-overlay">
            <div className="registration-modal">
              <div className="modal-header">
                <h2>Enrollment Wizard</h2>
                <p>Registering: <strong>{selectedMember.name}</strong></p>
              </div>
              <button onClick={handleInitBiometric} className="btn btn-primary" disabled={loading}>
  <Fingerprint size={18} />
  INIT Device
</button>


              <div className="modal-body">
                <div className={`scanner-visual ${scanning ? 'scanning' : ''}`}>
                  <div className="scanner-icon-wrap">
                    {scanning ? <Loader size={64} /> : <Fingerprint size={64} />}
                  </div>
                  <p style={{ marginTop: 16, color: '#4B5563', fontWeight: 500 }}>
                    {scanning ? 'Capturing...' : 'Ready to Scan'}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>
                    {scanning ? 'Keep finger still' : 'Place finger on sensor'}
                  </p>
                </div>

                <div className="scan-progress">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                    <span>Quality Check</span>
                    <strong>1 Scans</strong>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${(scanCount/1)*100}%` }}></div>
                  </div>
                </div>

                <div className="modal-feedback">
                  {error && <div className="msg-box error"><AlertCircle size={18} /> {error}</div>}
                  {success && <div className="msg-box success"><CheckCircle size={18} /> {success}</div>}
                </div>

                <div className="button-group" style={{ marginTop: 24 }}>
                  <button 
                    onClick={handleScanFingerprint} 
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={scanning || !deviceConnected}
                  >
                     {scanning ? 'Processing...' : (scanCount === 0 ? 'Start Capture' : 'Capture Next')}
                  </button>
                  <button 
                    onClick={() => setSelectedMember(null)} 
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={scanning}
                  >
                    Cancel Enrollment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}