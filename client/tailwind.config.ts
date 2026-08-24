import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        brand: {
          50: '#F7F4EC',
          100: '#E8D4A3',
          200: '#E3C683',
          300: '#D9B76A',
          400: '#C9A45C',
          500: '#B88F3D',
          600: '#99742B',
          700: '#7A5B1E',
          800: '#5C4416',
          900: '#3D2C0D',
          950: '#1F1506',
        },
        slate: {
          50: '#F8F6F0',
          100: '#E9E5DC',
          200: '#D4CFC4',
          300: '#BAB4A7',
          400: '#A19A8A',
          500: '#6F6A60',
          600: '#524E46',
          700: '#38352F',
          800: '#171512',
          900: '#11110F',
          950: '#0A0A09',
        },
        dark: '#171717',
      },
    },
  },
  plugins: [],
} satisfies Config;
