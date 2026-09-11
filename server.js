const express = require('express');
const path = require('path');
const { initDb } = require('./db/database');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3030;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS ringan (tanpa dep tambahan) agar dev cross-origin (vite :5173 -> :3030)
// dan akses absolute-URL tetap bisa, termasuk header x-admin-token + preflight.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-admin-token, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Serve static files from React Frontend build
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Serve uploaded wallpapers and static downloads
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/downloads', express.static(path.join(__dirname, 'public', 'downloads')));

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

    try {
      require('./middleware/auth').deleteExpiredAdminSessions();
    } catch (_) {}

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🕌 Mosque Display Server running at:`);
      console.log(`   Local:   http://localhost:${PORT}`);
      console.log(`   Network: http://0.0.0.0:${PORT}`);
      console.log(`   Admin:   http://localhost:${PORT}/admin.html`);
    });

    // Best-effort auto-sync jadwal Kemenag (bulan ini + depan) max 1x/7 hari.
    // Gagal (offline) tidak masalah: TV pakai hitungan lokal sebagai fallback.
    setImmediate(async () => {
      try {
        const { getSetting } = require('./db/database');
        const last = getSetting('schedule_last_sync');
        const stale = !last || (Date.now() - new Date(last).getTime() > 7 * 24 * 3600 * 1000);
        if (!stale) return;
        const city = getSetting('schedule_city_id') || '1219';
        const { syncSchedule } = require('./services/schedule');
        const r = await syncSchedule(city);
        console.log(`📅 Jadwal Kemenag tersinkron (${r.synced} hari, ${r.lokasi})`);
      } catch (e) {
        console.warn('⚠️ Auto-sync jadwal gagal, pakai hitungan lokal:', e.message);
      }
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
