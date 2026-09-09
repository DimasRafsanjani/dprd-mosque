import axios from 'axios';
import {
  DEFAULT_SETTINGS,
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_FRIDAY,
  DEFAULT_QUOTE,
  DEFAULT_WALLPAPERS
} from './offlineData';

// Same-origin default ('') agar dev local & prod yang serve frontend dari backend
// yang sama tidak kena CORS. Untuk APK/Capacitor (tanpa origin web), isi via
// VITE_API_URL saat build (lihat script build:apk yang pakai --mode apk).
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 3000, // 3 detik timeout agar cepat fallback saat offline
});

// Fallback registry untuk fresh-install saat offline total
function getOfflineFallbackData(url?: string): any {
  if (!url) return null;
  if (url.includes('/api/settings')) return DEFAULT_SETTINGS;
  if (url.includes('/api/announcements')) return DEFAULT_ANNOUNCEMENTS;
  if (url.includes('/api/friday')) return DEFAULT_FRIDAY;
  if (url.includes('/api/quote')) return DEFAULT_QUOTE;
  if (url.includes('/api/wallpapers')) return DEFAULT_WALLPAPERS;
  return null;
}

api.interceptors.request.use((config) => {
  if (config.method?.toUpperCase() === 'GET' && typeof navigator !== 'undefined' && !navigator.onLine) {
    const url = config.url;
    if (url) {
      const cached = localStorage.getItem(`cache_${url}`);
      if (cached) {
        try {
          return Promise.reject({
            config,
            isOfflineFastBypass: true,
            cachedData: JSON.parse(cached)
          });
        } catch (_) {}
      }
      const fallback = getOfflineFallbackData(url);
      if (fallback) {
        return Promise.reject({
          config,
          isOfflineFastBypass: true,
          cachedData: fallback
        });
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Cache GET requests yang berhasil
    if (response.config.method?.toUpperCase() === 'GET') {
      const url = response.config.url;
      if (url && response.data) {
        try {
          localStorage.setItem(`cache_${url}`, JSON.stringify(response.data));
        } catch (e) {
          console.warn('[Cache] LocalStorage full or unavailable', e);
        }
      }
    }
    return response;
  },
  (error) => {
    // Sesi admin berakhir/dicabut: lempar ke layar login seketika,
    // jangan tunggu user menekan Simpan. Login screen sendiri dikecualikan
    // (401 di sana berarti PIN salah, bukan sesi habis).
    const url401 = error?.config?.url || '';
    if (
      error?.response?.status === 401 &&
      url401.includes('/api/admin') &&
      !url401.includes('/api/admin/login') &&
      typeof window !== 'undefined'
    ) {
      try { localStorage.removeItem('token'); } catch (_) {}
      window.dispatchEvent(new CustomEvent('admin-unauthorized'));
    }

    if (error?.isOfflineFastBypass && error?.cachedData) {
      return Promise.resolve({
        data: error.cachedData,
        status: 200,
        statusText: 'OK (Instant Offline Bypass)',
        headers: {},
        config: error.config,
        isCached: true
      });
    }

    const url = error.config?.url;
    if (url && error.config?.method?.toUpperCase() === 'GET') {
      // 1. Coba ambil dari localStorage cache
      const cached = localStorage.getItem(`cache_${url}`);
      if (cached) {
        try {
          return Promise.resolve({
            data: JSON.parse(cached),
            status: 200,
            statusText: 'OK (From Local Cache)',
            headers: {},
            config: error.config,
            isCached: true
          });
        } catch (e) {
          console.error('[Cache] Parse error', e);
        }
      }

      // 2. Jika belum ada cache (Fresh install saat offline), gunakan default offline data
      const fallback = getOfflineFallbackData(url);
      if (fallback) {
        return Promise.resolve({
          data: fallback,
          status: 200,
          statusText: 'OK (From Built-in Offline Defaults)',
          headers: {},
          config: error.config,
          isFallback: true
        });
      }
    }

    return Promise.reject(error);
  }
);

export default api;
