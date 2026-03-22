const pino = require('pino');

const isTest = process.env.NODE_ENV === 'test';
const isDev = process.env.NODE_ENV !== 'production' && !isTest;

const logger = pino({
  level: isTest ? 'silent' : (process.env.LOG_LEVEL || (isDev ? 'debug' : 'info')),
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
});

module.exports = logger;
