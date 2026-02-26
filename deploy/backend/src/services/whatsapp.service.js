/**
 * WhatsApp service — STUB for deploy.
 *
 * whatsapp-web.js requires Puppeteer/Chromium which cannot run on
 * Railway (serverless). All functions are safe no-ops that return null.
 *
 * The exported API matches the original so all consumers keep working.
 */

const waConfig = require('../config/whatsapp');

const initialize = async () => {
  console.log('[WA] WhatsApp dinonaktifkan (serverless deploy)');
};

const sendMessage = async () => null;

const sendLowStockAlert = async () => null;

const sendBonReminder = async () => null;

const sendPONotification = async () => null;

const getStatus = () => waConfig.getStatus();

const disconnect = async () => {};

module.exports = {
  initialize,
  sendMessage,
  sendLowStockAlert,
  sendBonReminder,
  sendPONotification,
  getStatus,
  disconnect,
};
