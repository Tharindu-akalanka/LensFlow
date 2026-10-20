/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Curated harmony color palettes
        primary: {
          50: '#f5f7fa',
          100: '#eaeef4',
          200: '#d0daf5',
          300: '#a6bbf0',
          400: '#7292e8',
          500: '#4c6ee3', // Signature brand blue
          600: '#354ebc',
          700: '#2a3b96',
          800: '#1c2664',
          900: '#141a45',
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b', // Deep workspace background
          900: '#0f172a',
          950: '#020617', // Pitch black dark mode
        },
        accent: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          505: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
