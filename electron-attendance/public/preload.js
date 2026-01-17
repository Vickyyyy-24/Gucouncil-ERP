const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC methods to React frontend
contextBridge.exposeInMainWorld('electronAPI', {
  // Biometric functions
  biometric: {
    // Initialize biometric service
    init: () => ipcRenderer.invoke('biometric:init'),

    // Get device status
    getStatus: () => ipcRenderer.invoke('biometric:getStatus'),

    // Capture fingerprint
    capture: (options) => ipcRenderer.invoke('biometric:capture', options),

    // List available devices
    listDevices: () => ipcRenderer.invoke('biometric:listDevices'),

    // Connect to specific device
    connectDevice: (deviceId) => ipcRenderer.invoke('biometric:connectDevice', deviceId),

    // Disconnect device
    disconnect: () => ipcRenderer.invoke('biometric:disconnect'),

    // Test device
    test: () => ipcRenderer.invoke('biometric:test'),
  },

  // App utilities
  app: {
    getVersion: () => ipcRenderer.invoke('app:version'),
    getEnv: () => ipcRenderer.invoke('app:getEnv'),
  },

  // Error listeners
  onError: (callback) => {
    ipcRenderer.on('error:fatal', (event, data) => callback(data));
  },

  // Device connection listener
  onDeviceConnected: (callback) => {
    ipcRenderer.on('device:connected', (event) => callback());
  },

  onDeviceDisconnected: (callback) => {
    ipcRenderer.on('device:disconnected', (event) => callback());
  },
});