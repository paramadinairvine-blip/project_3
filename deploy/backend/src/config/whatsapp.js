/**
 * WhatsApp client configuration — STUB for deploy.
 *
 * whatsapp-web.js requires Puppeteer/Chromium which cannot run on
 * serverless platforms (Railway, Vercel, etc.).
 *
 * This stub exports the same API so all consumers keep working,
 * but every operation is a no-op. If you need WA, deploy on a VPS
 * and swap this file with the original whatsapp.js config.
 */

const isEnabled = () => false;

const getClient = () => null;

const getStatus = () => ({
  enabled: false,
  ready: false,
  hasQr: false,
  message: 'WhatsApp tidak tersedia di deployment ini (serverless).',
});

const getQrCode = () => null;

const setReady = () => {};

module.exports = {
  isEnabled,
  getClient,
  getStatus,
  getQrCode,
  setReady,
};
