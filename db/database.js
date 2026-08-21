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
      calculation_method: 'MuslimWorldLeague',
      madhab: 'Shafi',
      hijri_adjustment: '0',
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
  getActiveWallpapers
};
