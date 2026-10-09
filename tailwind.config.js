/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ============================================================
         * Paleta da marca — CINZA ESCURO (substituiu o vermelho).
         * `primary`/`accent` = cinza grafite (botões, links, destaques).
         * `cherry`          = cinza ainda mais escuro (menu lateral).
         * `error`           = cinza grafite escuro (ações destrutivas),
         *                     propositalmente mais escuro que `primary`
         *                     para continuar transmitindo "perigo".
         * ============================================================ */
        primary: {
          50: '#f7f8f9',
          100: '#eceef1',
          200: '#d6dadf',
          300: '#b2b9c0',
          400: '#8a9199',
          500: '#666d75',
          600: '#4d545b',
          700: '#3d434a',
          800: '#2d3237',
          900: '#21252a',
          950: '#14171a',
        },
        accent: {
          50: '#f7f8f9',
          100: '#edeff1',
          200: '#d8dce0',
          300: '#b6bcc3',
          400: '#8f979f',
          500: '#5f676f',
          600: '#49545c',
          700: '#3a444b',
          800: '#2b3238',
          900: '#20262b',
          950: '#14181b',
        },
        // Cinza escuro — fundo do menu lateral
        cherry: {
          50: '#f7f8f9',
          100: '#eaecef',
          200: '#d2d6da',
          300: '#aab0b7',
          400: '#7c848c',
          500: '#5b636b',
          600: '#444c54',
          700: '#363d44',
          800: '#272d33',
          900: '#1c2126',
          950: '#12161a',
        },
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Cinza grafite escuro — ações destrutivas/erros (era vermelho)
        error: {
          50: '#f6f7f8',
          100: '#eaebee',
          200: '#d3d5d9',
          300: '#adafb5',
          400: '#7f828a',
          500: '#5f6269',
          600: '#45474d',
          700: '#34363a',
          800: '#25262a',
          900: '#1a1b1e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
