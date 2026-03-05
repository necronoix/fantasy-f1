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
        },
      },
      fontFamily: {
        f1: ['var(--font-f1)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'pulse-red': 'pulse-red 1s ease-in-out infinite',
        'countdown': 'countdown linear forwards',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(232, 0, 45, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(232, 0, 45, 0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
