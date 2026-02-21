const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { errorHandler } = require('./middlewares/errorHandler');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
