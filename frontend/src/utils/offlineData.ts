import type { PrayerSettings } from './prayer';

export const DEFAULT_SETTINGS: PrayerSettings = {
  mosque_name: 'MASJID ASY SYURA',
  mosque_subtitle: 'DPRD Provinsi Jawa Barat',
  mosque_address: 'Jl. Diponegoro No. 27 Bandung',
  latitude: '-6.9175',
  longitude: '107.6191',
  timezone: 'Asia/Jakarta',
  calculation_method: 'Kemenag',
  madhab: 'Shafi',
  ikhtiyat: '2',
  running_text_speed: '10',
  bg_rotation_interval: '30',
  hijri_adjustment: '0',
  adhan_pre_alert_minutes: '5',
  iqamah_fajr: '10',
  iqamah_dhuhr: '10',
  iqamah_asr: '10',
  iqamah_maghrib: '10',
  iqamah_isha: '10',
  slideshow_mode: 'auto',
  adjust_fajr: '0',
  adjust_sunrise: '-7',
  adjust_dhuhr: '0',
  adjust_asr: '0',
  adjust_maghrib: '5',
  adjust_isha: '1'
};

export const DEFAULT_ANNOUNCEMENTS = [
  { id: 1, text: 'Selamat Datang di Masjid Asy Syura DPRD Provinsi Jawa Barat' },
  { id: 2, text: 'Luruskan dan Rapatkan Shaf Saat Sholat Berjamaah' },
  { id: 3, text: 'Jagalah Kebersihan, Ketertiban, dan Kesucian Masjid' },
  { id: 4, text: 'Harap Matikan atau Nonaktifkan Nada Dering Handphone Selama di Dalam Masjid' }
];

export const DEFAULT_FRIDAY = {
  khatib_name: 'Ust. H. Ahmad Fauzi, M.Ag',
  muadzin_name: 'Ust. Bilal Al-Habsyi',
  balance: 14500000,
  income: 3200000,
  expense: 1500000
};

export const DEFAULT_QUOTE = {
  id: 1,
  text_arabic: 'إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا',
  text_translation: 'Sesungguhnya shalat itu adalah fardhu yang ditentukan waktunya atas orang-orang yang beriman.',
  source: 'QS. An-Nisa: 103'
};

export const DEFAULT_WALLPAPERS = [
  { filename: 'base-wallpaper.png', url: '/assets/base-wallpaper.png' }
];
