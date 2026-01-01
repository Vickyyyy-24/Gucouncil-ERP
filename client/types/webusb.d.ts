interface Navigator {
  usb: {
    requestDevice(options: { filters: Array<{ vendorId: number }> }): Promise<USBDevice>;
  };
}

interface USBDevice {
  open(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
  transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
}

interface USBOutTransferResult {
  bytesWritten: number;
  status: 'ok' | 'stall' | 'babble';
}

interface USBInTransferResult {
  data: DataView;
  status: 'ok' | 'stall' | 'babble';
}
