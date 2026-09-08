package com.dprd.mosque.data.model;

import com.google.gson.annotations.SerializedName;
import java.util.Date;

public class Models {

    public static class PrayerSettings {
        @SerializedName("mosque_name") public String mosqueName = "MASJID ASY SYURA";
        @SerializedName("mosque_subtitle") public String mosqueSubtitle = "DPRD Provinsi Jawa Barat";
        @SerializedName("mosque_address") public String mosqueAddress = "Jl. Diponegoro No. 27 Bandung";
        @SerializedName("latitude") public String latitude = "-6.9175";
        @SerializedName("longitude") public String longitude = "107.6191";
        @SerializedName("timezone") public String timezone = "Asia/Jakarta";
        @SerializedName("calculation_method") public String calculationMethod = "MuslimWorldLeague";
        @SerializedName("madhab") public String madhab = "Shafi";
        @SerializedName("hijri_adjustment") public String hijriAdjustment = "0";
        @SerializedName("adhan_pre_alert_minutes") public String adhanPreAlertMinutes = "5";
        @SerializedName("iqamah_fajr") public String iqamahFajr = "10";
        @SerializedName("iqamah_dhuhr") public String iqamahDhuhr = "10";
        @SerializedName("iqamah_asr") public String iqamahAsr = "10";
        @SerializedName("iqamah_maghrib") public String iqamahMaghrib = "10";
        @SerializedName("iqamah_isha") public String iqamahIsha = "10";
        @SerializedName("running_text_speed") public String runningTextSpeed = "50";
        @SerializedName("bg_rotation_interval") public String bgRotationInterval = "30";
    }

    public static class Announcement {
        public Integer id;
        public String title;
        public String content;
        @SerializedName("is_active") public Integer isActive = 1;
    }

    public static class FridayInfo {
        public String date;
        public String khatib;
        public String imam;
        public String muadzin;
        public String title;
    }

    public static class Quote {
        public Integer id;
        public String arabic;
        @SerializedName("text_translation") public String textTranslation;
        public String source;
    }

    public static class Wallpaper {
        public Integer id;
        public String filename;
        public String url;
        @SerializedName("is_active") public Integer isActive = 1;
    }

    public static class PrayerItem {
        public final String key;
        public final String name;
        public final Date time;
        public final String timeFormatted;
        public final boolean isActive;

        public PrayerItem(String key, String name, Date time, String timeFormatted, boolean isActive) {
            this.key = key;
            this.name = name;
            this.time = time;
            this.timeFormatted = timeFormatted;
            this.isActive = isActive;
        }
    }

    public enum ScreenState {
        NORMAL,
        PRE_ADHAN,
        ADHAN,
        IQAMAH_COUNTDOWN,
        PRAYER_TIME
    }

    public static class NextPrayerInfo {
        public final String key;
        public final String name;
        public final Date time;
        public final String timeFormatted;
        public final long remainingSeconds;
        public final String remainingText;

        public NextPrayerInfo(String key, String name, Date time, String timeFormatted, long remainingSeconds, String remainingText) {
            this.key = key;
            this.name = name;
            this.time = time;
            this.timeFormatted = timeFormatted;
            this.remainingSeconds = remainingSeconds;
            this.remainingText = remainingText;
        }
    }

    public static class ScreenStatusResult {
        public final ScreenState state;
        public final String statusText;

        public ScreenStatusResult(ScreenState state, String statusText) {
            this.state = state;
            this.statusText = statusText;
        }
    }
}
