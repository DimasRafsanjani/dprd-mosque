const bcrypt = require('bcryptjs');
const { getSetting } = require('../db/database');

// Simple session store (in-memory)
const sessions = new Map();

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
  sessions.set(token, { createdAt: Date.now() });
  // Sessions expire after 24 hours
  setTimeout(() => sessions.delete(token), 24 * 60 * 60 * 1000);
  return token;
}

function authMiddleware(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized. Please login with PIN.' });
  }
  next();
}

module.exports = { verifyPin, createSession, authMiddleware };
