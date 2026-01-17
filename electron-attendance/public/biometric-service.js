const usb = require('usb');

class BiometricService {
  constructor() {
    this.device = null;
    this.deviceInfo = null;
  }

  VENDOR_IDS = {
    SECUGEN: 0x096e,
    FUTRONIC: 0x1162,
    NITGEN: 0x0483,
    BIOMIKEY: 0x0c2c
  };

  async initialize() {
    try {
      const devices = usb.getDeviceList();

      for (const device of devices) {
        const desc = device.deviceDescriptor;

        if (Object.values(this.VENDOR_IDS).includes(desc.idVendor)) {
          this.device = device;
          this.deviceInfo = {
            vendorId: `0x${desc.idVendor.toString(16)}`,
            productId: `0x${desc.idProduct.toString(16)}`
          };

          try {
            await this.device.open();
            await this.device.claimInterface(0);
            return `Connected: ${this.deviceInfo.vendorId}:${this.deviceInfo.productId}`;
          } catch (error) {
            throw new Error(`Failed to open device: ${error.message}`);
          }
        }
      }

      throw new Error('No fingerprint reader detected');
    } catch (error) {
      throw error;
    }
  }

  async captureFingerprint() {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    try {
      const captureCommand = Buffer.from([0x55, 0xAA, 0x01, 0x01, 0xFE]);

      await this.device.controlTransfer(0xC0, 0xA4, 0x0001, 0x0000, captureCommand);

      await this.sleep(3000);

      const endpoints = this.device.interfaces[0].endpoints;
      if (!endpoints || endpoints.length === 0) {
        throw new Error('No endpoints found');
      }

      const inEndpoint = endpoints.find(ep => ep.direction === 'in');
      if (!inEndpoint) {
        throw new Error('No input endpoint found');
      }

      const buffer = Buffer.alloc(1024);
      const bytesRead = await this.readFromEndpoint(inEndpoint, buffer);

      if (bytesRead < 50) {
        throw new Error('Invalid fingerprint captured');
      }

      const template = buffer.slice(0, bytesRead).toString('base64');
      return template;
    } catch (error) {
      throw new Error(`Capture failed: ${error.message}`);
    }
  }

  readFromEndpoint(endpoint, buffer) {
    return new Promise((resolve, reject) => {
      endpoint.transfer(buffer, (error, bytesRead) => {
        if (error) {
          reject(error);
        } else {
          resolve(bytesRead);
        }
      });
    });
  }

  isConnected() {
    return this.device !== null;
  }

  getDeviceInfo() {
    return this.deviceInfo;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { BiometricService };