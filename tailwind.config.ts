import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Premium dark palette
        ink: {
          950: '#0a0a0b',
          900: '#111113',
          850: '#17171a',
          800: '#1d1d21',
          700: '#26262b',
          600: '#33333a',
          500: '#4a4a52',
        },
        gold: {
          DEFAULT: '#c9a24b',
          50: '#faf5e8',
          100: '#f0e3c0',
          200: '#e3cd8f',
          300: '#d6b75f',
          400: '#cba94f',
          500: '#c9a24b',
          600: '#a9842f',
          700: '#856626',
        },
        status: {
          agendado: '#3b82f6',
          confirmado: '#22c55e',
          atendido: '#c9a24b',
          faltou: '#ef4444',
          cancelado: '#6b7280',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 24px -4px rgba(0, 0, 0, 0.5)',
        card: '0 2px 16px -2px rgba(0, 0, 0, 0.4)',
        gold: '0 4px 20px -4px rgba(201, 162, 75, 0.4)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'scale-in': 'scale-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
