const { PrismaClient } = require('@prisma/client');

/** Shared PrismaClient singleton — prevents connection pool exhaustion. */
const prisma =
  global.__prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Log slow queries in development
    log: process.env.NODE_ENV !== 'production' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = prisma;
