import { app, ipcMain, BrowserWindow } from 'electron';
import * as crypto from 'crypto';

// Common fingerprint reader vendor IDs
const FINGERPRINT_READERS = {
  ZKTECO: 0x096e,
  SUPREMA: 0x0b98,
  DIGITALPERSONA: 0x05ba,
  MORPHO: 0x1c7d,
};

interface USBDevice {
  busNumber: number;
  deviceAddress: number;
  vendorId: number;
  productId: number;
  serialNumber?: string;
}

interface CapturedTemplate {
  template: string;
  hash: string;
  timestamp: string;
  quality: number;
}

class BiometricService {
  private device: USBDevice | null = null;
  private isConnected: boolean = false;
  private lastTemplate: string = '';
  private captureCount: number = 0;

  constructor() {
    this.initializeIPC();
  }

  private initializeIPC() {
    // Initialize biometric service
    ipcMain.handle('biometric:init', async () => {
      return this.initialize();
    });

    // Get device status
    ipcMain.handle('biometric:getStatus', async () => {
      return this.getStatus();
    });

    // Capture fingerprint
    ipcMain.handle('biometric:capture', async (event, options) => {
      return this.captureFingerprint(options);
    });

    // List available devices
    ipcMain.handle('biometric:listDevices', async () => {
      return this.listDevices();
    });

    // Connect to specific device
    ipcMain.handle('biometric:connectDevice', async (event, devicePath) => {
      return this.connectDevice(devicePath);
    });

    // Disconnect device
    ipcMain.handle('biometric:disconnect', async () => {
      return this.disconnect();
    });
  }

  async initialize(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const devices = this.listDevices();

      if (devices.length === 0) {
        return {
          success: false,
          error: 'No biometric devices found. Please connect a fingerprint reader.',
        };
      }

      // Connect to first available device
      const connected = await this.connectDevice(devices[0].path || '');

      if (connected.success) {
        this.isConnected = true;
        return {
          success: true,
          message: `Connected to biometric device: ${devices[0].name}`,
        };
      }

      return connected;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to initialize biometric service',
      };
    }
  }

  private listDevices(): any[] {
    // In a real implementation, use 'usb' or 'node-usb' library
    // This is a mock implementation
    try {
      // You would use: const usb = require('usb');
      // const devices = usb.getDeviceList();
      // Then filter by vendor ID

      const mockDevices = [
        {
          path: '/dev/ttyUSB0',
          name: 'USB Fingerprint Reader',
          vendorId: FINGERPRINT_READERS.ZKTECO,
          productId: 0x0094,
        },
      ];

      return mockDevices;
    } catch (error) {
      console.error('Error listing devices:', error);
      return [];
    }
  }

  private async connectDevice(devicePath: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      // In production, use 'serialport' library for serial communication
      // const SerialPort = require('serialport').SerialPort;
      // this.device = new SerialPort({ path: devicePath, baudRate: 9600 });

      this.isConnected = true;
      return {
        success: true,
        message: `Connected to device at ${devicePath}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to device',
      };
    }
  }

  private async disconnect(): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      this.isConnected = false;
      this.device = null;
      return {
        success: true,
        message: 'Disconnected from biometric device',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  private getStatus(): {
    connected: boolean;
    device?: string;
    lastCapture?: string;
  } {
    return {
      connected: this.isConnected,
      device: this.device ? 'Connected' : 'Not connected',
      lastCapture: this.lastTemplate ? 'Available' : 'None',
    };
  }

  async captureFingerprint(options: {
    purpose?: 'registration' | 'attendance';
    requiredScans?: number;
  } = {}): Promise<{
    success: boolean;
    template?: string;
    hash?: string;
    message?: string;
    error?: string;
    quality?: number;
  }> {
    try {
      if (!this.isConnected) {
        return {
          success: false,
          error: 'Device not connected',
        };
      }

      // Simulate fingerprint capture
      // In production, this would:
      // 1. Send capture command to device
      // 2. Read fingerprint data from device
      // 3. Process raw data into template
      // 4. Generate quality score

      const template = this.generateMockTemplate();
      const hash = crypto
        .createHash('sha256')
        .update(template)
        .digest('hex');
      const quality = Math.random() * 100; // Mock quality score

      this.lastTemplate = template;
      this.captureCount++;

      return {
        success: true,
        template,
        hash,
        message: 'Fingerprint captured successfully',
        quality: Math.round(quality),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to capture fingerprint',
      };
    }
  }

  private generateMockTemplate(): string {
    // Generate a realistic-looking template
    // In production, this comes from the fingerprint device
    const randomBytes = crypto.randomBytes(32);
    return randomBytes.toString('base64');
  }

  getConnectedDevices(): USBDevice[] {
    // Return list of connected biometric devices
    return this.device ? [this.device] : [];
  }

  isDeviceConnected(): boolean {
    return this.isConnected;
  }

  getLastTemplate(): string {
    return this.lastTemplate;
  }
}

export { BiometricService };