import React, { useEffect, useState, useRef } from 'react';
import axios from '../utils/api';
import { DEFAULT_ANNOUNCEMENTS } from '../utils/offlineData';

interface Announcement {
  id: number;
  text: string;
}

export const RunningText: React.FC<{ speed?: number }> = ({ speed = 10 }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    try {
      const cached = localStorage.getItem('cache_/api/announcements');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return DEFAULT_ANNOUNCEMENTS;
  });

  const textRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState<number>(100);

  useEffect(() => {
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 5 * 60 * 1000); // 5 min
    return () => clearInterval(interval);
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get('/api/announcements');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setAnnouncements(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const joinedText = announcements.length > 0 
    ? announcements.map(a => a.text).join('   •   ')
    : 'Selamat Datang di Masjid Asy Syura DPRD Provinsi Jawa Barat • Luruskan dan Rapatkan Shaf Saat Sholat Berjamaah';

  useEffect(() => {
    const updateDuration = () => {
      // Container width (white area) is roughly window.innerWidth - 310 (warning box)
      const containerWidth = Math.max(800, window.innerWidth - 310);
      
      // With paddingLeft: 100%, textRef.scrollWidth equals containerWidth + textWidth
      const measuredDistance = textRef.current?.scrollWidth || (containerWidth + joinedText.length * 22);
      const totalDistance = Math.max(containerWidth + 400, measuredDistance);

      // Slider speed from admin (5 - 30, default 10)
      const speedVal = Math.max(5, Math.min(30, Number(speed) || 10));
      
      // Calibrated speed in pixels per second:
      // speed 5  -> 35 px/sec (tenang & lambat)
      // speed 10 -> 55 px/sec (kecepatan standar tv publik, sangat nyaman dibaca)
      // speed 15 -> 75 px/sec (sedang)
      // speed 20 -> 95 px/sec (agak cepat)
      // speed 30 -> 135 px/sec (cepat)
      const pxPerSec = 15 + (speedVal * 4);
      
      const calculatedDuration = Math.max(25, Math.round(totalDistance / pxPerSec));
      setDuration(calculatedDuration);
    };

    updateDuration();
    const timer = setTimeout(updateDuration, 150);
    window.addEventListener('resize', updateDuration);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDuration);
    };
  }, [joinedText, speed]);

  return (
    <div className="flex h-[78px] w-full overflow-hidden">
      {/* Warning Block */}
      <div className="flex-shrink-0 w-[310px] bg-[#FFD100] flex flex-col items-center justify-center px-4 py-1 z-20">
        <span className="font-outfit font-bold text-[20px] text-black leading-tight text-center whitespace-nowrap">
          HARAP MATIKAN /
        </span>
        <span className="font-outfit font-bold text-[20px] text-black leading-tight text-center whitespace-nowrap">
          SILENT HANDPHONE
        </span>
      </div>

      {/* Running Text Block */}
      <div className="flex-1 bg-white flex items-center overflow-hidden relative">
        <div className="w-full whitespace-nowrap overflow-hidden flex items-center h-full">
          <div 
            ref={textRef}
            key={`marquee-${duration}`}
            className="inline-block font-outfit font-semibold text-[36px] text-black pt-1"
            style={{
              paddingLeft: '100%',
              animation: `marquee ${duration}s linear infinite`,
              willChange: 'transform',
              '--ticker-duration': `${duration}s`
            } as React.CSSProperties}
          >
            {joinedText}
          </div>
        </div>
      </div>
    </div>
  );
};
