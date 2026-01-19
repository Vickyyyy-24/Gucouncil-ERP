// ============================================
// FILE: public/preload.js
// ✅ FINAL FIXED: identify + register + loadEnrolled + match
// ✅ Exposes electronAPI ONLY ONCE ✅
// ============================================

const { contextBridge, ipcRenderer } = require("electron");

// ============================================
// CHANNEL VALIDATION
// ============================================

function validateChannel() {
  const allowedChannels = {
    invoke: [
      // ✅ EXISTING
      "biometric:init",
      "biometric:getStatus",
      "biometric:listDevices",
      "biometric:setActiveDevice",
      "biometric:capture",
      "biometric:test",
      "biometric:getCachedTemplate",
      "biometric:getStats",
      "biometric:disconnect",

      // ✅ NEW FOR MATCHING SYSTEM
      "biometric:loadEnrolled",
      "biometric:match",

      // ✅ OPTIONAL ADVANCED
      "biometric:identify",
      "biometric:register",

      // ✅ APP
      "app:version",
      "app:getEnv",
      "app:getLogs",
      "app:openDevTools",
    ],
    on: [
      "biometric:device-attached",
      "biometric:device-detached",
      "biometric:device-reconnected",
      "biometric:device-reconnection-failed",
      "error:fatal",
      "error:unhandled-rejection",
    ],
    once: ["biometric:initialized", "biometric:capture-complete"],
  };

  return { allowedChannels };
}

// ============================================
// SAFE IPC HELPERS
// ============================================

async function safeInvoke(channel, ...args) {
  if (!channel || typeof channel !== "string") {
    throw new Error("Invalid channel name");
  }

  const { allowedChannels } = validateChannel();

  if (!allowedChannels.invoke.includes(channel)) {
    throw new Error(`Blocked IPC channel: ${channel}`);
  }

  return await ipcRenderer.invoke(channel, ...args);
}

function safeOn(channel, callback) {
  if (!channel || typeof channel !== "string") return () => {};
  if (typeof callback !== "function") return () => {};

  const { allowedChannels } = validateChannel();

  if (!allowedChannels.on.includes(channel)) {
    console.error(`Blocked listener channel: ${channel}`);
    return () => {};
  }

  const listener = (event, ...args) => callback(...args);
  ipcRenderer.on(channel, listener);

  return () => ipcRenderer.removeListener(channel, listener);
}

function safeOnce(channel, callback) {
  if (!channel || typeof channel !== "string") return Promise.resolve(null);

  const { allowedChannels } = validateChannel();

  if (!allowedChannels.once.includes(channel)) {
    console.error(`Blocked once channel: ${channel}`);
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    ipcRenderer.once(channel, (event, data) => {
      if (callback) callback(data);
      resolve(data);
    });
  });
}

// ============================================
// BIOMETRIC API (Renderer -> Electron Main)
// ============================================

const biometric = {
  init: () => safeInvoke("biometric:init"),
  getStatus: () => safeInvoke("biometric:getStatus"),
  listDevices: () => safeInvoke("biometric:listDevices"),
  setActiveDevice: (deviceId) => safeInvoke("biometric:setActiveDevice", deviceId),
  capture: (options = {}) => safeInvoke("biometric:capture", options),
  test: () => safeInvoke("biometric:test"),
  getStats: () => safeInvoke("biometric:getStats"),
  getCachedTemplate: (hash) => safeInvoke("biometric:getCachedTemplate", hash),
  disconnect: () => safeInvoke("biometric:disconnect"),

  // ✅ Matching System
  loadEnrolled: (token) => safeInvoke("biometric:loadEnrolled", token),
  match: (template) => safeInvoke("biometric:match", template),

  // ✅ Optional workflows
  identify: (options = {}) => safeInvoke("biometric:identify", options),
  register: (payload = {}) => safeInvoke("biometric:register", payload),

  // ✅ Events
  onDeviceAttached: (cb) => safeOn("biometric:device-attached", cb),
  onDeviceDetached: (cb) => safeOn("biometric:device-detached", cb),
  onDeviceReconnected: (cb) => safeOn("biometric:device-reconnected", cb),
  onDeviceReconnectionFailed: (cb) =>
    safeOn("biometric:device-reconnection-failed", cb),

  onInitialized: (cb) => safeOnce("biometric:initialized", cb),
  onCaptureComplete: (cb) => safeOnce("biometric:capture-complete", cb),
};

// ============================================
// APP API
// ============================================

const appApi = {
  getVersion: () => safeInvoke("app:version"),
  getEnv: () => safeInvoke("app:getEnv"),
  getLogs: (days = 7) => safeInvoke("app:getLogs", days),
  openDevTools: () => safeInvoke("app:openDevTools"),

  onFatalError: (cb) => safeOn("error:fatal", cb),
  onUnhandledRejection: (cb) => safeOn("error:unhandled-rejection", cb),
};

// ============================================
// ✅ EXPOSE ONCE (THIS IS THE FIX)
// ============================================

contextBridge.exposeInMainWorld("electronAPI", {
  biometric,
  app: appApi,
});
