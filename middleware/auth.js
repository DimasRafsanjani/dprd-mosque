const bcrypt = require('bcryptjs');
const {
  getSetting,
  createAdminSession,
  findValidAdminSession,
  deleteExpiredAdminSessions
} = require('../db/database');

// Session TTL: 24 hours, persisted in DB so logins survive server restarts.
// (Previously in-memory Map — every restart wiped all sessions.)
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function verifyPin(pin) {
  const hashedPin = getSetting('admin_pin');
  if (!hashedPin) return false;
  return bcrypt.compareSync(pin, hashedPin);
}

function createSession() {
  const token = generateToken();
  createAdminSession(token, SESSION_TTL_MS);
  return token;
}

function authMiddleware(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!token || !findValidAdminSession(token)) {
    return res.status(401).json({ success: false, error: 'Sesi berakhir. Silakan login lagi.' });
  }
  next();
}

module.exports = { verifyPin, createSession, authMiddleware, deleteExpiredAdminSessions };
