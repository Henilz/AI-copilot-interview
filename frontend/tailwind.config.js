/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './sidepanel.html',
    './src/**/*.{ts,tsx}',
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
}
