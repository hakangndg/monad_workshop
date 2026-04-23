/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        monadDark: '#09090b',
        neonBlue: '#3b82f6',
        neonRed: '#ef4444',
        neonGreen: '#22c55e',
        neonYellow: '#facc15',
      },
      boxShadow: {
        'neon-b': '0 0 15px #3b82f6, 0 0 30px #3b82f6',
        'neon-r': '0 0 15px #ef4444, 0 0 30px #ef4444',
        'neon-g': '0 0 15px #22c55e, 0 0 30px #22c55e',
        'neon-y': '0 0 15px #facc15, 0 0 30px #facc15',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
        },
      },
      animation: {
        shake: 'shake 0.5s ease-in-out',
      },
    },
  },
  plugins: [],
};