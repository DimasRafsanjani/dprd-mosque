import axios from 'axios';
import {
  DEFAULT_SETTINGS,
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_FRIDAY,
  DEFAULT_QUOTE,
  DEFAULT_WALLPAPERS
} from './offlineData';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://mosque.dimassraf.space';

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
