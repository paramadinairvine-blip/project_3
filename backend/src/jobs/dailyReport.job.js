const cron = require('node-cron');
const { sendDailyReport } = require('../services/telegram.service');
const logger = require('../utils/logger');

/**
 * Schedule daily revenue report at 20:00 WIB (13:00 UTC).
 */
const startDailyReportJob = () => {
  // 20:00 WIB every day (timezone set to Asia/Jakarta)
  cron.schedule('0 20 * * *', async () => {
    logger.info('Running daily report cron job...');
    try {
      await sendDailyReport();
      logger.info('Daily report sent successfully');
    } catch (error) {
      logger.error('Daily report cron failed:', error.message);
    }
  }, {
    timezone: 'Asia/Jakarta',
    scheduled: true,
  });

  logger.info('Daily report cron scheduled — every day at 20:00 WIB');
};

module.exports = { startDailyReportJob };
