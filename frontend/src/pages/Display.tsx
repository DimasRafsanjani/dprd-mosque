import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { calculatePrayerTimes, formatTime, PRAYER_KEYS, PRAYER_NAMES, getPrayerState, formatCountdownText } from '../utils/prayer';
import type { PrayerSettings, PrayerState } from '../utils/prayer';
import { PrayerTimes } from 'adhan';

import { Background } from '../components/Background';
import { FridayPanel } from '../components/FridayPanel';
import { RunningText } from '../components/RunningText';
import { AdhanOverlay } from '../components/AdhanOverlay';

const Display: React.FC = () => {
  const [time, setTime] = useState<{hm: string, s: string}>({ hm: '00:00', s: '00' });
  const [dateGregorian, setDateGregorian] = useState<string>('');
  const [dateHijri, setDateHijri] = useState<string>('');
  const [settings, setSettings] = useState<PrayerSettings | null>(null);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [prayerState, setPrayerState] = useState<any>({ state: 'normal' });
  const [slideshowMode, setSlideshowMode] = useState('wallpaper');

  const [timeOffsetMs, setTimeOffsetMs] = useState(0);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const scaleX = window.innerWidth / 1920;
      const scaleY = window.innerHeight / 1080;
      setScale(Math.min(scaleX, scaleY));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchSettings = () => {
      axios.get('/api/settings').then(res => {
        setSettings(prev => {
          // If settings changed, update them
          if (JSON.stringify(prev) !== JSON.stringify(res.data)) {
            const pt = calculatePrayerTimes(res.data);
            setPrayerTimes(pt);

            // Mock time logic
            if (res.data.use_mock_time === '1' && res.data.mock_time) {
              const [h, m] = res.data.mock_time.split(':').map(Number);
              const target = new Date();
              target.setHours(h, m, 0, 0);
              setTimeOffsetMs(target.getTime() - Date.now());
            } else {
              setTimeOffsetMs(0);
            }
            return res.data;
          }
          return prev;
        });
      }).catch(err => console.error(err));
    };

    fetchSettings();
    const interval = setInterval(fetchSettings, 10000); // Poll every 10 seconds

    const now = new Date();
    const optionsG: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setDateGregorian(now.toLocaleDateString('id-ID', optionsG));

    // Initial Hijri calculation
    axios.get('/api/settings').then(res => {
      const hijriDate = new Date(now);
      const adjustment = parseInt(res.data.hijri_adjustment || '0');
      hijriDate.setDate(hijriDate.getDate() + adjustment);
      const optionsH: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', calendar: 'islamic' };
      setDateHijri(hijriDate.toLocaleDateString('id-ID', optionsH));
    });

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date(Date.now() + timeOffsetMs);
      const hmStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
      const sStr = now.getSeconds().toString().padStart(2, '0');
      setTime({ hm: hmStr, s: sStr });

      if (prayerTimes && settings) {
        // Run state machine every second
        let currentState = getPrayerState(prayerTimes, settings, now);

        if (settings.force_screen_mode && settings.force_screen_mode !== 'auto') {
          const testPrayer = { name: 'Maghrib (Test)', time: new Date(), key: 'maghrib' };
          if (settings.force_screen_mode === 'countdown') {
            currentState = { state: 'countdown', prayer: testPrayer, countdown: 120 };
          } else if (settings.force_screen_mode === 'adhan') {
            currentState = { state: 'adhan', prayer: testPrayer };
          } else if (settings.force_screen_mode === 'iqamah') {
            currentState = { state: 'iqamah', prayer: testPrayer, countdown: 300 };
          }
        }

        setPrayerState(currentState);

        // Recalculate at midnight
        if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
          setPrayerTimes(calculatePrayerTimes(settings));
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [prayerTimes, settings, timeOffsetMs]);

  const activeState: PrayerState = prayerState?.state || 'normal';
  const isAdhanOrIqamah = activeState === 'adhan' || activeState === 'iqamah';
  const isFriday = settings?.use_mock_friday === '1' || new Date().getDay() === 5;

  let activeTimeStr = '--:--';
  if (prayerState?.prayer?.time) {
    activeTimeStr = formatTime(prayerState.prayer.time, settings?.timezone);
  }

  // Get the 5 upcoming prayers for the bottom row
  const activeKey = prayerState?.prayer?.key || 'dhuhr';
  const activeIndex = PRAYER_KEYS.indexOf(activeKey);
  const rotatedKeys: string[] = [];
  if (activeIndex !== -1) {
    for (let i = 1; i <= 5; i++) {
      rotatedKeys.push(PRAYER_KEYS[(activeIndex + i) % PRAYER_KEYS.length]);
    }
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      <div
        className="font-sans m-0 p-0 overflow-hidden text-white absolute origin-center"
        style={{
          width: '1920px',
          height: '1080px',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${scale})`
        }}
      >
        <Background
          meccaUrl={settings?.mecca_stream_url}
          onModeChange={setSlideshowMode}
          slideshowMode={settings?.slideshow_mode}
          slideshowManualSlide={settings?.slideshow_manual_slide}
        />

        <div id="app-container" className={`absolute text inset-0 flex z-10 transition-opacity duration-1000 ${isAdhanOrIqamah ? 'opacity-0' : 'opacity-100'}`}>

          {/* Left Sidebar */}
          <aside className="w-124.25 h-full flex flex-col justify-between bg-[#097969]/80 backdrop-blur-[30px] p-6 shadow-2xl relative z-20">

            <div className="flex flex-col mt-12 gap-2">
              <h1 className="font-outfit font-bold text-[45px] leading-tight uppercase">{settings?.mosque_name || 'MASJID ASY SYURA'}</h1>
              <h2 className="font-outfit font-semibold text-3xl leading-tight">DPRD Provinsi Jawa Barat</h2>
              <p className="font-outfit font-normal text-[27px] opacity-90">Jl. Diponegoro No. 27 Bandung</p>
            </div>

            <div className="flex flex-col gap-4 mb-auto mt-30">
              <div className="font-inter font-black text-[112px] leading-none tabular-nums flex items-baseline whitespace-nowrap">
                <span>{time.hm}</span>
                <span className="text-[56px] text-white/70 ml-2">:{time.s}</span>
              </div>
              <div className="font-outfit font-normal text-3xl">{dateGregorian || 'Memuat Tanggal...'}</div>
              <div className="font-outfit font-normal text-3xl">{dateHijri}</div>
            </div>

            <div className="flex flex-col gap-2 bg-white/20 backdrop-blur-md rounded-[20px] p-[24px] mb-[120px]">
              <div className="font-outfit font-semibold text-[32px]">Menuju {prayerState?.prayer?.name}</div>
              <div className="font-inter font-bold text-[108px] leading-none tracking-tighter tabular-nums text-white">
                {activeTimeStr}
              </div>
              <div className="font-inter font-normal text-2xl">
                dalam {prayerState?.countdown ? formatCountdownText(prayerState.countdown) : '--'}
              </div>
            </div>
          </aside>

          {/* Right Main Area */}
          <main className="flex-1 flex flex-col justify-between relative p-[48px] pb-[126px]">
            {/* Top Right Logos and Tags */}
            <div className="flex justify-end items-start gap-8">
              <div className="flex flex-col items-end gap-6">
                {/* Logos */}
                <div className="flex bg-[#097969]/80 backdrop-blur-[30px] rounded-[20px] px-8 py-4 h-[97px] items-center gap-6 shadow-xl">
                  <img src="/assets/logos/logo-setwan.png" className="h-[60px] object-contain" />
                  <img src="/assets/logos/logo-dprd.png" className="h-[60px] object-contain" />
                </div>

                {/* Live Mekkah Tag (Moved below the logo) */}
                <div className={`flex items-center gap-2 bg-[#FF2828]/50 backdrop-blur-md px-6 py-3 rounded-full transition-opacity duration-1000 ${slideshowMode === 'mecca' ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  <span className="font-outfit font-bold text-white text-3xl">LIVE MEKKAH</span>
                </div>
              </div>
            </div>

            {/* Friday Panel */}
            {isFriday && (
              <div className="absolute top-[48px] left-[48px]">
                <FridayPanel />
              </div>
            )}

            {/* Slideshow Mode Indicator */}
            <div className="absolute top-[250px] right-[48px] flex flex-col items-center gap-3">
              <div className={`slider-dot ${slideshowMode === 'wallpaper' ? 'active' : ''}`}></div>
              <div className={`slider-dot ${slideshowMode === 'quote' ? 'active' : ''}`}></div>
              <div className={`slider-dot ${slideshowMode === 'mecca' ? 'active' : ''}`}></div>
            </div>

            {/* Bottom Area: Prayer Times & Running Text */}
            <div className="flex flex-col gap-6 w-full mt-auto">
              <div className="flex gap-[24px] w-full">
                {rotatedKeys.map((key) => {
                  let timeStr = '--:--';
                  if (prayerTimes) {
                    const pt = (prayerTimes as any)[key];
                    if (pt) timeStr = formatTime(pt, settings?.timezone);
                  }
                  return (
                    <div key={key} className="flex-1 flex flex-col bg-[#097969]/80 backdrop-blur-[30px] rounded-[20px] p-[16px] shadow-lg">
                      <div className="font-outfit font-semibold text-[32px]">{PRAYER_NAMES[key]}</div>
                      <div className="font-inter font-semibold text-[64px]">{timeStr}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>

          {/* Absolute Running Text at Bottom */}
          <div className="absolute bottom-0 w-full z-30">
            <RunningText />
          </div>
        </div>

        <AdhanOverlay
          state={activeState}
          prayerName={prayerState?.prayer?.name}
          countdown={prayerState?.countdown}
        />
      </div>
    </div>
  );
};

export default Display;

