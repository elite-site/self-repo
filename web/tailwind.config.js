/** @type {import('tailwindcss').Config} */
export default {
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
          lightgray: '#E8E8E8',
          border: '#E8E8E8',
          muted: '#666666',
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
