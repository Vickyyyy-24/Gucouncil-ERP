const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const crypto = require('crypto');

let mainWindow;
let biometricDevice = null;
let isDeviceConnected = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
    },
  });

  const PORT = process.env.PORT || 5050;
  const startUrl = isDev
    ? `http://localhost:${PORT}`
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (biometricDevice) {
      closeBiometricDevice();
    }
  });
}

app.on('ready', () => {
  createWindow();
  initializeBiometricService();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// ============================================
// BIOMETRIC SERVICE - CORE IPC HANDLERS
// ============================================

function initializeBiometricService() {
  // Initialize biometric device
  ipcMain.handle('biometric:init', async (event) => {
    try {
      return await initializeBiometricDevice();
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to initialize device',
      };
    }
  });

  // Get device status
  ipcMain.handle('biometric:getStatus', async (event) => {
    return {
      connected: isDeviceConnected,
      device: biometricDevice ? 'Fingerprint Reader' : 'None',
      message: isDeviceConnected ? 'Device ready' : 'Device not connected',
    };
  });

  // Capture fingerprint - Main function
  ipcMain.handle('biometric:capture', async (event, options = {}) => {
    try {
      if (!isDeviceConnected) {
        return {
          success: false,
          error: 'Device not connected',
        };
      }

      return await captureFingerprint(options);
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to capture fingerprint',
      };
    }
  });

  // List available biometric devices
  ipcMain.handle('biometric:listDevices', async (event) => {
    try {
      return await listBiometricDevices();
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to list devices',
      };
    }
  });

  // Connect to specific device
  ipcMain.handle('biometric:connectDevice', async (event, deviceId) => {
    try {
      return await connectToBiometricDevice(deviceId);
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to connect to device',
      };
    }
  });

  // Disconnect device
  ipcMain.handle('biometric:disconnect', async (event) => {
    try {
      closeBiometricDevice();
      isDeviceConnected = false;
      return {
        success: true,
        message: 'Device disconnected',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // Test device connection
  ipcMain.handle('biometric:test', async (event) => {
    try {
      if (!isDeviceConnected) {
        return {
          success: false,
          error: 'Device not connected',
        };
      }

      // Simple test - generate a mock fingerprint
      const template = generateMockFingerprintTemplate();
      return {
        success: true,
        message: 'Device test successful',
        template,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Device test failed',
      };
    }
  });
}

// ============================================
// BIOMETRIC DEVICE FUNCTIONS
// ============================================

async function initializeBiometricDevice() {
  try {
    // In production, use 'usb' or 'serialport' library
    // For now, simulating device initialization
    
    // You would implement:
    // const usb = require('usb');
    // const devices = usb.getDeviceList();
    // const fingerprintReader = devices.find(d => 
    //   d.deviceDescriptor.idVendor === 0x096e // ZKTeco
    // );

    // Simulate device connection
    biometricDevice = {
      id: 'mock-device-001',
      name: 'USB Fingerprint Reader',
      vendor: 'ZKTeco',
      connected: true,
    };

    isDeviceConnected = true;

    return {
      success: true,
      message: 'Biometric device initialized successfully',
      device: biometricDevice.name,
    };
  } catch (error) {
    isDeviceConnected = false;
    return {
      success: false,
      error: error.message || 'Failed to initialize biometric device',
    };
  }
}

async function listBiometricDevices() {
  try {
    // In production, enumerate actual USB devices
    const devices = [
      {
        id: 'device-001',
        name: 'USB Fingerprint Reader',
        vendor: 'ZKTeco',
        vendorId: '0x096e',
      },
    ];

    return {
      success: true,
      devices,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to list devices',
    };
  }
}

async function connectToBiometricDevice(deviceId) {
  try {
    // In production, open connection to specific device
    biometricDevice = {
      id: deviceId,
      name: 'USB Fingerprint Reader',
      vendor: 'ZKTeco',
      connected: true,
    };

    isDeviceConnected = true;

    return {
      success: true,
      message: `Connected to ${biometricDevice.name}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to connect to device',
    };
  }
}

async function captureFingerprint(options = {}) {
  try {
    if (!isDeviceConnected || !biometricDevice) {
      return {
        success: false,
        error: 'Device not connected',
      };
    }

    // In production:
    // 1. Send capture command to device
    // 2. Wait for fingerprint data
    // 3. Process template
    // 4. Return template and metadata

    const template = generateMockFingerprintTemplate();
    const hash = crypto.createHash('sha256').update(template).digest('hex');

    return {
      success: true,
      template,
      hash,
      quality: Math.round(Math.random() * 100 + 50), // Mock quality score 50-150
      message: 'Fingerprint captured successfully',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to capture fingerprint',
    };
  }
}

function closeBiometricDevice() {
  try {
    if (biometricDevice) {
      // In production: biometricDevice.close();
      biometricDevice = null;
      isDeviceConnected = false;
    }
  } catch (error) {
    console.error('Error closing biometric device:', error);
  }
}

function generateMockFingerprintTemplate() {
  // Generate a mock fingerprint template (in production, from device)
  // Real templates are binary data from fingerprint scanner
  return crypto.randomBytes(512).toString('base64');
}

// ============================================
// UTILITY IPC HANDLERS
// ============================================

ipcMain.handle('app:version', () => {
  return app.getVersion();
});

ipcMain.handle('app:getEnv', () => {
  return {
    isDev,
    backendUrl: process.env.REACT_APP_BACKEND_URL || 'http://localhost:5005',
  };
});

// ============================================
// ERROR HANDLING
// ============================================

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (mainWindow) {
    mainWindow.webContents.send('error:fatal', {
      message: 'An unexpected error occurred',
      error: error.message,
    });
  }
});