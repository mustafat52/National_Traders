import type { Config } from 'tailwindcss';
/** National Traders brand: black, gold and ivory (from the company logo). */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Hind', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      colors: {
        ink: '#161310', steel: '#6E6657', paper: '#F7F3EA', panel: '#FFFFFF', line: '#E7DFCC',
        // soft tints: a light background plus a deeper text colour from the same family
        sage: { bg: '#F3E7C6', mid: '#D7B96B', fg: '#5B430E' },     // champagne gold: the main brand tint
        butter: { bg: '#F8D9B0', fg: '#86440A' },                    // warm amber: warnings
        blush: { bg: '#F4D8D2', fg: '#9A3524' },                     // brick red: alerts and losses
        sky: { bg: '#E1E7EE', fg: '#33506B' },                       // cool grey-blue: information
        lilac: { bg: '#E8E3EC', fg: '#574767' },                     // muted plum: information
        good: '#2F6B3A',                                             // profit and "all good" figures
        gold: { DEFAULT: '#B8892B', light: '#D4A941', deep: '#8A6416' },
        // "brand" is the primary action colour: the black of the logo
        brand: { DEFAULT: '#161310', light: '#3B332A', soft: '#F4EDDA' },
        // old screens use the slate scale: remapped to warm neutrals so they match the new theme
        slate: { 50: '#FAF7F0', 100: '#F3EEE2', 200: '#E7DFCC', 300: '#D5CAB0', 400: '#9C9482', 500: '#6E6657', 600: '#585143', 700: '#433D32', 800: '#2A261F', 900: '#161310' },
      },
    },
  },
  plugins: [],
};
export default config;