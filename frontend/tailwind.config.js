/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C4DFF',
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#7C4DFF', // Vivid Purple for dark mode
          700: '#6d3ce8',
          800: '#5e2dd1',
          900: '#4f1fba',
        },
        secondary: {
          DEFAULT: '#00E5FF',
        },
        accent: {
          DEFAULT: '#FF4081',
          indigo: '#6366f1',
          blue: '#3b82f6',
          purple: '#8b5cf6',
          cyan: '#06b6d4',
          pink: '#FF4081',
        },
        danger: {
          DEFAULT: '#FF1744',
        },
        'surface-dark': '#0A0A0A',
        'surface-card': '#111111',
        'border-dark': '#333333',
        'border-light': '#E0E0E0',
        charcoal: '#36454F',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
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
      },
    },
  },
  plugins: [],
}
