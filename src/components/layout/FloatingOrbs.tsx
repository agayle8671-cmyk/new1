/**
 * FloatingOrbs.tsx
 * 
 * Ambient background orbs with GPU-optimized rendering.
 * Uses will-change and transform3d for smooth animations without jank.
 */

import { memo } from 'react';

const FloatingOrbs = memo(function FloatingOrbs() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    >
      {/* Cyan orb - top left */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full animate-orb-float floating-orb"
        style={{
          top: '10%',
          left: '5%',
          background: 'radial-gradient(circle, rgba(0, 212, 255, 0.08) 0%, rgba(0, 212, 255, 0.02) 40%, transparent 70%)',
          filter: 'blur(60px)',
          transform: 'translateZ(0)', // Force GPU layer
          willChange: 'transform',
          contain: 'strict', // CSS containment for perf
        }}
      />

      {/* Violet orb - bottom right */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full animate-orb-float-reverse floating-orb"
        style={{
          bottom: '5%',
          right: '10%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.02) 40%, transparent 70%)',
          filter: 'blur(60px)',
          transform: 'translateZ(0)',
          willChange: 'transform',
          contain: 'strict',
        }}
      />

      {/* Subtle center glow for depth */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full opacity-30"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) translateZ(0)',
          background: 'radial-gradient(circle, rgba(0, 212, 255, 0.02) 0%, transparent 60%)',
          filter: 'blur(100px)',
          contain: 'strict',
        }}
      />
    </div>
  );
});

export default FloatingOrbs;
