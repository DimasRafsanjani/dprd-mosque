import React, { useEffect, useState } from 'react';
import axios, { API_BASE_URL } from '../utils/api';
import axiosOriginal from 'axios';

interface Announcement {
  id: number;
  text: string;
  is_active: number;
  priority: number;
  start_date: string | null;
  end_date: string | null;
}

const Admin: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<string>('settings');
  const [toast, setToast] = useState('');

  // Kemenag schedule sync status
  const [schedStatus, setSchedStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  // Wallpapers State
  const [wallpapers, setWallpapers] = useState<any[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Friday State
  const [fridayRecords, setFridayRecords] = useState<any[]>([]);
  const [newFriday, setNewFriday] = useState({ date: '', khatib_name: '', khatib_title: '', muadzin_name: '', income: '', expense: '', balance: '' });

  // Settings State
  const [settings, setSettings] = useState({
    mosque_name: '',
    mecca_stream_url: '',
    mecca_stream_enabled: '1',
    mecca_stream_valid: '1',
    mecca_stream_checked_at: '',
    latitude: '',
    longitude: '',
    hijri_adjustment: '0',
    iqamah_fajr: '10',
    iqamah_dhuhr: '10',
    iqamah_asr: '10',
    iqamah_maghrib: '10',
    iqamah_isha: '10',
    ikhtiyat: '2',
    adjust_fajr: '0',
    adjust_sunrise: '-7',
    adjust_dhuhr: '0',
    adjust_asr: '0',
    adjust_maghrib: '5',
    adjust_isha: '1',
    slideshow_mode: 'auto',
    slideshow_manual_slide: 'wallpaper',
    use_mock_time: '0',
    mock_time: '12:00',
    use_mock_friday: '0',
    force_screen_mode: 'auto',
    running_text_speed: '10',
    schedule_city_id: '1219'
  });

  // Announcements State
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnText, setNewAnnText] = useState('');
  // Quotes State
  const [quotes, setQuotes] = useState<any[]>([]);
  const [newQuote, setNewQuote] = useState({ text_arabic: '', text_translation: '', source: '' });

  useEffect(() => {
    if (token) {
      fetchSettings();
      fetchAnnouncements();
      fetchQuotes();
      fetchWallpapers();
      fetchFridayRecords();
      fetchScheduleStatus();
    }
  }, [token]);

  const fetchScheduleStatus = async () => {
    try {
      const res = await axios.get('/api/admin/schedule/status', {
        headers: { 'x-admin-token': token }
      });
      if (res.data.success) setSchedStatus(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckStream = async () => {
    setSyncing(true);
    try {
      const res = await axios.post('/api/admin/stream/check', {}, {
        headers: { 'x-admin-token': token }
      });
      const st = (res.data?.data?.status as string) || '';
      if (st === 'invalid') {
        showToast('URL tidak valid (video dihapus/private) — mode live otomatis dilewati TV!');
      } else if (st === 'valid') {
        showToast('URL valid, siap tayang di TV.');
      } else {
        showToast('Tidak bisa dipastikan (jaringan/API), dianggap valid.');
      }
      fetchSettings();
    } catch (err: any) {
      alert('Gagal memeriksa: ' + (err.response?.data?.error || err.message));
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncSchedule = async () => {
    setSyncing(true);
    try {
      const res = await axios.post('/api/admin/schedule/sync', { city_id: settings.schedule_city_id || '1219' }, {
        headers: { 'x-admin-token': token }
      });
      if (res.data.success) {
        showToast(`Jadwal tersinkron (${res.data.data.synced} hari, ${res.data.data.lokasi})!`);
        fetchScheduleStatus();
      }
    } catch (err: any) {
      alert('Gagal sinkronisasi: ' + (err.response?.data?.error || err.message));
    } finally {
      setSyncing(false);
    }
  };

  // Langsung lempar ke login saat backend menolak token (sesi habis),
  // dengan pesan yang jelas — tidak menunggu user menekan Simpan.
  useEffect(() => {
    const onUnauthorized = () => {
      localStorage.removeItem('token');
      setToken(null);
      setLoginError('Sesi berakhir, silakan login lagi.');
    };
    window.addEventListener('admin-unauthorized', onUnauthorized);
    return () => window.removeEventListener('admin-unauthorized', onUnauthorized);
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/admin/login', { pin });
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setLoginError('');
      }
    } catch (err) {
      setLoginError('PIN Salah. Coba lagi.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/admin/settings', {
        headers: { 'x-admin-token': token }
      });
      if (res.data.success) {
        setSettings(prev => ({ ...prev, ...res.data.data }));
      }
    } catch (err) {
      if (axiosOriginal.isAxiosError(err) && err.response?.status === 401) handleLogout();
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/settings', settings, {
        headers: { 'x-admin-token': token }
      });
      showToast('Berhasil disimpan!');
    } catch (err) {
      alert('Gagal menyimpan pengaturan');
    }
  };

  const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get('/api/admin/announcements', {
        headers: { 'x-admin-token': token }
      });
      if (res.data.success) {
        setAnnouncements(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnText.trim()) return;

    try {
      await axios.post('/api/admin/announcements', { text: newAnnText }, {
        headers: { 'x-admin-token': token }
      });
      setNewAnnText('');
      showToast('Running text ditambahkan!');
      fetchAnnouncements();
    } catch (err) {
      alert('Gagal menambah running text');
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (!confirm('Hapus running text ini?')) return;
    try {
      await axios.delete(`/api/admin/announcements/${id}`, {
        headers: { 'x-admin-token': token }
      });
      showToast('Running text dihapus!');
      fetchAnnouncements();
    } catch (err) {
      alert('Gagal menghapus');
    }
  };

  const fetchQuotes = async () => {
    try {
      const res = await axios.get('/api/admin/quotes', {
        headers: { 'x-admin-token': token }
      });
      if (res.data.success) {
        setQuotes(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuote.text_translation.trim()) return;

    try {
      await axios.post('/api/admin/quotes', newQuote, {
        headers: { 'x-admin-token': token }
      });
      setNewQuote({ text_arabic: '', text_translation: '', source: '' });
      showToast('Quote ditambahkan!');
      fetchQuotes();
    } catch (err) {
      alert('Gagal menambah quote');
    }
  };

  const handleDeleteQuote = async (id: number) => {
    if (!confirm('Hapus quote ini?')) return;
    try {
      await axios.delete(`/api/admin/quotes/${id}`, {
        headers: { 'x-admin-token': token }
      });
      showToast('Quote dihapus!');
      fetchQuotes();
    } catch (err) {
      alert('Gagal menghapus quote');
    }
  };

  const fetchWallpapers = async () => {
    try {
      const res = await axios.get('/api/admin/wallpapers', {
        headers: { 'x-admin-token': token }
      });
      if (res.data.success) {
        setWallpapers(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadWallpaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      await axios.post('/api/admin/wallpapers', formData, {
        headers: {
          'x-admin-token': token,
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadFile(null);
      showToast('Wallpaper diupload!');
      fetchWallpapers();
    } catch (err) {
      alert('Gagal mengupload wallpaper');
    }
  };

  const handleDeleteWallpaper = async (id: number) => {
    if (!confirm('Hapus wallpaper ini?')) return;
    try {
      await axios.delete(`/api/admin/wallpapers/${id}`, {
        headers: { 'x-admin-token': token }
      });
      showToast('Wallpaper dihapus!');
      fetchWallpapers();
    } catch (err) {
      alert('Gagal menghapus wallpaper');
    }
  };

  const fetchFridayRecords = async () => {
    try {
      const res = await axios.get('/api/admin/friday', {
        headers: { 'x-admin-token': token }
      });
      if (res.data.success) {
        setFridayRecords(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFriday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriday.date || !newFriday.khatib_name) return;

    // Normalize data before sending
    const payload = {
      ...newFriday,
      income: newFriday.income || 0,
      expense: newFriday.expense || 0,
      balance: newFriday.balance || 0
    };

    try {
      await axios.post('/api/admin/friday', payload, {
        headers: { 'x-admin-token': token }
      });
      setNewFriday({ date: '', khatib_name: '', khatib_title: '', muadzin_name: '', income: '', expense: '', balance: '' });
      showToast('Data Jumat ditambahkan!');
      fetchFridayRecords();
    } catch (err) {
      alert('Gagal menambah data Jumat');
    }
  };

  const handleCurrencyChange = (field: 'income' | 'expense' | 'balance', value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setNewFriday({ ...newFriday, [field]: numericValue });
  };

  const formatInputRupiah = (value: string | number) => {
    if (!value) return '';
    return Number(value).toLocaleString('id-ID');
  };

  const handleDeleteFriday = async (id: number) => {
    if (!confirm('Hapus data ini?')) return;
    try {
      await axios.delete(`/api/admin/friday/${id}`, {
        headers: { 'x-admin-token': token }
      });
      showToast('Data dihapus!');
      fetchFridayRecords();
    } catch (err) {
      alert('Gagal menghapus data');
    }
  };

  if (!token) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50 z-[1000] text-slate-800 font-sans">
        <div className="w-full max-w-[400px] p-10 text-center bg-white shadow-sm backdrop-blur-xl border border-slate-200 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <h1 className="text-2xl font-bold mb-6">Admin Login</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-5 text-left">
              <label htmlFor="pin" className="block mb-2 text-slate-500 text-sm">Masukkan PIN Keamanan</label>
              <input
                type="password"
                id="pin"
                className="w-full bg-white border border-slate-300 text-slate-900 px-4 py-3 rounded-lg focus:outline-none focus:border-emas transition-colors"
                required
                placeholder="****"
                value={pin}
                onChange={e => setPin(e.target.value)}
              />
              {loginError && <div className="text-red-500 text-sm mt-2">{loginError}</div>}
            </div>
            <button type="submit" className="w-full bg-emas text-white font-semibold py-3 rounded-lg hover:bg-emas-dark transition-colors shadow-lg">Masuk</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans bg-slate-50 text-slate-800 min-h-screen flex flex-col md:flex-row overflow-x-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-[260px] h-auto md:h-screen sticky md:fixed left-0 top-0 p-4 md:p-6 border-b md:border-r md:border-b-0 border-slate-200 bg-white shadow-sm backdrop-blur-xl flex flex-col z-50">
        <div className="flex h-12 md:h-[97px] items-center gap-1 mb-2 md:mb-0">
          <img src="/assets/logos/logo-setwan.png" className="h-8 md:h-9 object-contain" />
          <img src="/assets/logos/logo-dprd-dark.png" className="h-8 md:h-9 object-contain" />
        </div>
        <div className="text-lg md:text-xl font-bold mb-4 md:mb-10 text-slate-800 flex items-center gap-3">
          Masjid Asy Syura DPRD Jawa Barat
        </div>
        <ul className="list-none flex flex-row md:flex-col gap-2 md:flex-1 overflow-x-auto whitespace-nowrap pb-2 md:pb-0">
          <li
            className={`px-4 py-3 rounded-lg cursor-pointer transition-colors ${activeTab === 'settings' ? 'bg-emas/10 text-emas font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => setActiveTab('settings')}
          >
            Pengaturan Umum
          </li>
          <li
            className={`px-4 py-3 rounded-lg cursor-pointer transition-colors ${activeTab === 'announcements' ? 'bg-emas/10 text-emas font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => setActiveTab('announcements')}
          >
            Running Text
          </li>
          <li
            className={`px-4 py-3 rounded-lg cursor-pointer transition-colors ${activeTab === 'quotes' ? 'bg-emas/10 text-emas font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => setActiveTab('quotes')}
          >
            Quotes
          </li>
          <li
            className={`px-4 py-3 rounded-lg cursor-pointer transition-colors ${activeTab === 'wallpapers' ? 'bg-emas/10 text-emas font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => setActiveTab('wallpapers')}
          >
            Foto Background
          </li>
          <li
            className={`px-4 py-3 rounded-lg cursor-pointer transition-colors ${activeTab === 'friday' ? 'bg-emas/10 text-emas font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => setActiveTab('friday')}
          >
            Data Jumat
          </li>
          <li
            className={`px-4 py-3 rounded-lg cursor-pointer transition-colors ${activeTab === 'testing' ? 'bg-emas/10 text-emas font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => setActiveTab('testing')}
          >
            Pengujian
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="w-full md:ml-[260px] p-4 md:p-10 md:w-[calc(100%-260px)] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-semibold capitalize">{activeTab === 'settings' ? 'Pengaturan Umum' : activeTab === 'announcements' ? 'Running Text' : activeTab === 'quotes' ? 'Quotes' : activeTab === 'wallpapers' ? 'Foto Background' : activeTab === 'friday' ? 'Data Jumat' : activeTab === 'testing' ? 'Pengujian' : activeTab}</h2>
          <div className="flex items-center gap-3">
            <a 
              href="/downloads/mosque-tv.apk" 
              download="mosque-tv.apk" 
              className="bg-emas-dark/10 text-emas-dark border border-emas/20 px-4 py-2 rounded-lg transition-all hover:bg-emas-dark hover:text-white font-medium flex items-center gap-1.5 text-sm"
            >
              📥 Download APK TV
            </a>
            <button onClick={handleLogout} className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg cursor-pointer transition-all hover:bg-red-500 hover:text-white text-sm">
              Keluar
            </button>
          </div>
        </div>

        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings}>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">

              <div className="bg-white shadow-sm backdrop-blur-xl border border-slate-200 rounded-2xl p-6">
                <h3 className="mb-4 text-slate-800 border-b border-slate-200 pb-3 font-medium">Informasi Masjid</h3>
                <div className="mb-4">
                  <label className="block mb-2 text-slate-500 text-sm">Nama Masjid</label>
                  <input type="text" name="mosque_name" value={settings.mosque_name} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                </div>
                <div className="mb-4">
                  <label className="block mb-2 text-slate-500 text-sm">Kecepatan Running Text</label>
                  <div className="flex gap-2 items-center">
                    <input type="range" name="running_text_speed" min="5" max="30" value={settings.running_text_speed || '10'} onChange={handleSettingChange} className="w-full accent-emas" />
                    <span className="text-slate-600 font-semibold w-8 text-right">{settings.running_text_speed || '10'}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Semakin besar angkanya, semakin cepat jalannya.</p>
                </div>
                <div className="mb-4">
                  <label className="block mb-2 text-slate-500 text-sm">URL Stream Mekkah (YouTube Embed)</label>
                  <input type="text" name="mecca_stream_url" value={settings.mecca_stream_url} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                </div>
                <div className="mb-4 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="mecca_stream_enabled"
                    checked={settings.mecca_stream_enabled !== '0'}
                    onChange={e => setSettings({ ...settings, mecca_stream_enabled: e.target.checked ? '1' : '0' })}
                    className="w-5 h-5 accent-emas"
                  />
                  <label htmlFor="mecca_stream_enabled" className="text-slate-700">Tampilkan Livestream Mekkah</label>
                </div>
                <div className="mb-4 flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${settings.mecca_stream_valid === '0' ? 'bg-red-100 text-red-600' : 'bg-emas/15 text-emas-dark'}`}>
                    {settings.mecca_stream_valid === '0' ? 'URL tidak valid — dilewati TV' : 'URL OK / belum dicek'}
                  </span>
                  <button type="button" onClick={handleCheckStream} disabled={syncing} className="text-sm text-emas hover:underline disabled:opacity-50">
                    {syncing ? 'Memeriksa...' : 'Cek URL sekarang'}
                  </button>
                </div>
                <div className="mb-4">
                  <label className="block mb-2 text-slate-500 text-sm">Mode Slideshow</label>
                  <select name="slideshow_mode" value={settings.slideshow_mode || 'auto'} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors">
                    <option value="auto">Otomatis (Berotasi 30 detik)</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                {settings.slideshow_mode === 'manual' && (
                  <div>
                    <label className="block mb-2 text-slate-500 text-sm">Pilih Slide Aktif</label>
                    <select name="slideshow_manual_slide" value={settings.slideshow_manual_slide || 'wallpaper'} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors">
                      <option value="wallpaper">Wallpaper</option>
                      <option value="quote">Quotes</option>
                      <option value="mecca">Livestream Mekkah</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="bg-white shadow-sm backdrop-blur-xl border border-slate-200 rounded-2xl p-6">
                <h3 className="mb-4 text-slate-800 border-b border-slate-200 pb-3 font-medium">Lokasi & Waktu</h3>
                <div className="mb-4">
                  <label className="block mb-2 text-slate-500 text-sm">Latitude</label>
                  <input type="text" name="latitude" value={settings.latitude} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                </div>
                <div className="mb-4">
                  <label className="block mb-2 text-slate-500 text-sm">Longitude</label>
                  <input type="text" name="longitude" value={settings.longitude} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                </div>
                <div>
                  <label className="block mb-2 text-slate-500 text-sm">Koreksi Hijriah (Hari)</label>
                  <input type="number" name="hijri_adjustment" value={settings.hijri_adjustment} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                </div>
              </div>

              <div className="bg-white shadow-sm backdrop-blur-xl border border-slate-200 rounded-2xl p-6">
                <h3 className="mb-4 text-slate-800 border-b border-slate-200 pb-3 font-medium">Jeda Iqamah (Menit)</h3>
                <div className="flex flex-col md:flex-row gap-3 mb-4">
                  <div className="w-full md:w-1/2">
                    <label className="block mb-2 text-slate-500 text-sm">Subuh</label>
                    <input type="number" name="iqamah_fajr" value={settings.iqamah_fajr || ''} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                  </div>
                  <div className="w-full md:w-1/2">
                    <label className="block mb-2 text-slate-500 text-sm">Dzuhur</label>
                    <input type="number" name="iqamah_dhuhr" value={settings.iqamah_dhuhr || ''} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-3 mb-4">
                  <div className="w-full md:w-1/2">
                    <label className="block mb-2 text-slate-500 text-sm">Ashar</label>
                    <input type="number" name="iqamah_asr" value={settings.iqamah_asr || ''} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                  </div>
                  <div className="w-full md:w-1/2">
                    <label className="block mb-2 text-slate-500 text-sm">Maghrib</label>
                    <input type="number" name="iqamah_maghrib" value={settings.iqamah_maghrib || ''} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-slate-500 text-sm">Isya</label>
                  <input type="number" name="iqamah_isha" value={settings.iqamah_isha || ''} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                </div>
              </div>

              <div className="bg-white shadow-sm backdrop-blur-xl border border-slate-200 rounded-2xl p-6">
                <h3 className="mb-4 text-slate-800 border-b border-slate-200 pb-3 font-medium">Koreksi Jadwal (Menit)</h3>
                <p className="text-xs text-slate-500 mb-4">Basis: Kemenag (Subuh 20°, Isya 18°, Ashar Syafi'i) + ikhtiyat. Angka di bawah = sisa koreksi, terukur pas di 3 musim. Negatif = majukan, positif = mundurkan.</p>
                <div className="mb-4">
                  <label className="block mb-2 text-slate-500 text-sm">Ikhtiyat (pengaman, tidak untuk Syuruq)</label>
                  <input type="number" name="ikhtiyat" value={settings.ikhtiyat ?? ''} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block mb-2 text-slate-500 text-sm">Subuh</label>
                    <input type="number" name="adjust_fajr" value={settings.adjust_fajr ?? ''} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                  </div>
                  <div>
                    <label className="block mb-2 text-slate-500 text-sm">Syuruq</label>
                    <input type="number" name="adjust_sunrise" value={settings.adjust_sunrise ?? ''} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                  </div>
                  <div>
                    <label className="block mb-2 text-slate-500 text-sm">Dzuhur</label>
                    <input type="number" name="adjust_dhuhr" value={settings.adjust_dhuhr ?? ''} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                  </div>
                  <div>
                    <label className="block mb-2 text-slate-500 text-sm">Ashar</label>
                    <input type="number" name="adjust_asr" value={settings.adjust_asr ?? ''} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                  </div>
                  <div>
                    <label className="block mb-2 text-slate-500 text-sm">Maghrib</label>
                    <input type="number" name="adjust_maghrib" value={settings.adjust_maghrib ?? ''} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                  </div>
                  <div>
                    <label className="block mb-2 text-slate-500 text-sm">Isya</label>
                    <input type="number" name="adjust_isha" value={settings.adjust_isha ?? ''} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                  </div>
                </div>
              </div>

              <div className="bg-white shadow-sm backdrop-blur-xl border border-slate-200 rounded-2xl p-6">
                <h3 className="mb-4 text-slate-800 border-b border-slate-200 pb-3 font-medium">Jadwal Kemenag (Sinkron Otomatis)</h3>
                <p className="text-xs text-slate-500 mb-4">TV memakai jadwal resmi ini bila tersedia; bila belum sync / offline lama, otomatis pakai hitungan lokal sebagai fallback.</p>
                <div className="mb-4">
                  <label className="block mb-2 text-slate-500 text-sm">ID Kota (1219 = Kota Bandung)</label>
                  <input type="text" name="schedule_city_id" value={settings.schedule_city_id || ''} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                  <p className="text-xs text-slate-500 mt-1">Simpan Pengaturan dulu bila ID diubah, baru tekan Sinkronkan.</p>
                </div>
                <div className="text-sm text-slate-600 mb-4">
                  <div>Kota: <span className="font-medium text-slate-800">{schedStatus?.city_name || '-'}</span></div>
                  <div>Sync terakhir: <span className="font-medium text-slate-800">{schedStatus?.last_sync ? new Date(schedStatus.last_sync).toLocaleString('id-ID') : 'belum pernah'}</span></div>
                  <div>Hari tersimpan: <span className="font-medium text-slate-800">{schedStatus?.days_stored ?? '-'}</span></div>
                </div>
                <button type="button" onClick={handleSyncSchedule} disabled={syncing} className="bg-emas text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-emas-dark transition-colors shadow-lg disabled:opacity-50">
                  {syncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
                </button>
              </div>

            </div>

            <button type="submit" className="mt-6 bg-emas text-white font-semibold py-3 px-6 rounded-lg hover:bg-emas-dark transition-colors shadow-lg">Simpan Pengaturan</button>
          </form>
        )}

        {activeTab === 'testing' && (
          <form onSubmit={handleSaveSettings}>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
              <div className="bg-white shadow-sm backdrop-blur-xl border border-slate-200 rounded-2xl p-6">
                <h3 className="mb-4 text-slate-800 border-b border-slate-200 pb-3 font-medium">Simulasi Waktu</h3>
                <div className="mb-4 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="use_mock_time"
                    checked={settings.use_mock_time === '1'}
                    onChange={e => setSettings({ ...settings, use_mock_time: e.target.checked ? '1' : '0' })}
                    className="w-5 h-5 accent-emas"
                  />
                  <label htmlFor="use_mock_time" className="text-slate-700">Gunakan Waktu Simulasi</label>
                </div>
                <div>
                  <label className="block mb-2 text-slate-500 text-sm">Atur Waktu (Jam:Menit)</label>
                  <div className="flex gap-2">
                    <input type="time" name="mock_time" value={settings.mock_time || '12:00'} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Untuk testing layar Adhan/Iqomah. Ubah waktu ini menjadi 5 menit sebelum jadwal sholat.</p>
                </div>
              </div>

              <div className="bg-white shadow-sm backdrop-blur-xl border border-slate-200 rounded-2xl p-6">
                <h3 className="mb-4 text-slate-800 border-b border-slate-200 pb-3 font-medium">Simulasi Hari Jumat</h3>
                <div className="mb-4 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="use_mock_friday"
                    checked={settings.use_mock_friday === '1'}
                    onChange={e => setSettings({ ...settings, use_mock_friday: e.target.checked ? '1' : '0' })}
                    className="w-5 h-5 accent-emas"
                  />
                  <label htmlFor="use_mock_friday" className="text-slate-700">Anggap Sekarang Hari Jumat</label>
                </div>
                <p className="text-xs text-slate-500">Jika diaktifkan, panel khusus hari jumat (Khatib dll) akan muncul walaupun hari ini bukan hari jumat.</p>
              </div>
              <div className="bg-white shadow-sm backdrop-blur-xl border border-slate-200 rounded-2xl p-6">
                <h3 className="mb-4 text-slate-800 border-b border-slate-200 pb-3 font-medium">Paksa Mode Layar (Testing)</h3>
                <div className="mb-4">
                  <label className="block mb-2 text-slate-500 text-sm">Pilih Layar yang Ingin Ditampilkan</label>
                  <select name="force_screen_mode" value={settings.force_screen_mode || 'auto'} onChange={handleSettingChange} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors">
                    <option value="auto">Normal (Otomatis ikuti waktu)</option>
                    <option value="countdown">Menjelang Adzan (Hitung Mundur)</option>
                    <option value="adhan">Layar Berkumandang Adzan (1 menit)</option>
                    <option value="iqamah">Menjelang Iqomah (Hitung Mundur)</option>
                    <option value="iqamah-moment">Layar Iqomah</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-2">Guna melihat atau mengedit desain layar peringatan tanpa perlu mengubah jam simulasi.</p>
                </div>
              </div>

            </div>
            <button type="submit" className="mt-6 bg-emas text-white font-semibold py-3 px-6 rounded-lg hover:bg-emas-dark transition-colors shadow-lg">Simpan Pengujian</button>
          </form>
        )}

        {activeTab === 'announcements' && (
          <div>
            <div className="bg-white shadow-sm backdrop-blur-xl border border-slate-200 rounded-2xl p-6">
              <h3 className="mb-4 text-slate-800 border-b border-slate-200 pb-3 font-medium">Tambah Running Text</h3>
              <form onSubmit={handleAddAnnouncement} className="flex flex-col md:flex-row gap-4 md:items-end">
                <div className="flex-1">
                  <label className="block mb-2 text-slate-500 text-sm">Teks Running Text (tampil di TV bawah)</label>
                  <input type="text" value={newAnnText} onChange={e => setNewAnnText(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" required />
                </div>
                <button type="submit" className="bg-emas text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-emas-dark transition-colors shadow-lg">Tambah</button>
              </form>
            </div>

            <div className="bg-white shadow-sm backdrop-blur-xl border border-slate-200 rounded-2xl p-6 mt-6">
              <h3 className="mb-4 text-slate-800 border-b border-slate-200 pb-3 font-medium">Daftar Running Text Aktif</h3>
              <div className="overflow-x-auto">
              <table className="w-full border-collapse mt-5 min-w-[500px]">
                <thead>
                  <tr>
                    <th className="p-4 text-left border-b border-slate-200 text-slate-500 font-medium text-sm">Teks</th>
                    <th className="p-4 text-left border-b border-slate-200 text-slate-500 font-medium text-sm">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.map(ann => (
                    <tr key={ann.id}>
                      <td className="p-4 border-b border-slate-100">{ann.text}</td>
                      <td className="p-4 border-b border-slate-100">
                        <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-red-400 hover:text-red-300">Hapus</button>
                      </td>
                    </tr>
                  ))}
                  {announcements.length === 0 && (
                    <tr>
                      <td colSpan={2} className="p-4 text-center text-slate-500">Belum ada running text</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quotes' && (
          <div>
            <div className="bg-white shadow-sm backdrop-blur-xl border border-slate-200 rounded-2xl p-6">
              <h3 className="mb-4 text-slate-800 border-b border-slate-200 pb-3 font-medium">Tambah Quote Baru</h3>
              <form onSubmit={handleAddQuote} className="flex flex-col gap-4">
                <div>
                  <label className="block mb-2 text-slate-500 text-sm">Teks Arab (Opsional)</label>
                  <input type="text" value={newQuote.text_arabic} onChange={e => setNewQuote({ ...newQuote, text_arabic: e.target.value })} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors font-arabic text-xl" dir="rtl" />
                </div>
                <div>
                  <label className="block mb-2 text-slate-500 text-sm">Terjemahan / Teks Quote</label>
                  <input type="text" value={newQuote.text_translation} onChange={e => setNewQuote({ ...newQuote, text_translation: e.target.value })} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" required />
                </div>
                <div>
                  <label className="block mb-2 text-slate-500 text-sm">Sumber (Opsional)</label>
                  <input type="text" value={newQuote.source} onChange={e => setNewQuote({ ...newQuote, source: e.target.value })} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" />
                </div>
                <div className="flex justify-end mt-2">
                  <button type="submit" className="bg-emas text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-emas-dark transition-colors shadow-lg">Tambah Quote</button>
                </div>
              </form>
            </div>

            <div className="bg-white shadow-sm backdrop-blur-xl border border-slate-200 rounded-2xl p-6 mt-6">
              <h3 className="mb-4 text-slate-800 border-b border-slate-200 pb-3 font-medium">Daftar Quotes (Template background di-assign otomatis 1-5)</h3>
              <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 mt-5">
                {quotes.map((q) => (
                  <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-2 right-2 px-2 py-1 bg-slate-100 text-xs rounded-md text-slate-500">Template {(q.id % 5) + 1}</div>

                    {q.text_arabic && (
                      <div className="font-arabic text-xl text-dprd-lightgold text-right mb-2 mt-4">{q.text_arabic}</div>
                    )}
                    <div className="text-slate-800 text-md font-medium mb-1 {q.text_arabic ? '' : 'mt-4'}">{q.text_translation}</div>
                    <div className="text-emas text-sm mt-auto pt-4">{q.source}</div>

                    <button onClick={() => handleDeleteQuote(q.id)} className="absolute bottom-4 right-4 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-sm transition-colors opacity-0 group-hover:opacity-100">
                      Hapus
                    </button>
                  </div>
                ))}
                {quotes.length === 0 && (
                  <div className="col-span-full p-4 text-center text-slate-500">Belum ada quote</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wallpapers' && (
          <div>
            <div className="bg-white shadow-sm backdrop-blur-xl border border-slate-200 rounded-2xl p-6">
              <h3 className="mb-4 text-slate-800 border-b border-slate-200 pb-3 font-medium">Upload Wallpaper Baru</h3>
              <form onSubmit={handleUploadWallpaper} className="flex flex-col md:flex-row gap-4 md:items-end">
                <div className="flex-1">
                  <label className="block mb-2 text-slate-500 text-sm">Pilih File Gambar (JPG/PNG)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emas file:text-white hover:file:bg-emas-dark"
                    required
                  />
                </div>
                <button type="submit" className="bg-emas text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-emas-dark transition-colors shadow-lg">Upload</button>
              </form>
            </div>

            <div className="bg-white shadow-sm backdrop-blur-xl border border-slate-200 rounded-2xl p-6 mt-6">
              <h3 className="mb-4 text-slate-800 border-b border-slate-200 pb-3 font-medium">Daftar Wallpaper</h3>
              <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-6 mt-5">
                {wallpapers.map((wp) => (
                  <div key={wp.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col group">
                    <div className="h-[150px] w-full overflow-hidden bg-black/50 relative">
                      <img src={`${API_BASE_URL}/uploads/${wp.filename}`} alt={wp.original_name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <div className="text-slate-800 text-sm font-medium truncate mb-2" title={wp.original_name}>{wp.original_name}</div>
                      <button onClick={() => handleDeleteWallpaper(wp.id)} className="mt-auto bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-sm transition-colors self-end">
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
                {wallpapers.length === 0 && (
                  <div className="col-span-full p-4 text-center text-slate-500">Belum ada wallpaper yang diupload</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'friday' && (
          <div>
            <div className="bg-white shadow-sm backdrop-blur-xl border border-slate-200 rounded-2xl p-6">
              <h3 className="mb-4 text-slate-800 border-b border-slate-200 pb-3 font-medium">Tambah Data Jumat</h3>
              <form onSubmit={handleAddFriday} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block mb-2 text-slate-500 text-sm">Tanggal (Jumat)</label>
                    <input type="date" value={newFriday.date} onChange={e => setNewFriday({ ...newFriday, date: e.target.value })} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" required />
                  </div>
                  <div>
                    <label className="block mb-2 text-slate-500 text-sm">Nama Khatib</label>
                    <input type="text" value={newFriday.khatib_name} onChange={e => setNewFriday({ ...newFriday, khatib_name: e.target.value })} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" required />
                  </div>
                  <div>
                    <label className="block mb-2 text-slate-500 text-sm">Nama Muadzin</label>
                    <input type="text" value={newFriday.muadzin_name} onChange={e => setNewFriday({ ...newFriday, muadzin_name: e.target.value })} className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block mb-2 text-slate-500 text-sm">Total Pemasukan</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500">Rp</div>
                      <input type="text" value={formatInputRupiah(newFriday.income)} onChange={e => handleCurrencyChange('income', e.target.value)} className="w-full bg-white border border-slate-200 text-slate-900 pl-11 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2 text-slate-500 text-sm">Total Pengeluaran</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500">Rp</div>
                      <input type="text" value={formatInputRupiah(newFriday.expense)} onChange={e => handleCurrencyChange('expense', e.target.value)} className="w-full bg-white border border-slate-200 text-slate-900 pl-11 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2 text-slate-500 text-sm">Kas Saldo Saat Ini</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500">Rp</div>
                      <input type="text" value={formatInputRupiah(newFriday.balance)} onChange={e => handleCurrencyChange('balance', e.target.value)} className="w-full bg-white border border-slate-200 text-slate-900 pl-11 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-emas transition-colors" placeholder="0" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-2">
                  <button type="submit" className="bg-emas text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-emas-dark transition-colors shadow-lg">Tambah Data</button>
                </div>
              </form>
            </div>

            <div className="bg-white shadow-sm backdrop-blur-xl border border-slate-200 rounded-2xl p-6 mt-6">
              <h3 className="mb-4 text-slate-800 border-b border-slate-200 pb-3 font-medium">Riwayat Data Jumat</h3>
              <div className="overflow-x-auto">
              <table className="w-full border-collapse mt-5 min-w-[700px]">
                <thead>
                  <tr>
                    <th className="p-4 text-left border-b border-slate-200 text-slate-500 font-medium text-sm">Tanggal</th>
                    <th className="p-4 text-left border-b border-slate-200 text-slate-500 font-medium text-sm">Khatib</th>
                    <th className="p-4 text-left border-b border-slate-200 text-slate-500 font-medium text-sm">Muadzin</th>
                    <th className="p-4 text-left border-b border-slate-200 text-slate-500 font-medium text-sm">Pemasukan</th>
                    <th className="p-4 text-left border-b border-slate-200 text-slate-500 font-medium text-sm">Pengeluaran</th>
                    <th className="p-4 text-left border-b border-slate-200 text-slate-500 font-medium text-sm">Kas Saldo</th>
                    <th className="p-4 text-left border-b border-slate-200 text-slate-500 font-medium text-sm">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {fridayRecords.map(rec => (
                    <tr key={rec.id}>
                      <td className="p-4 border-b border-slate-100">{rec.date}</td>
                      <td className="p-4 border-b border-slate-100">{rec.khatib_name}</td>
                      <td className="p-4 border-b border-slate-100">{rec.muadzin_name || '-'}</td>
                      <td className="p-4 border-b border-slate-100">Rp {Number(rec.income).toLocaleString('id-ID')}</td>
                      <td className="p-4 border-b border-slate-100">Rp {Number(rec.expense).toLocaleString('id-ID')}</td>
                      <td className="p-4 border-b border-slate-100">Rp {Number(rec.balance).toLocaleString('id-ID')}</td>
                      <td className="p-4 border-b border-slate-100">
                        <button onClick={() => handleDeleteFriday(rec.id)} className="text-red-400 hover:text-red-300">Hapus</button>
                      </td>
                    </tr>
                  ))}
                  {fridayRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500">Belum ada data Jumat</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl bg-emas text-slate-800 font-medium shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all duration-300 z-[2000] ${toast ? 'translate-y-0 opacity-100' : 'translate-y-[100px] opacity-0'}`}>
        {toast}
      </div>
    </div>
  );
};

export default Admin;
