import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dprd.mosque',
  appName: 'Masjid Asy Syura',
  webDir: 'dist',
  server: {
    url: 'http://masjid.perdinkeuangan.online',
    cleartext: true,
    allowNavigation: ["masjid.perdinkeuangan.online", "*.perdinkeuangan.online"]
  }
};

export default config;
