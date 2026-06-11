/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#ef4444',
          dark: '#dc2626',
          deeper: '#b91c1c',
        },
        arena: {
          black: '#000000',
          dark: '#0d0d0d',
          card: '#111111',
          border: '#1f1f1f',
          muted: '#71767b',
          text: '#e7e9ea',
        }
      },
    },
  },
  plugins: [],
}