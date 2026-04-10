import { env } from "../config/env.js";
import { appError } from "../lib/errors.js";

export interface ScanQueueTicket {
  state: "PENDING";
  queuedAt: string;
}

export const scanQueueService = {
  assertScannerAvailable(): void {
    if (!env.SCAN_ADAPTER_ENABLED) {
      throw appError.serviceUnavailable("Scanner adapter unavailable. Finalize-bind is fail-closed");
    }
  },

  enqueueForScan(): ScanQueueTicket {
    this.assertScannerAvailable();
    return {
      state: "PENDING",
      queuedAt: new Date().toISOString()
    };
  }
};
