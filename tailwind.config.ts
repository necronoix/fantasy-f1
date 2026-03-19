import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        f1: {
          red: '#E8002D',
          'red-dark': '#B30022',
          black: '#15151E',
          'black-light': '#1E1E2E',
          'gray-dark': '#2A2A3A',
          'gray-mid': '#3A3A4A',
          gray: '#6B6B7B',
          'gray-light': '#9B9BAB',
          white: '#FFFFFF',
          silver: '#C0C0C0',
          gold: '#FFD700',
          bronze: '#CD7F32',
        },
      },
      fontFamily: {
        f1: ['var(--font-f1)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'f1-stripe': 'repeating-linear-gradient(45deg, #E8002D, #E8002D 2px, transparent 2px, transparent 6px)',
        'f1-subtle-grid': 'linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)',
      },
      boxShadow: {
        'f1-glow': '0 0 20px rgba(232, 0, 45, 0.3)',
        'f1-glow-sm': '0 0 10px rgba(232, 0, 45, 0.2)',
        'card-glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'inner-glow': 'inset 0 0 20px rgba(232, 0, 45, 0.1)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-red': 'pulse-red 1s ease-in-out infinite',
        'countdown': 'countdown linear forwards',
        'slide-in-down': 'slide-in-down 0.5s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'stripe-animate': 'stripe-animate 3s linear infinite',
        'position-change': 'position-change 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(232, 0, 45, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(232, 0, 45, 0)' },
        },
        'slide-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(232, 0, 45, 0.4)' },
          '50%': { boxShadow: '0 0 25px rgba(232, 0, 45, 0.6)' },
        },
        'stripe-animate': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '8px 0' },
        },
        'position-change': {
          '0%': { opacity: '0.5', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      transitionTimingFunction: {
        'f1-ease': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}

export default config
