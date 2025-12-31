/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
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
    // Surface colors
    'bg-surface-0', 'bg-surface-1', 'bg-surface-2', 'bg-surface-3',
  ],
  theme: {
    extend: {
      // ============================================
      // PREMIUM COLOR SYSTEM (Linear/Stripe inspired)
      // ============================================
      colors: {
        // Base light grays (Light Theme)
        charcoal: {
          DEFAULT: '#F8F9FA',     // Light background
          50: '#F1F3F5',          // Slightly darker
          100: '#E9ECEF',         // More contrast
          200: '#DEE2E6',         // Even more
        },
        // Surface layers (for card stacking) - Light Theme
        surface: {
          0: '#F8F9FA',           // Background
          1: '#FFFFFF',           // Card level 1 (white)
          2: '#F1F3F5',           // Card level 2 (subtle gray)
          3: '#E9ECEF',           // Card level 3 (modal/popover)
        },
        // Primary accent - Electric Cyan
        cyan: {
          50: '#E6FBFF',
          100: '#B3F4FF',
          200: '#80EDFF',
          300: '#4DE6FF',
          400: '#1ADFFF',
          electric: '#00D4FF',    // Primary
          glow: '#00E5FF',        // Lighter variant
          600: '#00A8CC',
          700: '#007A99',
          800: '#004D66',
          900: '#002633',
        },
        // Secondary accent - Vivid Violet
        violet: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          vivid: '#8B5CF6',       // Primary
          glow: '#A78BFA',        // Lighter variant
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        // Semantic colors
        success: {
          DEFAULT: '#10B981',     // Softer than pure green
          light: '#34D399',
          dark: '#059669',
          muted: 'rgba(16, 185, 129, 0.15)',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FBBF24',
          dark: '#D97706',
          muted: 'rgba(245, 158, 11, 0.15)',
        },
        danger: {
          DEFAULT: '#EF4444',
          light: '#F87171',
          dark: '#DC2626',
          muted: 'rgba(239, 68, 68, 0.15)',
        },
        info: {
          DEFAULT: '#3B82F6',
          light: '#60A5FA',
          dark: '#2563EB',
          muted: 'rgba(59, 130, 246, 0.15)',
        },
        // Text colors (Light Theme)
        text: {
          primary: '#1A1A1A',     // Headings, important (dark)
          secondary: '#4B5563',   // Body text (gray-600)
          tertiary: '#6B7280',    // Subdued (gray-500)
          muted: '#9CA3AF',       // Very subdued (gray-400)
        },
        // Border colors (Light Theme)
        border: {
          DEFAULT: 'rgba(0, 0, 0, 0.08)',
          subtle: 'rgba(0, 0, 0, 0.05)',
          strong: 'rgba(0, 0, 0, 0.12)',
        },
      },
      // ============================================
      // TYPOGRAPHY SYSTEM
      // ============================================
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'], // For large headlines
      },
      fontSize: {
        // Display sizes (for hero metrics)
        'display-2xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'display-sm': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        // Metric sizes (tabular numbers)
        'metric-hero': ['5rem', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '700' }],
        'metric-lg': ['2.5rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '600' }],
        'metric-md': ['1.5rem', { lineHeight: '1', letterSpacing: '-0.01em', fontWeight: '600' }],
      },
      // ============================================
      // SPACING & LAYOUT
      // ============================================
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      // ============================================
      // SHADOWS (Layered depth system)
      // ============================================
      boxShadow: {
        // Ambient shadows (soft, large)
        'ambient-sm': '0 2px 8px -2px rgba(0, 0, 0, 0.3)',
        'ambient-md': '0 4px 16px -4px rgba(0, 0, 0, 0.4)',
        'ambient-lg': '0 8px 32px -8px rgba(0, 0, 0, 0.5)',
        'ambient-xl': '0 16px 48px -12px rgba(0, 0, 0, 0.6)',
        // Glow shadows
        'glow-cyan': '0 0 20px rgba(0, 212, 255, 0.3), 0 0 40px rgba(0, 212, 255, 0.1)',
        'glow-violet': '0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.1)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.3), 0 0 40px rgba(16, 185, 129, 0.1)',
        // Card shadows
        'card': '0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.3)',
        'card-elevated': '0 8px 24px rgba(0, 0, 0, 0.4), 0 16px 48px rgba(0, 0, 0, 0.3)',
      },
      // ============================================
      // BACKDROP BLUR
      // ============================================
      backdropBlur: {
        xs: '2px',
        glass: '40px',
      },
      // ============================================
      // ANIMATIONS
      // ============================================
      animation: {
        'orb-float': 'orbFloat 20s ease-in-out infinite',
        'orb-float-reverse': 'orbFloatReverse 25s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 0.4s ease-out',
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
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceSubtle: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      // ============================================
      // TRANSITIONS
      // ============================================
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
      },
    },
  },
  plugins: [],
};
