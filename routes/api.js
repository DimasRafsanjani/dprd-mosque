const express = require('express');
const router = express.Router();
const {
  getAllSettings,
  getNextQuote,
  getRandomQuote,
  getActiveAnnouncements,
  getCurrentFriday,
  getActiveWallpapers
} = require('../db/database');

// GET /api/settings — display page fetches all settings
router.get('/settings', (req, res) => {
  try {
    const settings = getAllSettings();
    // Don't expose admin_pin to frontend
    delete settings.admin_pin;
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quote — get next quote (tracks rotation, no dupes)
router.get('/quote', (req, res) => {
  try {
    const quote = getNextQuote();
    res.json(quote || { text_translation: 'SubhanAllah', source: '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quote/random — get random quote without tracking
router.get('/quote/random', (req, res) => {
  try {
    const quote = getRandomQuote();
    res.json(quote || { text_translation: 'SubhanAllah', source: '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/announcements — get active announcements
router.get('/announcements', (req, res) => {
  try {
    const announcements = getActiveAnnouncements();
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/friday — get current/upcoming Friday info
router.get('/friday', (req, res) => {
  try {
    const friday = getCurrentFriday();
    res.json(friday || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wallpapers — get active wallpapers list
router.get('/wallpapers', (req, res) => {
  try {
    const wallpapers = getActiveWallpapers();
    res.json(wallpapers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
