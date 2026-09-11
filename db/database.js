const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'mosque.db');

let db = null;
let dbReady = null;

async function initDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  initTables();
  seedDefaults();
  saveDb();

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function initTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS wallpapers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text_arabic TEXT,
      text_translation TEXT NOT NULL,
      source TEXT,
      category TEXT DEFAULT 'hadith',
      is_active INTEGER DEFAULT 1,
      last_shown INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      priority INTEGER DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS prayer_schedule (
      date TEXT PRIMARY KEY,
      fajr TEXT NOT NULL,
      sunrise TEXT NOT NULL,
      dhuhr TEXT NOT NULL,
      asr TEXT NOT NULL,
      maghrib TEXT NOT NULL,
      isha TEXT NOT NULL,
      source TEXT DEFAULT 'kemenag',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS friday_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      khatib_name TEXT NOT NULL,
      khatib_title TEXT,
      muadzin_name TEXT,
      income REAL DEFAULT 0,
      expense REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    db.run("ALTER TABLE friday_info ADD COLUMN muadzin_name TEXT;");
  } catch (e) {
    // ignore if column exists
  }
}

function seedDefaults() {
  const result = db.exec('SELECT COUNT(*) as count FROM settings');
  const count = result.length > 0 ? result[0].values[0][0] : 0;

  if (count === 0) {
    const defaults = {
      mosque_name: 'Masjid Asy Syura DPRD Jabar',
      latitude: '-6.9175',
      longitude: '107.6191',
      timezone: 'Asia/Jakarta',
      calculation_method: 'Kemenag',
      madhab: 'Shafi',
      hijri_adjustment: '0',
      ikhtiyat: '2',
      schedule_city_id: '1219',
      adjust_fajr: '0',
      adjust_sunrise: '-7',
      adjust_dhuhr: '0',
      adjust_asr: '0',
      adjust_maghrib: '5',
      adjust_isha: '1',
      admin_pin: bcrypt.hashSync('1234', 10),
      iqamah_fajr: '15',
      iqamah_dhuhr: '10',
      iqamah_asr: '10',
      iqamah_maghrib: '5',
      iqamah_isha: '10',
      bg_rotation_interval: '30',
      mecca_stream_url: 'https://www.youtube.com/embed/bB4cjQ9jfCY?autoplay=1&mute=1',
      adhan_pre_alert_minutes: '5',
      running_text_speed: '10'
    };

    const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(defaults)) {
      stmt.run([key, value]);
    }
    stmt.free();
  }

  // Default kota jadwal Kemenag (hormati pilihan user bila sudah ada)
  try {
    const cStmt = db.prepare("INSERT INTO settings (key, value) VALUES ('schedule_city_id', '1219') ON CONFLICT(key) DO NOTHING");
    cStmt.run();
    cStmt.free();
  } catch (_) {}

  // Migrasi ke basis Kemenag: basis hitung berubah (20°/18° + ikhtiyat),
  // sehingga angka koreksi lama tidak valid lagi — timpa dengan residu baru.
  // (Aman: metode & koreksi tidak bisa diubah user via Admin sebelum ini.)
  const kemenagMigrate = {
    calculation_method: 'Kemenag',
    ikhtiyat: '2',
    adjust_fajr: '0',
    adjust_sunrise: '-7',
    adjust_dhuhr: '0',
    adjust_asr: '0',
    adjust_maghrib: '5',
    adjust_isha: '1'
  };
  const bStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  for (const [key, value] of Object.entries(kemenagMigrate)) {
    bStmt.run([key, value]);
  }
  bStmt.free();

  // Seed quotes if empty
  const quoteResult = db.exec('SELECT COUNT(*) as count FROM quotes');
  const quoteCount = quoteResult.length > 0 ? quoteResult[0].values[0][0] : 0;

  if (quoteCount === 0) {
    const seedPath = path.join(__dirname, 'seeds', 'quotes.json');
    if (fs.existsSync(seedPath)) {
      const quotes = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      const stmt = db.prepare(
        'INSERT INTO quotes (text_arabic, text_translation, source, category) VALUES (?, ?, ?, ?)'
      );
      for (const q of quotes) {
        stmt.run([q.text_arabic, q.text_translation, q.source, q.category]);
      }
      stmt.free();
    }
  }
}

// Helper: run SELECT and get array of objects
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);

  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

function runSql(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.run(params);
  else stmt.run();
  stmt.free();
  saveDb();
}

// === Public API ===

function getSetting(key) {
  const row = queryOne('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : null;
}

function getAllSettings() {
  const rows = queryAll('SELECT key, value FROM settings');
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

function setSetting(key, value) {
  runSql(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
    [key, value, value]
  );
}

function getNextQuote() {
  const quote = queryOne(`
    SELECT * FROM quotes 
    WHERE is_active = 1 
    ORDER BY last_shown ASC, RANDOM() 
    LIMIT 1
  `);

  if (quote) {
    runSql('UPDATE quotes SET last_shown = ? WHERE id = ?', [Date.now(), quote.id]);
  }

  return quote;
}

function getRandomQuote() {
  return queryOne(`
    SELECT * FROM quotes 
    WHERE is_active = 1 
    ORDER BY RANDOM() 
    LIMIT 1
  `);
}

function getActiveAnnouncements() {
  const today = new Date().toISOString().split('T')[0];
  return queryAll(`
    SELECT * FROM announcements 
    WHERE is_active = 1 
      AND (start_date IS NULL OR start_date <= ?)
      AND (end_date IS NULL OR end_date >= ?)
    ORDER BY priority DESC, created_at DESC
  `, [today, today]);
}

function getCurrentFriday() {
  const today = new Date();
  const dayOfWeek = today.getDay();

  // Find the current week's Friday
  const friday = new Date(today);
  if (dayOfWeek === 5) {
    // Today is Friday — use today
  } else if (dayOfWeek < 5) {
    // Before Friday this week — show upcoming Friday
    friday.setDate(friday.getDate() + (5 - dayOfWeek));
  } else {
    // Saturday (6) — show yesterday's Friday
    friday.setDate(friday.getDate() - 1);
  }

  const year = friday.getFullYear();
  const month = String(friday.getMonth() + 1).padStart(2, '0');
  const day = String(friday.getDate()).padStart(2, '0');
  const fridayStr = `${year}-${month}-${day}`;

  return queryOne(`
    SELECT * FROM friday_info 
    WHERE date = ?
    ORDER BY created_at DESC 
    LIMIT 1
  `, [fridayStr]);
}

function getActiveWallpapers() {
  return queryAll(`
    SELECT * FROM wallpapers 
    WHERE is_active = 1 
    ORDER BY sort_order ASC, created_at ASC
  `);
}

// === Admin sessions (persisted in DB so they survive server restarts) ===

function createAdminSession(token, ttlMs) {
  const expiresAt = Date.now() + ttlMs;
  runSql(
    'INSERT INTO admin_sessions (token, expires_at) VALUES (?, ?) ON CONFLICT(token) DO UPDATE SET expires_at = ?',
    [token, expiresAt, expiresAt]
  );
  return expiresAt;
}

function findValidAdminSession(token) {
  if (!token) return null;
  const row = queryOne('SELECT token, expires_at FROM admin_sessions WHERE token = ?', [token]);
  if (!row) return null;
  if (row.expires_at <= Date.now()) {
    runSql('DELETE FROM admin_sessions WHERE token = ?', [token]);
    return null;
  }
  return row;
}

function deleteAdminSession(token) {
  if (!token) return;
  runSql('DELETE FROM admin_sessions WHERE token = ?', [token]);
}

function deleteExpiredAdminSessions() {
  runSql('DELETE FROM admin_sessions WHERE expires_at <= ?', [Date.now()]);
}

// === Kemenag prayer schedule (synced, cached for offline-first) ===

function saveScheduleDay(row) {
  runSql(
    `INSERT INTO prayer_schedule (date, fajr, sunrise, dhuhr, asr, maghrib, isha, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       fajr = excluded.fajr, sunrise = excluded.sunrise, dhuhr = excluded.dhuhr,
       asr = excluded.asr, maghrib = excluded.maghrib, isha = excluded.isha,
       source = excluded.source, updated_at = CURRENT_TIMESTAMP`,
    [row.date, row.fajr, row.sunrise, row.dhuhr, row.asr, row.maghrib, row.isha, row.source || 'kemenag']
  );
}

function getScheduleDay(dateStr) {
  return queryOne(
    'SELECT date, fajr, sunrise, dhuhr, asr, maghrib, isha FROM prayer_schedule WHERE date = ?',
    [dateStr]
  );
}

function countScheduleDays() {
  const r = queryOne('SELECT COUNT(*) AS c FROM prayer_schedule');
  return r ? r.c : 0;
}

module.exports = {
  initDb,
  getDb,
  saveDb,
  queryAll,
  queryOne,
  runSql,
  getSetting,
  getAllSettings,
  setSetting,
  getNextQuote,
  getRandomQuote,
  getActiveAnnouncements,
  getCurrentFriday,
  getActiveWallpapers,
  createAdminSession,
  findValidAdminSession,
  deleteAdminSession,
  deleteExpiredAdminSessions,
  saveScheduleDay,
  getScheduleDay,
  countScheduleDays
};
