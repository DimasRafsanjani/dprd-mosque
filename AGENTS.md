# Project Guide for AI Agents (`AGENTS.md`)

This repository contains the **Mosque Prayer Time Display System** for **DPRD Provinsi Jawa Barat** (Masjid Asy Syura). It is designed as an offline-first PWA / Capacitor TV app and Android app.

---

## 🏛️ Repository Structure

- **`server.js`**: Express.js backend server managing API endpoints (`/api/settings`, `/api/announcements`, `/api/friday`, `/api/quote`, `/api/wallpapers`, `/api/schedule`) using SQLite (`sql.js`). `/api/schedule` serves synced Kemenag rows (today + tomorrow); empty = TV falls back to local calculation.
- **`frontend/`**: React 19 + TypeScript + Vite + Tailwind CSS v4 Web/PWA application.
  - **`frontend/src/pages/Display.tsx`**: Main TV display interface (1920x1080 scaled viewport).
  - **`frontend/src/pages/Admin.tsx`**: Admin panel for controlling settings, announcements, Friday officers, quotes, and wallpapers.
  - **`frontend/src/utils/api.ts`**: Axios instance with Instant Offline Bypass interceptors.
  - **`frontend/src/utils/prayer.ts`**: Adhan library wrapper + Tabular Hijri calendar calculation fallback.
  - **`frontend/src/utils/offlineData.ts`**: Default offline fallback datasets.
- **`frontend/android/`**: Capacitor Android wrapper project for TV & mobile devices.
- **`android-tv/`**: Native Java Android TV application.
- **`public/downloads/mosque-tv.apk`**: Production compiled APK served for download via Admin UI.

---

## ⚙️ Key Technical Patterns & Rules

### 1. Offline-First Resilience
- **Instant Offline Bypass (`frontend/src/utils/api.ts`)**: When `!navigator.onLine`, `axios` request interceptor immediately returns cached or default fallback data in **0ms** without initiating TCP socket connections or 3s network timeouts.
- **Smart Polling**: Background API polling intervals run every **5 minutes** when online and are **completely bypassed** when offline to protect TV CPU & memory resources.
- **`online` Event Listener**: Components attach `window.addEventListener('online')` to immediately trigger data sync when internet connection re-establishes.

### 2. Date Formatting & Midnight Transition
- **Dynamic Date Refresh**: Gregorian and Hijri date strings are updated every second inside the ticker loop in [`Display.tsx`](file:///d:/Work/dprd-mosque/frontend/src/pages/Display.tsx).
- **Midnight Prayer Times Recalculation**: Tracked via `lastCalculatedDate` (`now.toDateString()`). When calendar date changes across midnight, `prayerTimes` are recalculated immediately for the new day.
- **Tabular Hijri Fallback**: If `Intl.DateTimeFormat('en-u-ca-islamic-umalqura')` or `HijrahDate` is unsupported on older Smart TV WebViews, `getTabularHijriDate()` mathematically calculates Hijri day/month/year instead of using hardcoded fallbacks.

---

## 🛠️ Development & Build Commands

### Backend
```bash
npm install
npm start
```

### Frontend Web Development
```bash
cd frontend
npm install
npm run dev
```

### Build Web & Generate APK Automatically
```bash
cd frontend
npm run build:apk
```
> Compiles Vite web production bundle, syncs Capacitor Android assets, runs Gradle `assembleDebug`, and copies the fresh APK to `public/downloads/mosque-tv.apk`.

### Git Workflow for APK Updates
The APK file at `public/downloads/mosque-tv.apk` is tracked in Git. Always stage and commit it after building:
```bash
git add .
git commit -m "Update application & APK"
git push origin main
```
