/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0A0F1D',
          surface: '#111827',
          surfaceElevated: '#162032',
          border: '#1E293B',
          borderActive: '#334155',
          teal: '#0D9488',
          tealLight: '#14B8A6',
          tealDark: '#0F766E',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#EF4444',
          violet: '#8B5CF6',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'orb-glow': 'orbGlow 4s ease-in-out infinite alternate',
        'ripple': 'ripple 2s cubic-bezier(0, 0.2, 0.8, 1) infinite',
      },
      keyframes: {
        orbGlow: {
          '0%': { transform: 'scale(1)', filter: 'drop-shadow(0 0 20px rgba(13, 148, 136, 0.4))' },
          '100%': { transform: 'scale(1.06)', filter: 'drop-shadow(0 0 35px rgba(20, 184, 166, 0.6))' }
        },
        ripple: {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.2)', opacity: '0' }
        }
      }
    },
  },
  plugins: [],
};
