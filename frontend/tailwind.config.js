/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dprd: {
          gold: '#D09656',
          lightgold: '#EBC071',
          cream: '#F5D8AE'
        },
        // Emas netralitas DPRD: emas tua untuk panel & tombol (aman untuk teks putih),
        // menggantikan hijau (#097969/#00a651) di seluruh app.
        emas: {
          DEFAULT: '#7E6113',
          dark: '#6B5010',
          light: '#EBC071'
        },
        primary: '#1e293b', // slate-800
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        arabic: ['Amiri', 'serif']
      },
      animation: {
        marquee: 'marquee var(--ticker-duration, 30s) linear infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        }
      }
    },
  },
  plugins: [],
}
