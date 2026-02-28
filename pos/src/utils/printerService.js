/**
 * Printer Service - connects to a local printer app via WebSocket
 * Compatible with printer bridge apps like:
 * - RawBT (Android)
 * - QZ Tray (Desktop)
 * - Custom WebSocket printer bridge
 */

const STORAGE_KEY = 'pos-printer-settings';

const defaultSettings = {
  cetakStruk: true,
  appKey: '',
  socketPort: 0,
};

export function getPrinterSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function savePrinterSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Print receipt via WebSocket connection to printer app
 */
export async function printReceipt(receiptHtml) {
  const settings = getPrinterSettings();

  if (!settings.cetakStruk) {
    return { success: true, message: 'Cetak struk dinonaktifkan' };
  }

  // If socket port is configured, try WebSocket printing
  if (settings.socketPort > 0) {
    return printViaWebSocket(receiptHtml, settings);
  }

  // Fallback to browser print dialog
  return printViaBrowser(receiptHtml);
}

/**
 * Print via WebSocket to printer bridge app
 */
function printViaWebSocket(receiptHtml, settings) {
  return new Promise((resolve) => {
    const wsUrl = `ws://localhost:${settings.socketPort}`;

    try {
      const ws = new WebSocket(wsUrl);
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          ws.close();
          // Fallback to browser print
          printViaBrowser(receiptHtml).then(resolve);
        }
      }, 3000);

      ws.onopen = () => {
        const payload = JSON.stringify({
          type: 'print',
          appKey: settings.appKey || '',
          content: receiptHtml,
        });
        ws.send(payload);
      };

      ws.onmessage = (event) => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          ws.close();
          try {
            const data = JSON.parse(event.data);
            resolve({ success: data.success !== false, message: data.message || 'Berhasil dicetak via printer' });
          } catch {
            resolve({ success: true, message: 'Berhasil dicetak via printer' });
          }
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          ws.close();
          // Fallback to browser print
          printViaBrowser(receiptHtml).then(resolve);
        }
      };
    } catch {
      // Fallback to browser print
      printViaBrowser(receiptHtml).then(resolve);
    }
  });
}

/**
 * Fallback: print via browser print dialog
 */
function printViaBrowser(receiptHtml) {
  return new Promise((resolve) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
      resolve({ success: true, message: 'Dicetak via browser' });
    } else {
      resolve({ success: false, message: 'Popup diblokir browser' });
    }
  });
}

/**
 * Test printer connection
 */
export function testPrinterConnection(settings) {
  return new Promise((resolve) => {
    if (!settings.socketPort || settings.socketPort <= 0) {
      resolve({ connected: false, message: 'Socket port belum dikonfigurasi' });
      return;
    }

    const wsUrl = `ws://localhost:${settings.socketPort}`;

    try {
      const ws = new WebSocket(wsUrl);
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          ws.close();
          resolve({ connected: false, message: 'Koneksi timeout - pastikan printer app berjalan' });
        }
      }, 3000);

      ws.onopen = () => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          // Send ping/test
          ws.send(JSON.stringify({ type: 'test', appKey: settings.appKey || '' }));
          ws.close();
          resolve({ connected: true, message: `Terhubung ke ws://localhost:${settings.socketPort}` });
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          resolve({ connected: false, message: 'Gagal terhubung - pastikan printer app berjalan' });
        }
      };
    } catch {
      resolve({ connected: false, message: 'Gagal membuat koneksi WebSocket' });
    }
  });
}
