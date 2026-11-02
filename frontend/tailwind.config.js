/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5ff',
          100: '#e0ebff',
          200: '#c7d9fe',
          300: '#a3c0fd',
          400: '#759bfb',
          500: '#4871f7',
          600: '#2b50ed',
          700: '#1d38d9',
          800: '#1e30af',
          900: '#1e2d8a',
          950: '#0f172a', // Deep Government Navy
        },
        navy: {
          800: '#132338',
          900: '#0c1828',
          950: '#07101b',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}

