import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Botanical, boutique palette suited to soap / cosmetic branding.
        gaia: {
          50: '#f3f7f2',
          100: '#e2ece0',
          200: '#c6d9c3',
          300: '#9fbe9b',
          400: '#739d6f',
          500: '#52814e',
          600: '#3f673c',
          700: '#335231',
          800: '#2b422a',
          900: '#243824',
        },
        clay: {
          50: '#faf6f2',
          100: '#f1e7dc',
          200: '#e2ccb6',
          300: '#d0ac89',
          400: '#c08f63',
          500: '#b0764a',
          600: '#98603c',
          700: '#7c4c33',
          800: '#663f2f',
          900: '#55362a',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Cormorant Garamond', 'serif'],
      },
      boxShadow: {
        panel: '0 10px 30px -12px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
} satisfies Config;
