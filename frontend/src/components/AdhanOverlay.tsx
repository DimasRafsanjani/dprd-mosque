import React from 'react';
import { formatCountdown } from '../utils/prayer';
import type { PrayerState } from '../utils/prayer';

interface AdhanOverlayProps {
  state: PrayerState;
  prayerName?: string;
  countdown?: { hours: number; minutes: number; seconds: number };
}

export const AdhanOverlay: React.FC<AdhanOverlayProps> = ({ state, prayerName, countdown }) => {
  if (state === 'normal') return null;

  const isPreAdhan = state === 'pre-adhan';
  const isIqamahCountdown = state === 'iqamah-countdown';
  const isFigmaDesign = isPreAdhan || isIqamahCountdown;

  if (isFigmaDesign) {
    const title = isPreAdhan ? `Menjelang Azan ${prayerName}` : `Menjelang Iqomah ${prayerName}`;
    const timeText = countdown
      ? (countdown.hours > 0
        ? formatCountdown(countdown)
        : `${String(countdown.minutes).padStart(2, '0')}:${String(countdown.seconds).padStart(2, '0')}`)
      : '00:00';

    const topRightSvg = '/assets/ornaments/top-right.svg';
    const bottomLeftSvg = '/assets/ornaments/bottom-left.svg';

    return (
      <div id="adhan-overlay" className="fixed inset-0 z-[9999] overflow-hidden bg-[#097969]/90  flex items-center justify-center">
        {/* Ornaments */}
        <img src={topRightSvg} alt="" className="absolute top-0 right-0 pointer-events-none w-50" />
        <img src={bottomLeftSvg} alt="" className="absolute bottom-0 left-0 pointer-events-none w-100" />

        {/* Content */}
        <div className="flex flex-col items-center justify-center gap-[16px] relative z-10">
          <div className="font-outfit font-semibold text-[128px] text-white leading-none text-center">
            {title}
          </div>
          <div className="font-inter font-bold text-[512px] text-white leading-none tracking-tight tabular-nums mt-[-40px]">
            {timeText}
          </div>
        </div>
      </div>
    );
  }

  // Fallback for 'adhan' and 'iqamah' states
  return (
    <div id="adhan-overlay" className="fixed inset-0 bg-[#097969]/95 z-[9999] flex items-center justify-center text-center text-white">
      <div className="flex flex-col items-center justify-center">
        <div className="text-[8rem] mb-5 animate-pulse">🕌</div>

        {state === 'adhan' && (
          <>
            <div className="text-[5rem] font-extrabold mb-2 font-outfit" id="adhan-text">WAKTU SHOLAT {prayerName?.toUpperCase()}</div>
            <div className="text-[3rem] text-dprd-lightgold font-inter" id="adhan-subtext">Hayya 'alash shalah</div>
          </>
        )}

        {state === 'iqamah' && (
          <>
            <div className="text-[5rem] font-extrabold mb-2 font-outfit" id="adhan-text">IQAMAH</div>
            <div className="text-[3rem] text-dprd-lightgold font-inter" id="adhan-subtext">Luruskan dan Rapatkan Shaf</div>
          </>
        )}
      </div>
    </div>
  );
};
