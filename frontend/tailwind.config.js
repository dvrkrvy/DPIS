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
        'surface-dark': '#050505',
        'surface-card': '#0F0F0F',
        'border-dark': '#2A2A2A',
        'surface-light': '#FFFFFF',
        'border-light': '#E5E5E5',
        'text-main': '#000000',
        'text-muted': '#525252',
        'bg-deep': '#050505',
        'bg-black': '#000000',
        'primary-accent': '#8B5CF6',
        charcoal: '#1A1A1A',
      },
      fontFamily: {
        'space-grotesk': ['Space Grotesk', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scroll-text': 'scroll-text 30s linear infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
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
        'scroll-text': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(124, 77, 255, 0.5)' },
          '50%': { opacity: '.8', boxShadow: '0 0 10px rgba(124, 77, 255, 0.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'mesh-card': 'radial-gradient(at 0% 0%, rgba(124, 77, 255, 0.08) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(0, 229, 255, 0.05) 0px, transparent 50%)',
        'mesh-light': 'radial-gradient(at 0% 0%, rgba(161, 0, 255, 0.03) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(0, 229, 255, 0.03) 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
}
