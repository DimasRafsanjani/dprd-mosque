package com.dprd.mosque.data;

import android.content.Context;
import android.content.SharedPreferences;
import com.dprd.mosque.data.model.Models;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

public class PreferencesManager {
    private static final String PREF_NAME = "dprd_mosque_tv_prefs";
    private static final String KEY_SETTINGS = "key_settings";
    private static final String KEY_ANNOUNCEMENTS = "key_announcements";
    private static final String KEY_FRIDAY = "key_friday";
    private static final String KEY_QUOTE = "key_quote";

    private static SharedPreferences prefs;
    private static final Gson gson = new Gson();

    public static void init(Context context) {
        prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    public static void saveSettings(Models.PrayerSettings settings) {
        prefs.edit().putString(KEY_SETTINGS, gson.toJson(settings)).apply();
    }

    public static Models.PrayerSettings getSettings() {
        String json = prefs.getString(KEY_SETTINGS, null);
        if (json != null && !json.isEmpty()) {
            try {
                Models.PrayerSettings s = gson.fromJson(json, Models.PrayerSettings.class);
                return s != null ? s : new Models.PrayerSettings();
            } catch (Exception e) {
                return new Models.PrayerSettings();
            }
        }
        return new Models.PrayerSettings();
    }

    public static void saveAnnouncements(List<Models.Announcement> list) {
        prefs.edit().putString(KEY_ANNOUNCEMENTS, gson.toJson(list)).apply();
    }

    public static List<Models.Announcement> getAnnouncements() {
        String json = prefs.getString(KEY_ANNOUNCEMENTS, null);
        if (json != null && !json.isEmpty()) {
            try {
                Type type = new TypeToken<List<Models.Announcement>>() {}.getType();
                List<Models.Announcement> res = gson.fromJson(json, type);
                return res != null ? res : new ArrayList<>();
            } catch (Exception e) {
                return new ArrayList<>();
            }
        }
        return new ArrayList<>();
    }

    public static void saveFriday(Models.FridayInfo info) {
        if (info != null) {
            prefs.edit().putString(KEY_FRIDAY, gson.toJson(info)).apply();
        } else {
            prefs.edit().remove(KEY_FRIDAY).apply();
        }
    }

    public static Models.FridayInfo getFriday() {
        String json = prefs.getString(KEY_FRIDAY, null);
        if (json != null && !json.isEmpty()) {
            try {
                return gson.fromJson(json, Models.FridayInfo.class);
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }

    public static void saveQuote(Models.Quote quote) {
        if (quote != null) {
            prefs.edit().putString(KEY_QUOTE, gson.toJson(quote)).apply();
        }
    }

    public static Models.Quote getQuote() {
        String json = prefs.getString(KEY_QUOTE, null);
        if (json != null && !json.isEmpty()) {
            try {
                return gson.fromJson(json, Models.Quote.class);
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }
}
