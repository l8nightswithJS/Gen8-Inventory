/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    // center and pad all <div className="container"> wrappers
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem', // 16px on mobile
        sm: '2rem',      // 32px ≥640px
        lg: '4rem',      // 64px ≥1024px
      },
    },
    extend: {},
  },
  plugins: [],
};
