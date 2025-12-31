import { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

// ============================================
// BUTTON COMPONENT
// ============================================

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = 'primary',
            size = 'md',
            isLoading,
            leftIcon,
            rightIcon,
            children,
            disabled,
            ...props
        },
        ref
    ) => {
        const baseStyles = `
      inline-flex items-center justify-center gap-2 font-semibold
      transition-all duration-200 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal
      disabled:opacity-50 disabled:pointer-events-none
    `;

        const variants = {
            primary: `
        bg-gradient-to-r from-cyan-electric to-cyan-glow text-charcoal
        hover:shadow-glow-cyan hover:scale-[1.02]
        active:scale-[0.98]
        focus-visible:ring-cyan-electric
      `,
            secondary: `
        bg-surface-2 text-text-primary border border-border
        hover:bg-surface-3 hover:border-border-strong
        active:scale-[0.98]
        focus-visible:ring-white/20
      `,
            ghost: `
        bg-transparent text-text-secondary
        hover:bg-white/5 hover:text-text-primary
        active:scale-[0.98]
      `,
            danger: `
        bg-danger text-white
        hover:bg-danger-light hover:shadow-lg
        active:scale-[0.98]
        focus-visible:ring-danger
      `,
        };

        const sizes = {
            sm: 'px-4 py-2 text-sm rounded-lg',
            md: 'px-6 py-3 text-base rounded-xl',
            lg: 'px-8 py-4 text-lg rounded-2xl',
        };

        return (
            <motion.button
                ref={ref}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || isLoading}
                whileTap={{ scale: 0.98 }}
                {...props}
            >
                {isLoading ? (
                    <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                ) : (
                    leftIcon
                )}
                {children}
                {!isLoading && rightIcon}
            </motion.button>
        );
    }
);

Button.displayName = 'Button';

// ============================================
// ICON BUTTON
// ============================================

export interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
    variant?: 'default' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
        const variants = {
            default: 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary',
            ghost: 'bg-transparent text-text-tertiary hover:bg-white/5 hover:text-text-secondary',
        };

        const sizes = {
            sm: 'p-1.5',
            md: 'p-2.5',
            lg: 'p-3',
        };

        return (
            <motion.button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-lg transition-all duration-200',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-electric/50',
                    variants[variant],
                    sizes[size],
                    className
                )}
                whileTap={{ scale: 0.95 }}
                {...props}
            >
                {children}
            </motion.button>
        );
    }
);

IconButton.displayName = 'IconButton';
