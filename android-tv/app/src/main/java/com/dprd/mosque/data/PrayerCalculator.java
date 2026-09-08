package com.dprd.mosque.data;

import com.batoulapps.adhan.CalculationMethod;
import com.batoulapps.adhan.CalculationParameters;
import com.batoulapps.adhan.Coordinates;
import com.batoulapps.adhan.Madhab;
import com.batoulapps.adhan.PrayerTimes;
import com.batoulapps.adhan.data.DateComponents;
import com.dprd.mosque.data.model.Models;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

public class PrayerCalculator {

    private final Models.PrayerSettings settings;
    private final SimpleDateFormat timeFormat;

    public PrayerCalculator(Models.PrayerSettings settings) {
        this.settings = settings != null ? settings : new Models.PrayerSettings();
        this.timeFormat = new SimpleDateFormat("HH:mm", new Locale("id", "ID"));
        this.timeFormat.setTimeZone(TimeZone.getTimeZone(this.settings.timezone != null ? this.settings.timezone : "Asia/Jakarta"));
    }

    private CalculationParameters getCalculationParameters() {
        CalculationParameters params;
        String method = settings.calculationMethod != null ? settings.calculationMethod : "MuslimWorldLeague";
        switch (method) {
            case "Egyptian":
                params = CalculationMethod.EGYPTIAN.getParameters();
                break;
            case "Karachi":
                params = CalculationMethod.KARACHI.getParameters();
                break;
            case "UmmAlQura":
                params = CalculationMethod.UMM_AL_QURA.getParameters();
                break;
            case "Dubai":
                params = CalculationMethod.DUBAI.getParameters();
                break;
            case "Qatar":
                params = CalculationMethod.QATAR.getParameters();
                break;
            case "Kuwait":
                params = CalculationMethod.KUWAIT.getParameters();
                break;
            case "Singapore":
                params = CalculationMethod.SINGAPORE.getParameters();
                break;
            case "NorthAmerica":
                params = CalculationMethod.NORTH_AMERICA.getParameters();
                break;
            case "Tehran":
            case "MuslimWorldLeague":
            default:
                params = CalculationMethod.MUSLIM_WORLD_LEAGUE.getParameters();
                break;
        }

        params.madhab = "Hanafi".equalsIgnoreCase(settings.madhab) ? Madhab.HANAFI : Madhab.SHAFI;
        return params;
    }

    public PrayerTimes calculate(Date date) {
        double lat = -6.9175;
        double lng = 107.6191;
        try {
            if (settings.latitude != null) lat = Double.parseDouble(settings.latitude);
            if (settings.longitude != null) lng = Double.parseDouble(settings.longitude);
        } catch (Exception ignored) {}

        Coordinates coordinates = new Coordinates(lat, lng);
        DateComponents dateComponents = DateComponents.from(date);
        return new PrayerTimes(coordinates, dateComponents, getCalculationParameters());
    }

    public List<Models.PrayerItem> getPrayerList(PrayerTimes prayerTimes, String activeKey) {
        List<Models.PrayerItem> list = new ArrayList<>();
        list.add(new Models.PrayerItem("fajr", "Subuh", prayerTimes.fajr, timeFormat.format(prayerTimes.fajr), "fajr".equals(activeKey)));
        list.add(new Models.PrayerItem("sunrise", "Syuruq", prayerTimes.sunrise, timeFormat.format(prayerTimes.sunrise), "sunrise".equals(activeKey)));
        list.add(new Models.PrayerItem("dhuhr", "Dzuhur", prayerTimes.dhuhr, timeFormat.format(prayerTimes.dhuhr), "dhuhr".equals(activeKey)));
        list.add(new Models.PrayerItem("asr", "Ashar", prayerTimes.asr, timeFormat.format(prayerTimes.asr), "asr".equals(activeKey)));
        list.add(new Models.PrayerItem("maghrib", "Maghrib", prayerTimes.maghrib, timeFormat.format(prayerTimes.maghrib), "maghrib".equals(activeKey)));
        list.add(new Models.PrayerItem("isha", "Isya", prayerTimes.isha, timeFormat.format(prayerTimes.isha), "isha".equals(activeKey)));
        return list;
    }

    public Models.NextPrayerInfo getNextPrayer(Date now) {
        PrayerTimes todayTimes = calculate(now);
        String[] keys = new String[]{"fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"};
        String[] names = new String[]{"Subuh", "Syuruq", "Dzuhur", "Ashar", "Maghrib", "Isya"};
        Date[] times = new Date[]{todayTimes.fajr, todayTimes.sunrise, todayTimes.dhuhr, todayTimes.asr, todayTimes.maghrib, todayTimes.isha};

        for (int i = 0; i < keys.length; i++) {
            Date pt = times[i];
            if (now.before(pt)) {
                long diffSec = (pt.getTime() - now.getTime()) / 1000;
                return new Models.NextPrayerInfo(keys[i], names[i], pt, timeFormat.format(pt), diffSec, formatCountdown(diffSec));
            }
        }

        // Jika semua sholat hari ini lewat, target berikutnya Subuh besok
        Calendar cal = Calendar.getInstance();
        cal.setTime(now);
        cal.add(Calendar.DAY_OF_YEAR, 1);
        PrayerTimes tomorrowTimes = calculate(cal.getTime());
        long diffSec = (tomorrowTimes.fajr.getTime() - now.getTime()) / 1000;
        return new Models.NextPrayerInfo("fajr", "Subuh", tomorrowTimes.fajr, timeFormat.format(tomorrowTimes.fajr), diffSec, formatCountdown(diffSec));
    }

    public Models.PrayerItem getCurrentPrayer(Date now) {
        PrayerTimes todayTimes = calculate(now);
        String[] keys = new String[]{"fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"};
        String[] names = new String[]{"Subuh", "Syuruq", "Dzuhur", "Ashar", "Maghrib", "Isya"};
        Date[] times = new Date[]{todayTimes.fajr, todayTimes.sunrise, todayTimes.dhuhr, todayTimes.asr, todayTimes.maghrib, todayTimes.isha};

        Models.PrayerItem current = null;
        for (int i = 0; i < keys.length; i++) {
            if (!now.before(times[i])) {
                current = new Models.PrayerItem(keys[i], names[i], times[i], timeFormat.format(times[i]), false);
            }
        }
        return current;
    }

    public int getIqamahMinutes(String prayerKey) {
        try {
            switch (prayerKey) {
                case "fajr": return Integer.parseInt(settings.iqamahFajr != null ? settings.iqamahFajr : "10");
                case "dhuhr": return Integer.parseInt(settings.iqamahDhuhr != null ? settings.iqamahDhuhr : "10");
                case "asr": return Integer.parseInt(settings.iqamahAsr != null ? settings.iqamahAsr : "10");
                case "maghrib": return Integer.parseInt(settings.iqamahMaghrib != null ? settings.iqamahMaghrib : "10");
                case "isha": return Integer.parseInt(settings.iqamahIsha != null ? settings.iqamahIsha : "10");
                default: return 10;
            }
        } catch (Exception e) {
            return 10;
        }
    }

    public Models.ScreenStatusResult getScreenState(Date now) {
        Models.PrayerItem currentPrayer = getCurrentPrayer(now);
        Models.NextPrayerInfo nextPrayer = getNextPrayer(now);

        int preAlertMinutes = 5;
        try {
            if (settings.adhanPreAlertMinutes != null) {
                preAlertMinutes = Integer.parseInt(settings.adhanPreAlertMinutes);
            }
        } catch (Exception ignored) {}

        if (currentPrayer != null && !"sunrise".equals(currentPrayer.key)) {
            long iqamahDurationMs = getIqamahMinutes(currentPrayer.key) * 60 * 1000L;
            long adhanDurationMs = 90 * 1000L; // 90 detik adzan
            long elapsedMs = now.getTime() - currentPrayer.time.getTime();

            // 1. Sedang Adzan
            if (elapsedMs >= 0 && elapsedMs < adhanDurationMs) {
                long secRemaining = (adhanDurationMs - elapsedMs) / 1000;
                return new Models.ScreenStatusResult(Models.ScreenState.ADHAN, "Adzan " + currentPrayer.name + " (" + secRemaining + " dtk)");
            }

            // 2. Hitung Mundur Iqomah
            long timeToIqamah = (currentPrayer.time.getTime() + iqamahDurationMs) - now.getTime();
            if (timeToIqamah > 0 && elapsedMs >= adhanDurationMs) {
                long sec = timeToIqamah / 1000;
                return new Models.ScreenStatusResult(Models.ScreenState.IQAMAH_COUNTDOWN, "Iqomah " + currentPrayer.name + " dlm " + formatCountdown(sec));
            }

            // 3. Waktu Sholat Berjamaah (15 menit setelah iqomah selesai)
            long prayerDurationMs = 15 * 60 * 1000L;
            long elapsedAfterIqamah = now.getTime() - (currentPrayer.time.getTime() + iqamahDurationMs);
            if (elapsedAfterIqamah >= 0 && elapsedAfterIqamah < prayerDurationMs) {
                return new Models.ScreenStatusResult(Models.ScreenState.PRAYER_TIME, "Luruskan & Rapatkan Shaf");
            }
        }

        // 4. Peringatan Menjelang Adzan
        if (!"sunrise".equals(nextPrayer.key) && nextPrayer.remainingSeconds > 0 && nextPrayer.remainingSeconds <= (preAlertMinutes * 60L)) {
            return new Models.ScreenStatusResult(Models.ScreenState.PRE_ADHAN, "Menjelang " + nextPrayer.name + " (" + nextPrayer.remainingText + ")");
        }

        return new Models.ScreenStatusResult(Models.ScreenState.NORMAL, "");
    }

    private String formatCountdown(long secondsTotal) {
        long h = secondsTotal / 3600;
        long m = (secondsTotal % 3600) / 60;
        long s = secondsTotal % 60;
        if (h > 0) {
            return String.format(Locale.getDefault(), "%d jam %d menit", h, m);
        } else if (m > 0) {
            return String.format(Locale.getDefault(), "%d menit %d dtk", m, s);
        } else {
            return String.format(Locale.getDefault(), "%d dtk", s);
        }
    }
}
