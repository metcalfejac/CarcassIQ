/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf2f2',
          100: '#fce4e4',
          200: '#f8caca',
          300: '#f1a3a3',
          400: '#e66f6f',
          500: '#d84343',
          600: '#c22a2a',
          700: '#a11f1f',
          800: '#7f1d1d',
          900: '#601a1a',
        },
      },
    },
  },
  plugins: [],
};
