/**
 * ChartEnhancements.tsx
 * 
 * Shared chart components for enhanced visual effects.
 * Provides reusable SVG definitions, tooltips, and animated elements.
 */

import { motion } from 'framer-motion';
import { formatCurrency } from '../../lib/simulator-engine';

// ============================================================================
// SVG GRADIENT & FILTER DEFINITIONS
// ============================================================================

/**
 * Enhanced SVG definitions for charts - includes gradients and glow filters
 * Usage: Place inside <defs> in any Recharts component
 */
export const ChartGradientDefs = () => (
  <>
    {/* Cyan Electric Gradient */}
    <linearGradient id="gradientCyan" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.4} />
      <stop offset="50%" stopColor="#00D4FF" stopOpacity={0.15} />
      <stop offset="100%" stopColor="#00D4FF" stopOpacity={0} />
    </linearGradient>

    {/* Violet Vivid Gradient */}
    <linearGradient id="gradientViolet" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
      <stop offset="50%" stopColor="#8B5CF6" stopOpacity={0.15} />
      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
    </linearGradient>

    {/* Success Green Gradient */}
    <linearGradient id="gradientSuccess" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#00FF88" stopOpacity={0.4} />
      <stop offset="50%" stopColor="#00FF88" stopOpacity={0.15} />
      <stop offset="100%" stopColor="#00FF88" stopOpacity={0} />
    </linearGradient>

    {/* Warning Gradient */}
    <linearGradient id="gradientWarning" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#FFB800" stopOpacity={0.4} />
      <stop offset="50%" stopColor="#FFB800" stopOpacity={0.15} />
      <stop offset="100%" stopColor="#FFB800" stopOpacity={0} />
    </linearGradient>

    {/* Cyan to Violet Gradient (for bars) */}
    <linearGradient id="gradientCyanViolet" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.9} />
      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.9} />
    </linearGradient>

    {/* Animated Glow Filter - Cyan */}
    <filter id="glowCyanAnimated" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Animated Glow Filter - Violet */}
    <filter id="glowVioletAnimated" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Animated Glow Filter - Success */}
    <filter id="glowSuccessAnimated" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Animated Glow Filter - Warning */}
    <filter id="glowWarningAnimated" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Bar Shadow Filter */}
    <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
    </filter>
  </>
);

// ============================================================================
// ENHANCED TOOLTIP
// ============================================================================

interface TooltipPayload {
  value: number;
  name: string;
  color: string;
  dataKey?: string;
}

interface EnhancedTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  formatter?: (value: number) => string;
}

export const EnhancedTooltip = ({ 
  active, 
  payload, 
  label,
  formatter = (v) => formatCurrency(v, true)
}: EnhancedTooltipProps) => {
  if (!active || !payload?.length) return null;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15 }}
      className="chart-tooltip glass-card p-4 border border-white/20 shadow-2xl backdrop-blur-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(13,13,13,0.95) 0%, rgba(26,26,26,0.9) 100%)',
        borderImage: 'linear-gradient(135deg, rgba(0,212,255,0.3), rgba(139,92,246,0.3)) 1',
      }}
    >
      <p className="text-gray-400 text-xs font-medium mb-3 uppercase tracking-wider">{label}</p>
      <div className="space-y-2">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span 
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}` }}
              />
              <span className="text-sm text-gray-300">{entry.name}</span>
            </div>
            <span className="text-sm font-bold" style={{ color: entry.color }}>
              {formatter(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ============================================================================
// ANIMATED DOT FOR CHARTS
// ============================================================================

interface AnimatedDotProps {
  cx?: number;
  cy?: number;
  fill?: string;
  stroke?: string;
  r?: number;
}

export const AnimatedActiveDot = ({ cx, cy, fill, stroke }: AnimatedDotProps) => {
  if (cx === undefined || cy === undefined) return null;
  
  return (
    <g>
      {/* Outer glow ring */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={12}
        fill="none"
        stroke={fill || stroke}
        strokeWidth={2}
        strokeOpacity={0.3}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1.2, opacity: [0.3, 0.1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      {/* Middle ring */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={8}
        fill="none"
        stroke={fill || stroke}
        strokeWidth={2}
        strokeOpacity={0.5}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2 }}
      />
      {/* Core dot */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={5}
        fill={fill || stroke}
        stroke="#0D0D0D"
        strokeWidth={2}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
        style={{ filter: `drop-shadow(0 0 6px ${fill || stroke})` }}
      />
    </g>
  );
};

// ============================================================================
// CHART ANIMATION CONSTANTS
// ============================================================================

export const CHART_ANIMATION = {
  duration: 1200,
  easing: 'ease-out',
  delay: 200,
};

export const LINE_ANIMATION = {
  animationBegin: 0,
  animationDuration: 1500,
  animationEasing: 'ease-out' as const,
};

export const BAR_ANIMATION = {
  animationBegin: 0,
  animationDuration: 800,
  animationEasing: 'ease-out' as const,
};

// Color constants matching your design system
export const CHART_COLORS = {
  cyan: '#00D4FF',
  violet: '#8B5CF6',
  success: '#00FF88',
  warning: '#FFB800',
  danger: '#E53935',
  cyanGlow: '#00E5FF',
  violetGlow: '#A78BFA',
};
