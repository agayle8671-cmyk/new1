import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface MotionCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  variant?: 'default' | 'elevated';
  className?: string;
  disableHover?: boolean;
}

export function MotionCard({ children, variant = 'default', className = '', disableHover = false, ...props }: MotionCardProps) {
  const baseClass = variant === 'elevated' ? 'glass-card-elevated' : 'glass-card';

  return (
    <motion.div
      className={`${baseClass} ${className}`}
      whileHover={disableHover ? undefined : { y: -4, transition: { duration: 0.2 } }}
      whileTap={disableHover ? undefined : { scale: 0.98 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface MotionButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
  disabled?: boolean;
}

export function MotionButton({ children, variant = 'primary', className = '', disabled, ...props }: MotionButtonProps) {
  const baseClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary';

  return (
    <motion.button
      className={`${baseClass} ${className}`}
      whileHover={disabled ? undefined : { y: -2, transition: { duration: 0.15 } }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
