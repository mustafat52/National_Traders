import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Hind', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#17262B', steel: '#5E7077', paper: '#F2F5F3', panel: '#FFFFFF', line: '#E1E8E5',
        // paint-chip tints: soft background + deeper text colour from the same family
        sage: { bg: '#DCEBE3', mid: '#A8CDBF', fg: '#14504A' },
        butter: { bg: '#F8EBC4', fg: '#7A5B0C' },
        blush: { bg: '#F6DDD7', fg: '#94402F' },
        sky: { bg: '#DDE9F4', fg: '#2D5E8A' },
        lilac: { bg: '#E7E3F5', fg: '#5A4B9B' },
        // existing pages use "brand"; pointed at the new theme so every screen inherits it
        brand: { DEFAULT: '#1F6F68', light: '#2F8A82', soft: '#E6EFEB' },
      },
    },
  },
  plugins: [],
};
export default config;