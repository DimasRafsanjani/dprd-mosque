package com.dprd.mosque.ui;

import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import com.dprd.mosque.R;
import com.dprd.mosque.data.PrayerCalculator;
import com.dprd.mosque.data.PreferencesManager;
import com.dprd.mosque.data.api.ApiClient;
import com.dprd.mosque.data.model.Models;
import com.dprd.mosque.databinding.ActivityMainBinding;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import retrofit2.Response;

public class MainActivity extends AppCompatActivity {

    private ActivityMainBinding binding;
    private Models.PrayerSettings currentSettings;
    private PrayerCalculator prayerCalc;

    private final SimpleDateFormat timeFormatHM = new SimpleDateFormat("HH:mm", new Locale("id", "ID"));
    private final SimpleDateFormat timeFormatS = new SimpleDateFormat(":ss", new Locale("id", "ID"));
    private final SimpleDateFormat gregorianFormat = new SimpleDateFormat("EEEE, d MMMM yyyy", new Locale("id", "ID"));

    private final List<String> hijriMonthNames = Arrays.asList(
            "Muharram", "Safar", "Rabi'ul Awwal", "Rabi'ul Akhir",
            "Jumadil Awwal", "Jumadil Akhir", "Rajab", "Sya'ban",
            "Ramadhan", "Syawwal", "Dzulqa'dah", "Dzulhijjah"
    );

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private ScheduledExecutorService syncExecutor;
    private Runnable tickerRunnable;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        // 1. Layar TV selalu menyala 24/7 (Keep Screen On)
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // 2. Fullscreen Immersive Mode (Tanpa status bar / nav bar)
        applyImmersiveFullscreen();

        // 3. Muat konfigurasi awal dari cache lokal
        currentSettings = PreferencesManager.getSettings();
        prayerCalc = new PrayerCalculator(currentSettings);
        applyMosqueInfo(currentSettings);
        updateRunningText();
        updateFridayOrQuote(PreferencesManager.getFriday(), PreferencesManager.getQuote());

        // 4. Jalankan Ticker 1 Detik (Mesin Jam & Sholat Offline)
        startOneSecondTicker();

        // 5. Jalankan Background Sync (Opsional saat internet aktif)
        startBackgroundSync();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveFullscreen();
        }
    }

    private void applyImmersiveFullscreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            // Deprecated on newer SDKs but required for Android TV running Android 7 - 10
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }
    }

    private void startOneSecondTicker() {
        tickerRunnable = new Runnable() {
            @Override
            public void run() {
                Date now = new Date();

                // Update Jam
                binding.tvClockHm.setText(timeFormatHM.format(now));
                binding.tvClockS.setText(timeFormatS.format(now));

                // Update Tanggal Masehi
                binding.tvDateGregorian.setText(gregorianFormat.format(now));

                // Update Tanggal Hijriah
                int adjustment = 0;
                try {
                    if (currentSettings.hijriAdjustment != null) {
                        adjustment = Integer.parseInt(currentSettings.hijriAdjustment);
                    }
                } catch (Exception ignored) {}
                binding.tvDateHijri.setText(calculateHijriDate(now, adjustment));

                // Hitung Jadwal Sholat & Countdown
                updatePrayerDisplay(now);

                mainHandler.postDelayed(this, 1000);
            }
        };
        mainHandler.post(tickerRunnable);
    }

    private void updatePrayerDisplay(Date now) {
        Models.NextPrayerInfo nextPrayer = prayerCalc.getNextPrayer(now);
        com.batoulapps.adhan.PrayerTimes todayTimes = prayerCalc.calculate(now);
        List<Models.PrayerItem> prayerList = prayerCalc.getPrayerList(todayTimes, nextPrayer.key);

        // Update Card Menuju Sholat Selanjutnya
        binding.tvNextPrayerTitle.setText(getString(R.string.towards_prayer, nextPrayer.name));
        binding.tvNextPrayerTime.setText(nextPrayer.timeFormatted);
        binding.tvNextPrayerCountdown.setText(getString(R.string.countdown_format, nextPrayer.remainingText));

        // Update 6 Card Waktu Sholat
        for (Models.PrayerItem item : prayerList) {
            View cardLayout = null;
            android.widget.TextView tvTime = null;

            switch (item.key) {
                case "fajr":
                    cardLayout = binding.cardFajr;
                    tvTime = binding.tvTimeFajr;
                    break;
                case "sunrise":
                    cardLayout = binding.cardSunrise;
                    tvTime = binding.tvTimeSunrise;
                    break;
                case "dhuhr":
                    cardLayout = binding.cardDhuhr;
                    tvTime = binding.tvTimeDhuhr;
                    break;
                case "asr":
                    cardLayout = binding.cardAsr;
                    tvTime = binding.tvTimeAsr;
                    break;
                case "maghrib":
                    cardLayout = binding.cardMaghrib;
                    tvTime = binding.tvTimeMaghrib;
                    break;
                case "isha":
                    cardLayout = binding.cardIsha;
                    tvTime = binding.tvTimeIsha;
                    break;
            }

            if (cardLayout != null && tvTime != null) {
                tvTime.setText(item.timeFormatted);
                if (item.isActive) {
                    cardLayout.setBackground(ContextCompat.getDrawable(this, R.drawable.bg_card_prayer_active));
                } else {
                    cardLayout.setBackground(ContextCompat.getDrawable(this, R.drawable.bg_card_prayer));
                }
            }
        }

        // Cek State Layar (Adzan, Iqomah, Sholat Berjamaah, Normal)
        Models.ScreenStatusResult screenStatus = prayerCalc.getScreenState(now);
        handleScreenState(screenStatus.state, screenStatus.statusText, nextPrayer.name);
    }

    private void handleScreenState(Models.ScreenState state, String statusText, String prayerName) {
        switch (state) {
            case ADHAN:
                binding.overlayAdhanIqamah.setVisibility(View.VISIBLE);
                binding.tvOverlayStatus.setText("SAATNYA ADZAN");
                binding.tvOverlayPrayerName.setText(prayerName.toUpperCase(Locale.getDefault()));
                binding.tvOverlayDetail.setText(statusText);
                break;
            case IQAMAH_COUNTDOWN:
                binding.overlayAdhanIqamah.setVisibility(View.VISIBLE);
                binding.tvOverlayStatus.setText("HITUNG MUNDUR IQOMAH");
                binding.tvOverlayPrayerName.setText(prayerName.toUpperCase(Locale.getDefault()));
                binding.tvOverlayDetail.setText(statusText);
                break;
            case PRAYER_TIME:
                binding.overlayAdhanIqamah.setVisibility(View.VISIBLE);
                binding.tvOverlayStatus.setText("SHOLAT BERJAMAAH");
                binding.tvOverlayPrayerName.setText(prayerName.toUpperCase(Locale.getDefault()));
                binding.tvOverlayDetail.setText("Luruskan dan Rapatkan Shaf Anda");
                break;
            case PRE_ADHAN:
            case NORMAL:
            default:
                binding.overlayAdhanIqamah.setVisibility(View.GONE);
                break;
        }
    }

    private void applyMosqueInfo(Models.PrayerSettings settings) {
        binding.tvMosqueName.setText(settings.mosqueName != null ? settings.mosqueName : getString(R.string.mosque_name_default));
        binding.tvMosqueSubtitle.setText(settings.mosqueSubtitle != null ? settings.mosqueSubtitle : getString(R.string.mosque_sub_default));
        binding.tvMosqueAddress.setText(settings.mosqueAddress != null ? settings.mosqueAddress : getString(R.string.mosque_addr_default));
    }

    private void updateRunningText() {
        List<Models.Announcement> announcements = PreferencesManager.getAnnouncements();
        List<String> activeTexts = new ArrayList<>();
        for (Models.Announcement a : announcements) {
            if (a.isActive != null && a.isActive == 1) {
                if (a.content != null && !a.content.isEmpty()) {
                    activeTexts.add(a.content);
                } else if (a.title != null && !a.title.isEmpty()) {
                    activeTexts.add(a.title);
                }
            }
        }

        if (!activeTexts.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < activeTexts.size(); i++) {
                sb.append(activeTexts.get(i));
                if (i < activeTexts.size() - 1) {
                    sb.append("   •   ");
                }
            }
            binding.tvRunningText.setText(sb.toString());
        } else {
            binding.tvRunningText.setText(getString(R.string.running_text_default));
        }
    }

    private void updateFridayOrQuote(Models.FridayInfo friday, Models.Quote quote) {
        Calendar cal = Calendar.getInstance();
        boolean isFriday = cal.get(Calendar.DAY_OF_WEEK) == Calendar.FRIDAY;

        if (isFriday && friday != null) {
            binding.tvWidgetHeader.setText("JADWAL SHOLAT JUM'AT");
            binding.layoutFridayOfficers.setVisibility(View.VISIBLE);
            binding.tvQuoteText.setVisibility(View.GONE);
            binding.tvFridayKhatib.setText(friday.khatib != null ? friday.khatib : "-");
            binding.tvFridayImam.setText(friday.imam != null ? friday.imam : "-");
            binding.tvFridayMuadzin.setText(friday.muadzin != null ? friday.muadzin : "-");
        } else if (quote != null && quote.textTranslation != null && !quote.textTranslation.trim().isEmpty()) {
            binding.tvWidgetHeader.setText("MUTIARA HIKMAH");
            binding.layoutFridayOfficers.setVisibility(View.GONE);
            binding.tvQuoteText.setVisibility(View.VISIBLE);
            String source = (quote.source != null && !quote.source.trim().isEmpty()) ? " (" + quote.source + ")" : "";
            binding.tvQuoteText.setText("\"" + quote.textTranslation + "\"" + source);
        } else {
            binding.tvWidgetHeader.setText("MASJID ASY SYURA");
            binding.layoutFridayOfficers.setVisibility(View.GONE);
            binding.tvQuoteText.setVisibility(View.VISIBLE);
            binding.tvQuoteText.setText("\"Luruskan dan rapatkan shaf saat sholat berjamaah.\"");
        }
    }

    private String calculateHijriDate(Date now, int adjustment) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                java.time.chrono.HijrahDate hijrahDate = java.time.chrono.HijrahDate.now()
                        .plus(adjustment, java.time.temporal.ChronoUnit.DAYS);
                int day = hijrahDate.get(java.time.temporal.ChronoField.DAY_OF_MONTH);
                int month = hijrahDate.get(java.time.temporal.ChronoField.MONTH_OF_YEAR);
                int year = hijrahDate.get(java.time.temporal.ChronoField.YEAR);
                String monthName = (month >= 1 && month <= 12) ? hijriMonthNames.get(month - 1) : "";
                return day + " " + monthName + " " + year + " H";
            } catch (Exception e) {
                return fallbackHijriDate(now);
            }
        } else {
            return fallbackHijriDate(now);
        }
    }

    private String fallbackHijriDate(Date now) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(now);
        return cal.get(Calendar.DAY_OF_MONTH) + " Safar 1448 H";
    }

    /**
     * Sinkronisasi background dari server API.
     * Silent catch saat OFFLINE sehingga aplikasi tidak pernah menampilkan dialog error atau crash.
     */
    private void startBackgroundSync() {
        syncExecutor = Executors.newSingleThreadScheduledExecutor();
        syncExecutor.scheduleWithFixedDelay(new Runnable() {
            @Override
            public void run() {
                try {
                    // 1. Fetch Settings
                    Response<Models.PrayerSettings> settingsRes = ApiClient.getService().getSettings().execute();
                    if (settingsRes.isSuccessful() && settingsRes.body() != null) {
                        final Models.PrayerSettings newSettings = settingsRes.body();
                        PreferencesManager.saveSettings(newSettings);
                        currentSettings = newSettings;
                        prayerCalc = new PrayerCalculator(newSettings);
                        mainHandler.post(new Runnable() {
                            @Override
                            public void run() {
                                applyMosqueInfo(newSettings);
                            }
                        });
                    }

                    // 2. Fetch Announcements
                    Response<List<Models.Announcement>> announcementsRes = ApiClient.getService().getAnnouncements().execute();
                    if (announcementsRes.isSuccessful() && announcementsRes.body() != null) {
                        PreferencesManager.saveAnnouncements(announcementsRes.body());
                        mainHandler.post(new Runnable() {
                            @Override
                            public void run() {
                                updateRunningText();
                            }
                        });
                    }

                    // 3. Fetch Friday Info
                    Response<Models.FridayInfo> fridayRes = ApiClient.getService().getFriday().execute();
                    final Models.FridayInfo fridayInfo = fridayRes.isSuccessful() ? fridayRes.body() : null;
                    PreferencesManager.saveFriday(fridayInfo);

                    // 4. Fetch Quote
                    Response<Models.Quote> quoteRes = ApiClient.getService().getQuote().execute();
                    final Models.Quote quote = quoteRes.isSuccessful() ? quoteRes.body() : null;
                    PreferencesManager.saveQuote(quote);

                    mainHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            updateFridayOrQuote(fridayInfo, quote);
                        }
                    });

                } catch (Exception ignored) {
                    // Mode OFFLINE: Silent catch, tanpa crash atau toast mengganggu di layar TV
                }
            }
        }, 0, 30, TimeUnit.SECONDS);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (mainHandler != null && tickerRunnable != null) {
            mainHandler.removeCallbacks(tickerRunnable);
        }
        if (syncExecutor != null && !syncExecutor.isShutdown()) {
            syncExecutor.shutdown();
        }
    }
}
