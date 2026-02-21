const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');

/**
 * WhatsApp client configuration.
 *
 * WA_ENABLED=false in .env disables the client entirely (no QR, no connection).
 * This prevents the server from hanging on startup when WA is not needed.
 */

let client = null;
let isReady = false;
let qrCode = null;

const isEnabled = () => process.env.WA_ENABLED === 'true';

const getClient = () => {
  if (!isEnabled()) return null;

  if (!client) {
    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, '..', '..', '.wwebjs_auth'),
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      },
    });

    // QR code event
    client.on('qr', (qr) => {
      qrCode = qr;
      console.log('[WA] QR code diterima. Scan untuk autentikasi.');
      console.log('[WA] QR:', qr.substring(0, 50) + '...');
    });

    // Ready event
    client.on('ready', () => {
      isReady = true;
      qrCode = null;
      console.log('[WA] WhatsApp client siap!');
    });

    // Authenticated event
    client.on('authenticated', () => {
      console.log('[WA] Autentikasi berhasil.');
    });

    // Auth failure
    client.on('auth_failure', (msg) => {
      isReady = false;
      console.error('[WA] Autentikasi gagal:', msg);
    });

    // Disconnected
    client.on('disconnected', (reason) => {
      isReady = false;
      qrCode = null;
      console.warn('[WA] Terputus:', reason);
    });
  }

  return client;
};

const getStatus = () => ({
  enabled: isEnabled(),
  ready: isReady,
  hasQr: !!qrCode,
});

const getQrCode = () => qrCode;

const setReady = (val) => { isReady = val; };

module.exports = {
  isEnabled,
  getClient,
  getStatus,
  getQrCode,
  setReady,
};
