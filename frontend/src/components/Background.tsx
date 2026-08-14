import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface BackgroundProps {
  meccaUrl?: string;
  onModeChange?: (mode: string) => void;
  slideshowMode?: string;
  slideshowManualSlide?: string;
}

export const Background: React.FC<BackgroundProps> = ({ meccaUrl, onModeChange, slideshowMode = 'auto', slideshowManualSlide = 'wallpaper' }) => {
  const [wallpapers, setWallpapers] = useState<{ filename: string }[]>([]);
  const [quote, setQuote] = useState<any>(null);

  const [modes, setModes] = useState<string[]>(['wallpaper']);
  const [currentModeIdx, setCurrentModeIdx] = useState(0);
  const [wallpaperIdx, setWallpaperIdx] = useState(0);
  const [quoteIdx, setQuoteIdx] = useState(1);

  useEffect(() => {
    fetchWallpapers();
    fetchQuote();
  }, []);

  useEffect(() => {
    const newModes = [];
    newModes.push('wallpaper'); // Base mode always exists
    if (quote?.text_translation || quote?.text_arabic) newModes.push('quote');
    if (meccaUrl) newModes.push('mecca');
    setModes(newModes);
  }, [wallpapers, quote, meccaUrl]);

  useEffect(() => {
    if (slideshowMode === 'manual') {
      const idx = modes.indexOf(slideshowManualSlide);
      if (idx !== -1) {
        setCurrentModeIdx(idx);
      } else {
        setCurrentModeIdx(0); // Fallback to wallpaper if mode not available
      }
      return; // Disable auto rotation
    }

    const interval = setInterval(() => {
      setCurrentModeIdx(prev => {
        const next = (prev + 1) % modes.length;
        if (modes[next] === 'wallpaper') {
          if (wallpapers.length > 0) {
            setWallpaperIdx(w => (w + 1) % wallpapers.length);
          }
        }
        if (modes[next] === 'quote') {
          fetchQuote(); // refresh quote periodically
          setQuoteIdx(q => (q % 5) + 1); // Cycle through 1 to 5 for templates
        }
        return next;
      });
    }, 30000); // 30s rotation

    return () => clearInterval(interval);
  }, [modes, wallpapers.length, slideshowMode, slideshowManualSlide]);

  const fetchWallpapers = async () => {
    try {
      const res = await axios.get('/api/wallpapers');
      setWallpapers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchQuote = async () => {
    try {
      const res = await axios.get('/api/quote');
      setQuote(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const currentMode = modes[currentModeIdx] || 'wallpaper';
  const currentWallpaper = wallpapers.length > 0 ? `/uploads/${wallpapers[wallpaperIdx]?.filename}` : '/assets/base-wallpaper.png';

  useEffect(() => {
    if (onModeChange) {
      onModeChange(currentMode);
    }
  }, [currentMode, onModeChange]);

  let streamUrl = meccaUrl || '';
  if (streamUrl.includes('<iframe')) {
    const match = streamUrl.match(/src="([^"]+)"/);
    if (match) streamUrl = match[1];
  } else if (streamUrl.includes('youtube.com/watch?v=')) {
    const videoId = streamUrl.split('v=')[1]?.split('&')[0];
    if (videoId) streamUrl = `https://www.youtube.com/embed/${videoId}`;
  } else if (streamUrl.includes('youtu.be/')) {
    const videoId = streamUrl.split('youtu.be/')[1]?.split('?')[0];
    if (videoId) streamUrl = `https://www.youtube.com/embed/${videoId}`;
  }

  if (streamUrl && !streamUrl.includes('autoplay=1')) streamUrl += (streamUrl.includes('?') ? '&' : '?') + 'autoplay=1';
  if (streamUrl && !streamUrl.includes('mute=1')) streamUrl += '&mute=1';
  if (streamUrl && !streamUrl.includes('controls=0')) streamUrl += '&controls=0&showcontrols=0';
  if (streamUrl && !streamUrl.includes('showinfo=0')) streamUrl += '&showinfo=0';

  return (
    <div id="background-layer" className="fixed inset-0 -z-10 bg-black">

      {/* Base Wallpaper */}
      <div
        id="bg-wallpaper"
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out bg-cover bg-center bg-no-repeat ${currentMode === 'wallpaper' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
        style={{ backgroundImage: `url('${currentWallpaper}')` }}
      ></div>

      {/* Quote Layer */}
      <div
        id="bg-quote"
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out bg-cover bg-center bg-no-repeat ${currentMode === 'quote' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
        style={{ backgroundImage: `url('/assets/template-quotes/Template ${quoteIdx}.png')` }}
      >
        <div className="absolute right-[80px] top-[230px] w-[841px] flex flex-col items-end text-right">
          <div className="w-full">
            {quote?.text_arabic && (
              <div className="font-arabic text-[60px] leading-relaxed mb-[30px] text-black">
                {quote?.text_arabic}
              </div>
            )}
            <div className="font-outfit text-[40px] font-semibold mb-[20px] text-black leading-tight">
              "{quote?.text_translation}"
            </div>
            {quote?.source && (
              <div className="font-inter text-[28px] text-black font-medium italic">
                — {quote?.source}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mecca Stream */}
      <div id="bg-mecca" className={`absolute inset-0 transition-opacity duration-1000 ease-in-out overflow-hidden ${currentMode === 'mecca' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
        {streamUrl && (
          <iframe
            id="mecca-iframe"
            src={streamUrl}
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="w-full h-full pointer-events-none scale-125"
          ></iframe>
        )}
      </div>

    </div>
  );
};

