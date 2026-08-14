import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'DPRD Mosque Display',
        short_name: 'MosqueDisplay',
        description: 'Display waktu sholat masjid untuk TV',
        theme_color: '#00a651',
        background_color: '#1e293b',
        display: 'standalone',
        icons: [
          {
            src: '/assets/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/assets/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000'
    }
  }
})
