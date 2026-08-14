import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Announcement {
  id: number;
  text: string;
}

export const RunningText: React.FC<{ speed?: number }> = ({ speed = 10 }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 5 * 60 * 1000); // 5 min
    return () => clearInterval(interval);
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get('/api/announcements');
      if (res.data) setAnnouncements(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const joinedText = announcements.length > 0 
    ? announcements.map(a => a.text).join(' • ')
    : 'Alirkan pahala tanpa putus, Salurkan donasi anda...'; // fallback

  const textLength = joinedText.length + 100; // rough width padding
  const duration = Math.max(10, Math.floor(textLength / speed)); // seconds based on speed multiplier

  return (
    <div className="flex h-[78px] w-full">
      {/* Warning Block */}
      <div className="flex-shrink-0 w-[283px] bg-[#FFD100] flex items-center justify-center p-4 z-20">
        <span className="font-outfit font-semibold text-[24px] text-black leading-tight text-center">
          HARAP MATIKAN /<br/>SILENT HANDPHONE
        </span>
      </div>

      {/* Running Text Block */}
      <div className="flex-1 bg-white flex items-center overflow-hidden relative">
        <div className="w-full whitespace-nowrap overflow-hidden flex items-center h-full">
          <div 
            className="inline-block animate-marquee pl-[100%] font-outfit font-semibold text-[36px] text-black pt-1"
            style={{ '--ticker-duration': `${duration}s` } as React.CSSProperties}
          >
            {joinedText}
          </div>
        </div>
      </div>
    </div>
  );
};
