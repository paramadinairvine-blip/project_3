const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { errorHandler } = require('./middlewares/errorHandler');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ─────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP agar frontend SPA bisa jalan
  crossOriginEmbedderPolicy: false,
}));

// CORS — batasi origin
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  'https://material-pesantren.vercel.app',
  'https://frontend-one-bice-78.vercel.app',
];
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : defaultOrigins;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting — global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 500,
  message: { success: false, message: 'Terlalu banyak request, coba lagi nanti' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// Rate limiting — auth (lebih ketat)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 20,
  message: { success: false, message: 'Terlalu banyak percobaan login, coba lagi dalam 15 menit' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// ─── Body Parser ─────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', routes);

// Global error handler (for API errors)
app.use('/api', errorHandler);

// ─── Serve frontend in production ────────────────────
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
const indexHtml = path.join(frontendDist, 'index.html');

if (fs.existsSync(indexHtml)) {
  // Serve static assets (JS, CSS, images)
  app.use(express.static(frontendDist));

  // SPA fallback — all non-API GET requests serve index.html
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(indexHtml);
    }
    next();
  });

  console.log('Frontend build found — serving static files from', frontendDist);
} else {
  console.log('No frontend build found at', frontendDist);
  console.log('Run "cd frontend && npm run build" to build the frontend.');
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
