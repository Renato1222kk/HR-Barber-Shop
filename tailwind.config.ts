import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        // Celulares muito estreitos (320–379px) ficam em uma coluna; a
        // partir daqui cabem dois cards lado a lado sem cortar valores.
        xs: '380px',
      },
      colors: {
        /**
         * Paleta clara "premium": branco nas superfícies, cinza muito claro
         * no fundo e grafite no texto. A escala segue a convenção do Tailwind
         * (número baixo = claro), então `bg-ink-50` é fundo e `text-ink-900`
         * é o texto principal.
         */
        ink: {
          50: '#f8f9fa', // fundo principal da aplicação
          100: '#f3f4f6', // hover / áreas secundárias
          200: '#e5e7eb', // bordas
          300: '#d1d5db', // bordas em destaque
          400: '#9ca3af', // texto terciário, ícones apagados
          500: '#6b7280', // texto secundário
          600: '#4b5563', // ícones e texto de apoio
          700: '#374151', // grafite
          800: '#1f2937',
          900: '#111827', // texto principal
          950: '#111111', // preto de destaque (botões primários)
        },
        // Dourado discreto: só em detalhes pequenos (ícones, filetes).
        gold: {
          DEFAULT: '#c59b3d',
          50: '#faf6ec',
          100: '#f2e8cd',
          200: '#e6d2a0',
          300: '#d8bb72',
          400: '#cda954',
          500: '#c59b3d',
          600: '#a37f2f',
          700: '#7d6124',
        },
        status: {
          agendado: '#2563eb',
          confirmado: '#16a34a',
          atendido: '#c59b3d',
          faltou: '#dc2626',
          cancelado: '#6b7280',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Sombras discretas — o contraste vem das bordas, não do peso.
        soft: '0 8px 28px -12px rgba(17, 24, 39, 0.18)',
        card: '0 1px 2px 0 rgba(17, 24, 39, 0.04), 0 1px 3px 0 rgba(17, 24, 39, 0.06)',
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
