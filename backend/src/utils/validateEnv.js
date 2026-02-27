/**
 * Validate required environment variables on startup.
 * Throws an error with all missing variables listed.
 */
function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join('\n  ')}\n\nSee .env.example for reference.`
    );
  }

  // Warn about insecure defaults in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this') {
      console.warn('[WARN] JWT_SECRET is using the default value. Change it for production!');
    }
  }
}

module.exports = validateEnv;
