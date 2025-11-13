import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#16a34a', // green-600
        'primary-dark': '#15803d', // green-700
        'primary-light': '#22c55e', // green-500
        'background-light': '#FFFFFF',
        'background-dark': '#000000',
      },
      fontFamily: {
        display: ["'Playfair Display'", 'serif'],
        sans: ["'Plus Jakarta Sans'", "'Inter'", 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
      },
    },
  },
  plugins: [],
}
export default config

