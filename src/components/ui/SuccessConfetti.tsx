/**
 * SuccessConfetti.tsx
 * 
 * Confetti celebration effect for milestone moments.
 * Triggered on first DNA Snapshot save and other success events.
 * 
 * Lightweight CSS-based confetti for performance.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  rotation: number;
}

const CONFETTI_COLORS = [
  '#00D4FF', // Electric Cyan
  '#8B5CF6', // Vivid Violet
  '#00FF88', // Success Green
  '#FFB800', // Warning Yellow
  '#FFFFFF', // White
];

function generateConfetti(count: number = 50): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 4 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));
}

interface SuccessConfettiProps {
  isActive: boolean;
  onComplete?: () => void;
  duration?: number;
}

export function SuccessConfetti({ isActive, onComplete, duration = 3000 }: SuccessConfettiProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      setConfetti(generateConfetti(60));
      setIsVisible(true);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isActive, duration, onComplete]);

  if (!isVisible) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      <AnimatePresence>
        {confetti.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{
              opacity: 1,
              y: -20,
              x: `${piece.x}vw`,
              rotate: 0,
              scale: 0,
            }}
            animate={{
              opacity: [1, 1, 0],
              y: '110vh',
              rotate: piece.rotation + 720,
              scale: [0, 1, 1, 0.5],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: piece.duration,
              delay: piece.delay,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            style={{
              position: 'absolute',
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              borderRadius: piece.size > 8 ? '2px' : '50%',
              boxShadow: `0 0 6px ${piece.color}`,
            }}
          />
        ))}
      </AnimatePresence>
      
      {/* Center pulse effect */}
      <motion.div
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 4, opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-gradient-to-r from-cyan-electric/30 to-violet-vivid/30"
      />
    </div>,
    document.body
  );
}

// Hook to trigger confetti
export function useConfetti() {
  const [isActive, setIsActive] = useState(false);

  const triggerConfetti = useCallback(() => {
    setIsActive(true);
  }, []);

  const handleComplete = useCallback(() => {
    setIsActive(false);
  }, []);

  return {
    isActive,
    triggerConfetti,
    handleComplete,
    ConfettiComponent: () => (
      <SuccessConfetti isActive={isActive} onComplete={handleComplete} />
    ),
  };
}

// Storage key for tracking first snapshot
const FIRST_SNAPSHOT_KEY = 'runway-dna-first-snapshot-celebrated';

export function useFirstSnapshotCelebration() {
  const confetti = useConfetti();
  const [hasCelebrated, setHasCelebrated] = useState(true);

  useEffect(() => {
    const celebrated = localStorage.getItem(FIRST_SNAPSHOT_KEY);
    setHasCelebrated(!!celebrated);
  }, []);

  const celebrateFirstSnapshot = useCallback(() => {
    if (!hasCelebrated) {
      localStorage.setItem(FIRST_SNAPSHOT_KEY, 'true');
      setHasCelebrated(true);
      confetti.triggerConfetti();
      return true;
    }
    return false;
  }, [hasCelebrated, confetti]);

  return {
    ...confetti,
    celebrateFirstSnapshot,
    hasCelebrated,
  };
}

export default SuccessConfetti;



