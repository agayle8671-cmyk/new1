/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Safelist ensures these classes are never purged (for dynamic usage)
  safelist: [
    // Grade colors
    'text-success', 'text-warning', 'text-danger', 'text-cyan-electric', 'text-violet-vivid',
    'bg-success', 'bg-warning', 'bg-danger', 'bg-cyan-electric', 'bg-violet-vivid',
    'border-success', 'border-warning', 'border-danger', 'border-cyan-electric', 'border-violet-vivid',
    // Opacity variants
    'bg-success/10', 'bg-success/20', 'bg-warning/10', 'bg-warning/20', 'bg-danger/10', 'bg-danger/20',
    'bg-cyan-electric/10', 'bg-cyan-electric/20', 'bg-cyan-electric/30',
    'bg-violet-vivid/10', 'bg-violet-vivid/20', 'bg-violet-vivid/30',
    'border-success/30', 'border-warning/30', 'border-danger/30',
    'border-cyan-electric/30', 'border-violet-vivid/30',
    // Gradients
    'from-cyan-electric', 'to-cyan-electric', 'from-violet-vivid', 'to-violet-vivid',
    'from-cyan-electric/30', 'to-cyan-electric/10', 'from-violet-vivid/30', 'to-violet-vivid/10',
    'from-success', 'to-success', 'from-warning', 'to-warning', 'from-danger', 'to-danger',
    // Badges
    'badge-success', 'badge-warning', 'badge-danger', 'badge-cyan', 'badge-violet',
  ],
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
