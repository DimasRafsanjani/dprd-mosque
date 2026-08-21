import React, { useEffect, useState } from 'react';
import axios from 'axios';

export const FridayPanel: React.FC = () => {
  const [fridayData, setFridayData] = useState<any>(null);

  useEffect(() => {
    fetchFridayData();
    const interval = setInterval(fetchFridayData, 10 * 1000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchFridayData = async () => {
    try {
      const res = await axios.get('/api/friday');
      setFridayData(res.data);
    } catch (e) {
      console.error('Failed to load Friday info:', e);
    }
  };

  if (!fridayData) return null;

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="flex flex-col gap-3 bg-[#097969]/80 backdrop-blur-[30px] p-[24px] rounded-[20px] shadow-lg text-white w-[500px]">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <span className="font-outfit font-semibold text-[24px] opacity-90">Khatib</span>
          <span className="font-outfit font-bold text-[32px]">{fridayData.khatib_name || '-'}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-outfit font-semibold text-[24px] opacity-90">Muadzin</span>
          <span className="font-outfit font-bold text-[32px]">{fridayData.muadzin_name || '-'}</span>
        </div>
      </div>

      <div className="h-px bg-white/20 w-full my-2"></div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <span className="font-outfit font-semibold text-[20px] opacity-90">Jumlah Kas</span>
          <span className="font-inter font-bold text-[28px]">{formatRupiah(fridayData.balance || 0)}</span>
        </div>
        {Number(fridayData.income) > 0 && (
          <div className="flex flex-col">
            <span className="font-outfit font-semibold text-[20px] opacity-90">Jumlah Pemasukan</span>
            <span className="font-inter font-bold text-[28px]">{formatRupiah(fridayData.income)}</span>
          </div>
        )}
        {Number(fridayData.expense) > 0 && (
          <div className="flex flex-col">
            <span className="font-outfit font-semibold text-[20px] opacity-90">Jumlah Pengeluaran</span>
            <span className="font-inter font-bold text-[28px]">{formatRupiah(fridayData.expense)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
