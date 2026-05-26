/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Microsoft YaHei', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 42px rgba(14, 165, 233, 0.18)',
      },
    },
  },
  plugins: [],
};
