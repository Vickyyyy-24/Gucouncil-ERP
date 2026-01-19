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
export {};

declare global {
  interface Window {
    electronAPI?: {
      biometric: {
        getStatus: () => Promise<{ connected: boolean; device?: string }>;

        // ✅ capture works for BOTH registration + attendance
        capture: (opts: {
          purpose: "registration" | "attendance";
          councilId?: string;
        }) => Promise<{
          success: boolean;
          template?: string;
          hash?: string;
          quality?: number;
          error?: string;
        }>;

        // ✅ load enrolled templates into Electron memory
        loadEnrolled?: (
          token: string
        ) => Promise<{ success: boolean; count?: number; loadedAt?: string; error?: string }>;

        // ✅ attendance match helper
        matchAttendance?: () => Promise<
          | {
              success: true;
              userId: number;
              councilId: string;
              name: string;
              committee: string;
              score?: number;
            }
          | { success: false; error: string }
        >;
      };

      app?: {
        getEnv?: () => Promise<any>;
        getVersion?: () => Promise<string>;
      };
    };
  }
}
export {};

declare global {
  interface Window {
    electronAPI?: {
      biometric: {
        getStatus: () => Promise<{ connected: boolean; device?: string }>;

        capture: (opts?: { purpose?: string }) => Promise<{
          success: boolean;
          template?: string;
          quality?: number;
          error?: string;
        }>;

        loadEnrolled: (token: string) => Promise<{
          success: boolean;
          count?: number;
          loadedAt?: string;
          error?: string;
        }>;

        match: (template: string) => Promise<{
          success: boolean;
          matched?: boolean;
          userId?: number;
          councilId?: string;
          name?: string;
          committee?: string;
          score?: number;
          error?: string;
        }>;
      };
    };
  }
}
export {};

declare global {
  interface Window {
    electronAPI?: {
      biometric: {
        getStatus: () => Promise<{
          connected: boolean;
          device?: string;
          isMock?: boolean;
          devicesFound?: number;
          activeDevice?: any;
          enrolledCount?: number;
          enrolledLoadedAt?: string | null;
        }>;

        capture: (opts?: { purpose?: string; councilId?: string }) => Promise<{
          success: boolean;
          template?: string;
          error?: string;
          quality?: number;
        }>;

        loadEnrolled: (token: string) => Promise<{
          success: boolean;
          count?: number;
          loadedAt?: string;
          error?: string;
        }>;

        match: (template: string) => Promise<{
          success: boolean;
          matched?: boolean;
          councilId?: string;
          name?: string;
          committee?: string;
          score?: number;
          error?: string;
        }>;
      };

      app: {
        getEnv: () => Promise<any>;
        getVersion: () => Promise<string>;
      };
    };
  }
}
