/**
 * SkeletonScreens.tsx
 * 
 * Skeleton loading components for instant UI feel.
 * Uses CSS shimmer animation for performance.
 */

import { motion } from 'framer-motion';

// Base shimmer animation
const shimmerClass = 'animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]';

interface SkeletonProps {
  className?: string;
}

export function SkeletonBox({ className = '' }: SkeletonProps) {
  return <div className={`${shimmerClass} rounded-lg ${className}`} />;
}

export function SkeletonText({ className = '', lines = 1 }: SkeletonProps & { lines?: number }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${shimmerClass} h-4 rounded`}
          style={{ width: i === lines - 1 ? '70%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function SkeletonCircle({ size = 40, className = '' }: SkeletonProps & { size?: number }) {
  return (
    <div
      className={`${shimmerClass} rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Bento Grid Skeleton - for Archive page
 */
export function BentoGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-card p-6 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SkeletonCircle size={40} />
              <div className="space-y-1">
                <SkeletonBox className="w-24 h-4" />
                <SkeletonBox className="w-16 h-3" />
              </div>
            </div>
            <SkeletonBox className="w-8 h-8 rounded-lg" />
          </div>
          
          {/* Content */}
          <SkeletonText lines={3} />
          
          {/* Footer */}
          <div className="flex gap-2 pt-2">
            <SkeletonBox className="w-16 h-6" />
            <SkeletonBox className="w-20 h-6" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Stats Row Skeleton - for dashboard metrics
 */
export function StatsRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.08 }}
          className="glass-card p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <SkeletonCircle size={32} />
            <SkeletonBox className="w-20 h-3" />
          </div>
          <SkeletonBox className="w-full h-8" />
          <SkeletonBox className="w-16 h-3" />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Chart Skeleton - for graph loading
 */
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <SkeletonBox className="w-32 h-5" />
        <div className="flex gap-2">
          <SkeletonBox className="w-16 h-6" />
          <SkeletonBox className="w-16 h-6" />
        </div>
      </div>
      <div
        className={`${shimmerClass} rounded-lg flex items-end justify-around gap-2 p-4`}
        style={{ height }}
      >
        {/* Fake bar chart */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bg-white/10 rounded-t w-full"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Table Skeleton - for data tables
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-card overflow-hidden"
    >
      {/* Header */}
      <div className="border-b border-white/10 p-4 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBox key={i} className="flex-1 h-4" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <motion.div
          key={row}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: row * 0.05 }}
          className="border-b border-white/5 p-4 flex gap-4"
        >
          {Array.from({ length: cols }).map((_, col) => (
            <SkeletonBox
              key={col}
              className={`flex-1 h-4 ${col === 0 ? '' : 'opacity-60'}`}
            />
          ))}
        </motion.div>
      ))}
    </motion.div>
  );
}

/**
 * DNA Card Skeleton - for main dashboard card
 */
export function DNACardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-8 space-y-6"
    >
      {/* Grade circle */}
      <div className="flex justify-center">
        <SkeletonCircle size={120} />
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 text-center">
            <SkeletonBox className="w-16 h-8 mx-auto" />
            <SkeletonBox className="w-20 h-3 mx-auto" />
          </div>
        ))}
      </div>
      
      {/* Insight */}
      <div className="glass-card p-4">
        <SkeletonText lines={2} />
      </div>
    </motion.div>
  );
}

/**
 * Sidebar Skeleton
 */
export function SidebarSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <SkeletonCircle size={40} />
        <SkeletonBox className="w-24 h-5" />
      </div>
      
      {/* Nav items */}
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <SkeletonCircle size={24} />
          <SkeletonBox className="w-20 h-4" />
        </div>
      ))}
      
      {/* Footer */}
      <div className="mt-auto pt-8">
        <SkeletonBox className="w-full h-16 rounded-xl" />
      </div>
    </div>
  );
}

export default {
  SkeletonBox,
  SkeletonText,
  SkeletonCircle,
  BentoGridSkeleton,
  StatsRowSkeleton,
  ChartSkeleton,
  TableSkeleton,
  DNACardSkeleton,
  SidebarSkeleton,
};



