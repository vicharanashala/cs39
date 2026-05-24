/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f6fc',
          100: '#e8ecf9',
          200: '#cbd5f0',
          300: '#9eafd2',
          400: '#6d85c1',
          500: '#4c65a9',
          600: '#3a4d8b',
          700: '#303f72',
          800: '#2c365f',
          900: '#1b203a',
          950: '#0f111f',
        },
        iitr: {
          navy: '#002147',      // Official Navy
          gold: '#FF9933',      // Warm Amber/Saffron Gold
          accent: '#1e3a8a',    // Rich blue
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
