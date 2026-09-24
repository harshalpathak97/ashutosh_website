import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#fbf5ea',
        navy: '#1f3566',
        orange: '#ff8a1f',
        teal: '#14a3b8',
      },
      fontFamily: {
        urbanist: ['Urbanist', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
