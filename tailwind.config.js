/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#8ec5fc',
          DEFAULT: '#4f9dd6',
          dark: '#2d679a',
        },
        accent: {
          light: '#9be7d7',
          DEFAULT: '#4fc5aa',
          dark: '#2c8873',
        },
        neutral: {
          100: '#f8fafc',
          200: '#e2e8f0',
          400: '#94a3b8',
          600: '#475569',
          800: '#1e293b',
        },
        heroStart: '#edf6ff',
        heroEnd: '#f0fdf9',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        display: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 15px 45px rgba(79, 157, 214, 0.15)',
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
  plugins: [],
};
