const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyPin, createSession, authMiddleware } = require('../middleware/auth');
const { setSetting, getAllSettings, runSql, queryAll } = require('../db/database');

// Configure multer for wallpaper uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'wp-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// POST /api/admin/login — Verify PIN and get session token
router.post('/login', (req, res) => {
  try {
    const { pin } = req.body;
    if (verifyPin(pin)) {
      const token = createSession();
      res.json({ success: true, token });
    } else {
      res.status(401).json({ success: false, error: 'PIN salah' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Protect all routes below with authMiddleware
router.use(authMiddleware);

// POST /api/admin/settings — Update one or multiple settings
router.post('/settings', (req, res) => {
  try {
    const settings = req.body; // Expecting an object of key-value pairs
    for (const [key, value] of Object.entries(settings)) {
      setSetting(key, value);
    }
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/settings — Get all settings
router.get('/settings', (req, res) => {
  try {
    const settings = getAllSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin endpoints for Announcements
router.get('/announcements', (req, res) => {
  try {
    const announcements = queryAll('SELECT * FROM announcements ORDER BY priority DESC, created_at DESC');
    res.json({ success: true, data: announcements });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/announcements', (req, res) => {
  try {
    const { text, is_active, priority, start_date, end_date } = req.body;
    runSql(
      'INSERT INTO announcements (text, is_active, priority, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
      [text, is_active || 1, priority || 0, start_date || null, end_date || null]
    );
    res.json({ success: true, message: 'Announcement added' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/announcements/:id', (req, res) => {
  try {
    runSql('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin endpoints for Quotes
router.get('/quotes', (req, res) => {
  try {
    const quotes = queryAll('SELECT * FROM quotes ORDER BY created_at DESC');
    res.json({ success: true, data: quotes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/quotes', (req, res) => {
  try {
    const { text_arabic, text_translation, source, category, is_active } = req.body;
    runSql(
      'INSERT INTO quotes (text_arabic, text_translation, source, category, is_active) VALUES (?, ?, ?, ?, ?)',
      [text_arabic || '', text_translation, source || '', category || 'hadith', is_active !== undefined ? is_active : 1]
    );
    res.json({ success: true, message: 'Quote added' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/quotes/:id', (req, res) => {
  try {
    runSql('DELETE FROM quotes WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Quote deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin endpoints for Wallpapers
router.get('/wallpapers', (req, res) => {
  try {
    const wallpapers = queryAll('SELECT * FROM wallpapers ORDER BY sort_order ASC, created_at ASC');
    res.json({ success: true, data: wallpapers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/wallpapers', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const filename = req.file.filename;
    const original_name = req.file.originalname;
    runSql(
      'INSERT INTO wallpapers (filename, original_name, is_active) VALUES (?, ?, 1)',
      [filename, original_name]
    );
    res.json({ success: true, message: 'Wallpaper uploaded', filename });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/wallpapers/:id', (req, res) => {
  try {
    const wp = queryAll('SELECT * FROM wallpapers WHERE id = ?', [req.params.id])[0];
    if (wp) {
      const filePath = path.join(__dirname, '../public/uploads', wp.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      runSql('DELETE FROM wallpapers WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Wallpaper deleted' });
    } else {
      res.status(404).json({ success: false, error: 'Wallpaper not found' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin endpoints for Friday Info
router.get('/friday', (req, res) => {
  try {
    const records = queryAll('SELECT * FROM friday_info ORDER BY date DESC LIMIT 20');
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/friday', (req, res) => {
  try {
    const { date, khatib_name, khatib_title, income, expense, balance } = req.body;
    runSql(
      'INSERT INTO friday_info (date, khatib_name, khatib_title, income, expense, balance) VALUES (?, ?, ?, ?, ?, ?)',
      [date, khatib_name, khatib_title || '', income || 0, expense || 0, balance || 0]
    );
    res.json({ success: true, message: 'Data Jumat berhasil disimpan' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/friday/:id', (req, res) => {
  try {
    runSql('DELETE FROM friday_info WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Data Jumat dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
