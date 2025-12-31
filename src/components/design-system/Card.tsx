import { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

// ============================================
// CARD COMPONENT
// ============================================

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
    variant?: 'default' | 'elevated' | 'glass' | 'interactive';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    glow?: 'none' | 'cyan' | 'violet' | 'success';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
    (
        {
            className,
            variant = 'default',
            padding = 'md',
            glow = 'none',
            children,
            ...props
        },
        ref
    ) => {
        const variants = {
            default: 'bg-surface-1 border border-border',
            elevated: 'bg-surface-2 border border-border shadow-card',
            glass: 'backdrop-blur-glass bg-white/[0.03] border border-white/[0.06]',
            interactive: `
        bg-surface-1 border border-border cursor-pointer
        hover:bg-surface-2 hover:border-border-strong hover-lift
        transition-all duration-200
      `,
        };

        const paddings = {
            none: '',
            sm: 'p-4',
            md: 'p-6',
            lg: 'p-8',
        };

        const glows = {
            none: '',
            cyan: 'shadow-glow-cyan',
            violet: 'shadow-glow-violet',
            success: 'shadow-glow-success',
        };

        return (
            <motion.div
                ref={ref}
                className={cn(
                    'rounded-2xl',
                    variants[variant],
                    paddings[padding],
                    glows[glow],
                    className
                )}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);

Card.displayName = 'Card';

// ============================================
// CARD HEADER
// ============================================

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    icon?: React.ReactNode;
}

export function CardHeader({
    className,
    title,
    subtitle,
    action,
    icon,
    ...props
}: CardHeaderProps) {
    return (
        <div className={cn('flex items-start justify-between mb-6', className)} {...props}>
            <div className="flex items-center gap-3">
                {icon && (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-electric to-violet-vivid flex items-center justify-center">
                        {icon}
                    </div>
                )}
                <div>
                    <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
                    {subtitle && <p className="text-sm text-text-tertiary mt-0.5">{subtitle}</p>}
                </div>
            </div>
            {action}
        </div>
    );
}

// ============================================
// CARD CONTENT
// ============================================

export function CardContent({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('', className)} {...props}>
            {children}
        </div>
    );
}

// ============================================
// CARD FOOTER
// ============================================

export function CardFooter({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn('mt-6 pt-4 border-t border-border flex items-center justify-between', className)}
            {...props}
        >
            {children}
        </div>
    );
}
