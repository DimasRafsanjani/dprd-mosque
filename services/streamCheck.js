// Validasi URL stream YouTube via oEmbed (tanpa API key).
// - Video ada/could-embed  -> valid
// - Video dihapus/private/URL ngawur (kasus "This video isn't available anymore") -> invalid
// - Bukan URL video spesifik (live_stream?channel=, iframe non-YouTube, kosong) -> unknown (dianggap valid)
// Hasil disimpan di settings mecca_stream_valid (1/0) + mecca_stream_checked_at.
const { getSetting, setSetting } = require('../db/database');

function extractSrc(url) {
  if (!url) return '';
  const s = String(url).trim();
  if (s.includes('<iframe')) {
    const m = s.match(/src="([^"]+)"/);
    return m ? m[1] : '';
  }
  return s;
}

function extractVideoId(src) {
  if (!src || !/youtube\.com|youtu\.be/.test(src)) return null;
  if (src.includes('live_stream')) return null; // channel-mode, tidak bisa dicek
  let m = src.match(/[?&]v=([^&#]+)/);
  if (m) return m[1];
  m = src.match(/youtu\.be\/([^?&#/]+)/);
  if (m) return m[1];
  m = src.match(/\/embed\/([^?&#/]+)/);
  if (m) return m[1];
  m = src.match(/\/live\/([^?&#/]+)/);
  if (m) return m[1];
  return null;
}

async function checkYouTubeUrl(rawUrl) {
  const src = extractSrc(rawUrl);
  if (!src) return { status: 'empty' };
  const videoId = extractVideoId(src);
  if (!videoId) return { status: 'unknown' }; // bukan video spesifik / non-YouTube
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + videoId)}&format=json`,
      { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    return res.ok ? { status: 'valid', videoId } : { status: 'invalid', videoId, http: res.status };
  } catch (e) {
    return { status: 'unknown', videoId, error: e.message }; // jaringan gagal -> jangan vonis invalid
  } finally {
    clearTimeout(timer);
  }
}

// Cek URL yang tersimpan di settings; tulis hasilnya kembali ke settings.
// Dipanggil fire-and-forget (hemat: skip bila baru dicek < 1 jam).
async function recheckStoredStream(force = false) {
  const url = getSetting('mecca_stream_url');
  if (!url) {
    setSetting('mecca_stream_valid', '1');
    return { status: 'empty' };
  }
  if (!force) {
    const at = getSetting('mecca_stream_checked_at');
    if (at && Date.now() - new Date(at).getTime() < 3600 * 1000) {
      return { status: 'cached' };
    }
  }
  const r = await checkYouTubeUrl(url);
  if (r.status === 'valid' || r.status === 'unknown' || r.status === 'empty') {
    setSetting('mecca_stream_valid', '1');
  } else if (r.status === 'invalid') {
    setSetting('mecca_stream_valid', '0');
  }
  setSetting('mecca_stream_checked_at', new Date().toISOString());
  return r;
}

module.exports = { checkYouTubeUrl, recheckStoredStream };
