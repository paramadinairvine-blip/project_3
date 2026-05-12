const { PrismaClient } = require('@prisma/client');

// Singleton PrismaClient — prevents multiple instances exhausting connection pool
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
