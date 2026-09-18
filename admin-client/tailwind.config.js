/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        elite: {
          white: '#FFFFFF',
          offwhite: '#FAFAFA',
          red: '#D71920',
          darkred: '#B5121B',
          black: '#111111',
          darkgray: '#333333',
          muted: '#6B6B6B',
          border: '#E5E5E5',
          lightgray: '#F5F5F5',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
