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
  const method = settings.calculation_method || 'MuslimWorldLeague';
  let params;

  switch (method) {
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

export function calculatePrayerTimes(settings: PrayerSettings, date: Date = new Date()) {
  const lat = parseFloat(settings.latitude || '-6.9175');
  const lng = parseFloat(settings.longitude || '107.6191');
  const coordinates = new Coordinates(lat, lng);
  const params = getCalculationParams(settings);
  return new PrayerTimes(coordinates, date, params);
}

export function formatTime(date: Date, timezone = 'Asia/Jakarta') {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone
  }).replace('.', ':');
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

export function getNextPrayer(prayerTimes: PrayerTimes, settings: PrayerSettings, now: Date = new Date()) {
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
  const tomorrowTimes = calculatePrayerTimes(settings, tomorrow);
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

export function getPrayerState(prayerTimes: PrayerTimes, settings: PrayerSettings, now: Date = new Date()) {
  const nextPrayer = getNextPrayer(prayerTimes, settings, now);
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
