/**
 * Electron API Type Definitions
 * This file defines the types for the Electron preload API
 * Place this in src/types/electron.d.ts
 */

export interface BiometricCaptureOptions {
  councilId?: string;
  purpose?: 'registration' | 'attendance';
}

export interface BiometricCaptureResult {
  success: boolean;
  template?: string;
  hash?: string;
  message?: string;
  error?: string;
  quality?: number;
}

export interface BiometricStatusResult {
  connected: boolean;
  device?: string;
  message?: string;
}

export interface BiometricInitResult {
  success: boolean;
  message?: string;
  error?: string;
  device?: string;
}

export interface BiometricDevice {
  id: string;
  name: string;
  vendor: string;
  vendorId?: string;
}

export interface ListDevicesResult {
  success: boolean;
  devices?: BiometricDevice[];
  error?: string;
}

export interface ConnectDeviceResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface DisconnectResult {
  success: boolean;
  message?: string;
}

export interface TestResult {
  success: boolean;
  message?: string;
  template?: string;
  error?: string;
}

export interface AppEnv {
  isDev: boolean;
  backendUrl: string;
}

export interface ElectronBiometricAPI {
  init: () => Promise<BiometricInitResult>;
  getStatus: () => Promise<BiometricStatusResult>;
  capture: (options: BiometricCaptureOptions) => Promise<BiometricCaptureResult>;
  listDevices: () => Promise<ListDevicesResult>;
  connectDevice: (deviceId: string) => Promise<ConnectDeviceResult>;
  disconnect: () => Promise<DisconnectResult>;
  test: () => Promise<TestResult>;
}

export interface ElectronAppAPI {
  getVersion: () => Promise<string>;
  getEnv: () => Promise<AppEnv>;
}

export interface ElectronAPI {
  biometric: ElectronBiometricAPI;
  app: ElectronAppAPI;
  onError: (callback: (data: any) => void) => void;
  onDeviceConnected: (callback: () => void) => void;
  onDeviceDisconnected: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};