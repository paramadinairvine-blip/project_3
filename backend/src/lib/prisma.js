const { PrismaClient } = require('@prisma/client');

/** Shared PrismaClient singleton — prevents connection pool exhaustion. */
const prisma = global.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = prisma;
