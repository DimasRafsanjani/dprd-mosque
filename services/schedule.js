// Sinkronisasi jadwal sholat resmi Kemenag (via MyQuran API) ke DB lokal.
// Hasil sync di-cache di tabel prayer_schedule sehingga TV tetap plek-Kemenag
// saat offline. Hitungan lokal (20°/18° + ikhtiyat) hanya jadi fallback.
const { saveScheduleDay, setSetting } = require('../db/database');

const API_BASE = 'https://api.myquran.com/v2/sholat/jadwal';
const HHMM = /^\d{2}:\d{2}$/;

async function fetchMonth(cityId, year, month) {
  const mm = String(month).padStart(2, '0');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(`${API_BASE}/${cityId}/${year}/${mm}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} (${cityId}/${year}/${mm})`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Sync bulan berjalan + bulan depan (agar pergantian bulan tidak bolong).
async function syncSchedule(cityId) {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const months = [
    { y: now.getFullYear(), m: now.getMonth() + 1 },
    { y: next.getFullYear(), m: next.getMonth() + 1 }
  ];
  let total = 0;
  let lokasi = '';
  for (const { y, m } of months) {
    const json = await fetchMonth(cityId, y, m);
    if (!json || json.status !== true || !Array.isArray(json.data && json.data.jadwal)) {
      throw new Error('Format jadwal tidak dikenal');
    }
    lokasi = json.data.lokasi || lokasi;
    for (const j of json.data.jadwal) {
      if (!j || !j.date || !HHMM.test(j.subuh || '') || !HHMM.test(j.terbit || '') ||
          !HHMM.test(j.dzuhur || '') || !HHMM.test(j.ashar || '') ||
          !HHMM.test(j.maghrib || '') || !HHMM.test(j.isya || '')) {
        continue;
      }
      saveScheduleDay({
        date: j.date,
        fajr: j.subuh,
        sunrise: j.terbit,
        dhuhr: j.dzuhur,
        asr: j.ashar,
        maghrib: j.maghrib,
        isha: j.isya,
        source: 'kemenag'
      });
      total++;
    }
  }
  if (total === 0) throw new Error('Tidak ada jadwal valid dari API');
  setSetting('schedule_last_sync', new Date().toISOString());
  if (lokasi) setSetting('schedule_city_name', lokasi);
  return { synced: total, lokasi };
}

module.exports = { syncSchedule };
