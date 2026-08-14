const express = require('express');
const path = require('path');
const { initDb } = require('./db/database');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from React Frontend build
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Serve uploaded wallpapers
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// API routes
app.use('/api/admin', require('./routes/admin'));
app.use('/api', apiRoutes);

// Fallback to index.html for unknown routes (React SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// Start server after DB is ready
async function start() {
  try {
    await initDb();
    console.log('✅ Database initialized');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🕌 Mosque Display Server running at:`);
      console.log(`   Local:   http://localhost:${PORT}`);
      console.log(`   Network: http://0.0.0.0:${PORT}`);
      console.log(`   Admin:   http://localhost:${PORT}/admin.html`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
