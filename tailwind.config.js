/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        card: '#0A0A0A',
        surface: {
          DEFAULT: '#0A0A0A',
          hover: '#141414',
          subtle: '#111111',
        },
        border: {
          DEFAULT: '#1F1F1F',
          subtle: '#141414',
          strong: '#2A2A2A',
        },
        primary: {
          text: '#FAFAFA',
          bg: '#FAFAFA',
          hover: '#E5E5E5',
        },
        secondary: {
          text: '#888888',
        },
        muted: {
          text: '#525252',
        },
        status: {
          authentic: '#10B981',
          suspicious: '#F59E0B',
          fake: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
