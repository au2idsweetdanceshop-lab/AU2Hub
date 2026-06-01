/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./*.js"
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['Plus Jakarta Sans', 'sans-serif'] },
      colors: {
        brand: {
          dark: '#0C0F19',
          card: '#161B2E',
          accent: '#FF7EBA',
          info: '#46B3FF',
          purple: '#A277FF',
          success: '#2BD975'
        }
      }
    }
  },
  plugins: [],
}
