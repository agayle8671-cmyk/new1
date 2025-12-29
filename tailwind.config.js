/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: '#0D0D0D',
          50: '#1A1A1A',
          100: '#141414',
          200: '#0D0D0D',
        },
        cyan: {
          electric: '#00D4FF',
          glow: '#00E5FF',
        },
        violet: {
          vivid: '#8B5CF6',
          glow: '#A78BFA',
        },
        success: '#00FF88',
        warning: '#FFB800',
        danger: '#E53935',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        glass: '40px',
      },
      animation: {
        'orb-float': 'orbFloat 20s ease-in-out infinite',
        'orb-float-reverse': 'orbFloatReverse 25s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        orbFloat: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(50px, -30px) scale(1.1)' },
          '50%': { transform: 'translate(-20px, 50px) scale(0.95)' },
          '75%': { transform: 'translate(-40px, -20px) scale(1.05)' },
        },
        orbFloatReverse: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(-60px, 40px) scale(1.05)' },
          '50%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '75%': { transform: 'translate(50px, 30px) scale(0.95)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
