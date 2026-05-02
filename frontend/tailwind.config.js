/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63'
        },
        surface: '#0a0f1c',
        card: '#111a2e'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34,211,238,0.2), 0 12px 32px rgba(6,182,212,0.12)'
      },
      backgroundImage: {
        noise: 'radial-gradient(circle at 25% 20%, rgba(34,211,238,0.14), transparent 42%), radial-gradient(circle at 80% 0%, rgba(148,163,184,0.16), transparent 35%)'
      }
    }
  },
  plugins: []
};
