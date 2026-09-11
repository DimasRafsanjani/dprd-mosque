import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';

export const PRAYER_NAMES: Record<string, string> = {
  fajr: 'Subuh',
  sunrise: 'Syuruq',
  dhuhr: 'Dzuhur',
  asr: 'Ashar',
  maghrib: 'Maghrib',
  isha: 'Isya'
};

export const PRAYER_KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

export interface PrayerSettings {
  latitude?: string;
  longitude?: string;
  bg_rotation_interval?: string;
  running_text_speed?: string;
  slideshow_mode?: string;
  calculation_method?: string;
  madhab?: string;
  timezone?: string;
  adhan_pre_alert_minutes?: string;
  [key: string]: any;
}

export function getCalculationParams(settings: PrayerSettings) {
  const method = settings.calculation_method || 'Kemenag';
  let params;

  switch (method) {
    // Kemenag RI: Subuh 20°, Isya 18°, Ashar Syafi'i (bayangan 1x)
    case 'Kemenag':
      params = CalculationMethod.MuslimWorldLeague();
      params.fajrAngle = 20;
      params.ishaAngle = 18;
      break;
    case 'MuslimWorldLeague': params = CalculationMethod.MuslimWorldLeague(); break;
    case 'Egyptian': params = CalculationMethod.Egyptian(); break;
    case 'Karachi': params = CalculationMethod.Karachi(); break;
    case 'UmmAlQura': params = CalculationMethod.UmmAlQura(); break;
    case 'Dubai': params = CalculationMethod.Dubai(); break;
    case 'Qatar': params = CalculationMethod.Qatar(); break;
    case 'Kuwait': params = CalculationMethod.Kuwait(); break;
    case 'Singapore': params = CalculationMethod.Singapore(); break;
    case 'NorthAmerica': params = CalculationMethod.NorthAmerica(); break;
    case 'Tehran': params = CalculationMethod.Tehran(); break;
    default: params = CalculationMethod.MuslimWorldLeague();
  }

  if (settings.madhab === 'Hanafi') {
    params.madhab = Madhab.Hanafi;
  } else {
    params.madhab = Madhab.Shafi;
  }
  return params;
}

// Ikhtiyat Kemenag: +2 menit pengaman (tidak berlaku untuk Syuruq/Terbit).
// Residu = sisa selisih basis (20°/18° + ikhtiyat) vs Kemenag Kota Bandung,
// diukur di 3 musim (Jun/Sep/Des 2026) — error maks ±1 menit setahun.
export const ADJUST_KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export const IKHTIYAT_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export const DEFAULT_ADJUST: Record<string, string> = {
  adjust_fajr: '0',
  adjust_sunrise: '-7',
  adjust_dhuhr: '0',
  adjust_asr: '0',
  adjust_maghrib: '5',
  adjust_isha: '1'
};

export function calculatePrayerTimes(settings: PrayerSettings, date: Date = new Date()) {
  const lat = parseFloat(settings.latitude || '-6.9175');
  const lng = parseFloat(settings.longitude || '107.6191');
  const coordinates = new Coordinates(lat, lng);
  const params = getCalculationParams(settings);
  const pt = new PrayerTimes(coordinates, date, params);
  const ikhtiyat = parseInt(settings.ikhtiyat ?? '2', 10) || 0;
  if (ikhtiyat) {
    for (const key of IKHTIYAT_KEYS) {
      (pt as any)[key] = new Date((pt as any)[key].getTime() + ikhtiyat * 60 * 1000);
    }
  }
  for (const key of ADJUST_KEYS) {
    const off = parseInt(settings[`adjust_${key}`] ?? DEFAULT_ADJUST[`adjust_${key}`] ?? '0', 10);
    if (off) {
      (pt as any)[key] = new Date((pt as any)[key].getTime() + off * 60 * 1000);
    }
  }
  return pt;
}

export function formatTime(date: Date, timezone = 'Asia/Jakarta') {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone
  }).replace('.', ':');
}

const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi'ul Awwal", "Rabi'ul Akhir",
  'Jumadil Awwal', 'Jumadil Akhir', 'Rajab', "Sya'ban",
  'Ramadhan', 'Syawwal', "Dzulqa'dah", 'Dzulhijjah'
];

export function getTabularHijriDate(date: Date) {
  const d = new Date(date);
  let day = d.getDate();
  let month = d.getMonth() + 1;
  let year = d.getFullYear();

  if (month < 3) {
    year -= 1;
    month += 12;
  }

  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;

  let i = Math.floor(jd) - 1948440 + 10632;
  let n = Math.floor((i - 1) / 10631);
  i = i - 10631 * n + 354;
  let j = (Math.floor((10985 - i) / 5316)) * (Math.floor((50 * i) / 17719)) + (Math.floor(i / 5670)) * (Math.floor((43 * i) / 15238));
  i = i - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
  let m = Math.floor((24 * i) / 709);
  let d2 = i - Math.floor((709 * m) / 24);
  let y2 = 30 * n + j - 30;

  const monthIndex = Math.max(0, Math.min(11, m - 1));
  return { day: d2, monthIndex, year: y2 };
}

export function formatHijriDate(date: Date = new Date(), adjustment = 0): string {
  const targetDate = new Date(date);
  if (adjustment !== 0) {
    targetDate.setDate(targetDate.getDate() + adjustment);
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });
    const parts = formatter.formatToParts(targetDate);
    let day = '';
    let month = '';
    let year = '';

    for (const part of parts) {
      if (part.type === 'day') day = part.value;
      if (part.type === 'month') month = part.value;
      if (part.type === 'year') year = part.value;
    }

    const monthNum = parseInt(month, 10);
    if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12 && day && year) {
      const monthName = HIJRI_MONTHS[monthNum - 1];
      return `${day} ${monthName} ${year} H`;
    }
  } catch (e) {
    // Fallback to tabular calculation if Intl islamic calendar is not supported
  }

  const tab = getTabularHijriDate(targetDate);
  const monthName = HIJRI_MONTHS[tab.monthIndex] || 'Safar';
  return `${tab.day} ${monthName} ${tab.year} H`;
}

export function getCountdown(targetTime: Date, now: Date = new Date()) {
  const diff = targetTime.getTime() - now.getTime();

  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, total: 0 };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, total: diff };
}

export function formatCountdown(countdown: { hours: number; minutes: number; seconds: number }) {
  const h = String(countdown.hours).padStart(2, '0');
  const m = String(countdown.minutes).padStart(2, '0');
  const s = String(countdown.seconds).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function formatCountdownText(countdown: { hours: number; minutes: number; seconds: number }) {
  if (countdown.hours > 0) {
    return `${countdown.hours} jam ${countdown.minutes} menit`;
  }
  if (countdown.minutes > 0) {
    return `${countdown.minutes} menit ${countdown.seconds} detik`;
  }
  return `${countdown.seconds} detik`;
}

// Jadwal Kemenag tersinkron (HH:MM WIB per tanggal). Jika ada untuk tanggal
// yang diminta, dipakai plek (sudah final dari Kemenag); jika tidak ada
// (belum sync / offline lama) jatuh ke hitungan lokal sebagai fallback.
export interface DaySchedule {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function timesFromSchedule(row: DaySchedule, date: Date): Record<string, Date> | null {
  try {
    const out: Record<string, Date> = {};
    for (const key of ADJUST_KEYS) {
      const v = (row as any)[key];
      if (typeof v !== 'string' || !/^\d{2}:\d{2}$/.test(v)) return null;
      const [h, m] = v.split(':').map(Number);
      const d = new Date(date);
      d.setHours(h, m, 0, 0);
      out[key] = d;
    }
    return out;
  } catch {
    return null;
  }
}

export function getEffectivePrayerTimes(
  settings: PrayerSettings,
  date: Date = new Date(),
  schedules?: Record<string, DaySchedule>
): PrayerTimes {
  const pt = calculatePrayerTimes(settings, date);
  const over = schedules?.[toDateKey(date)] ? timesFromSchedule(schedules[toDateKey(date)], date) : null;
  if (over) {
    for (const key of ADJUST_KEYS) {
      (pt as any)[key] = over[key];
    }
  }
  return pt;
}

export function getNextPrayer(prayerTimes: PrayerTimes, settings: PrayerSettings, now: Date = new Date(), schedules?: Record<string, DaySchedule>) {
  const times: Record<string, Date> = {
    fajr: prayerTimes.fajr,
    sunrise: prayerTimes.sunrise,
    dhuhr: prayerTimes.dhuhr,
    asr: prayerTimes.asr,
    maghrib: prayerTimes.maghrib,
    isha: prayerTimes.isha
  };

  for (const key of PRAYER_KEYS) {
    if (now < times[key]) {
      return { key, name: PRAYER_NAMES[key], time: times[key] };
    }
  }

  // All prayers passed, next is fajr tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimes = getEffectivePrayerTimes(settings, tomorrow, schedules);
  return { key: 'fajr', name: PRAYER_NAMES.fajr, time: tomorrowTimes.fajr, isTomorrow: true };
}

export function getCurrentPrayer(prayerTimes: PrayerTimes, now: Date = new Date()) {
  const times: Record<string, Date> = {
    fajr: prayerTimes.fajr,
    sunrise: prayerTimes.sunrise,
    dhuhr: prayerTimes.dhuhr,
    asr: prayerTimes.asr,
    maghrib: prayerTimes.maghrib,
    isha: prayerTimes.isha
  };

  let current = null;
  for (const key of PRAYER_KEYS) {
    if (now >= times[key]) {
      current = { key, name: PRAYER_NAMES[key], time: times[key] };
    }
  }
  return current;
}

export function getIqamahTime(prayerKey: string, prayerTime: Date, settings: PrayerSettings) {
  const offsetKey = `iqamah_${prayerKey}`;
  const offsetMinutes = parseInt(settings[offsetKey] || '10');
  return new Date(prayerTime.getTime() + offsetMinutes * 60 * 1000);
}

export type PrayerState = 'normal' | 'pre-adhan' | 'adhan' | 'iqamah-countdown' | 'iqamah';

export function getPrayerState(prayerTimes: PrayerTimes, settings: PrayerSettings, now: Date = new Date(), schedules?: Record<string, DaySchedule>) {
  const nextPrayer = getNextPrayer(prayerTimes, settings, now, schedules);
  const currentPrayer = getCurrentPrayer(prayerTimes, now);
  const preAlertMinutes = parseInt(settings.adhan_pre_alert_minutes || '5');

  // Skip pre-adhan/adhan/iqamah logic for sunrise (Syuruq)
  if (currentPrayer && currentPrayer.key !== 'sunrise') {
    const iqamahTime = getIqamahTime(currentPrayer.key, currentPrayer.time, settings);
    const timeSinceAdhan = now.getTime() - currentPrayer.time.getTime();
    const timeToIqamah = iqamahTime.getTime() - now.getTime();

    if (timeSinceAdhan >= 0 && timeSinceAdhan < 60 * 1000) {
      return { state: 'adhan' as PrayerState, prayer: currentPrayer, countdown: getCountdown(iqamahTime, now) };
    }

    if (timeSinceAdhan >= 60 * 1000 && timeToIqamah > 30 * 1000) {
      return { state: 'iqamah-countdown' as PrayerState, prayer: currentPrayer, iqamahTime, countdown: getCountdown(iqamahTime, now) };
    }

    if (Math.abs(timeToIqamah) <= 30 * 1000) {
      return { state: 'iqamah' as PrayerState, prayer: currentPrayer, iqamahTime };
    }
  }

  const timeToNext = nextPrayer.time.getTime() - now.getTime();
  if (nextPrayer.key !== 'sunrise' && timeToNext > 0 && timeToNext <= preAlertMinutes * 60 * 1000) {
    return { state: 'pre-adhan' as PrayerState, prayer: nextPrayer, countdown: getCountdown(nextPrayer.time, now) };
  }

  return { state: 'normal' as PrayerState, prayer: nextPrayer, countdown: getCountdown(nextPrayer.time, now) };
}
