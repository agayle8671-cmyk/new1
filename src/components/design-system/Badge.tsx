import { cn } from '../../lib/utils';

// ============================================
// BADGE COMPONENT
// ============================================

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'cyan' | 'violet' | 'success' | 'warning' | 'danger' | 'neutral';
    size?: 'sm' | 'md';
    dot?: boolean;
}

export function Badge({
    className,
    variant = 'default',
    size = 'md',
    dot,
    children,
    ...props
}: BadgeProps) {
    const variants = {
        default: 'bg-white/10 text-text-secondary border-white/10',
        cyan: 'bg-cyan-electric/15 text-cyan-electric border-cyan-electric/20',
        violet: 'bg-violet-vivid/15 text-violet-vivid border-violet-vivid/20',
        success: 'bg-success-muted text-success border-success/20',
        warning: 'bg-warning-muted text-warning border-warning/20',
        danger: 'bg-danger-muted text-danger border-danger/20',
        neutral: 'bg-surface-2 text-text-tertiary border-border',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
    };

    const dotColors = {
        default: 'bg-text-secondary',
        cyan: 'bg-cyan-electric',
        violet: 'bg-violet-vivid',
        success: 'bg-success',
        warning: 'bg-warning',
        danger: 'bg-danger',
        neutral: 'bg-text-tertiary',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full font-medium border',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {dot && (
                <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
            )}
            {children}
        </span>
    );
}

// ============================================
// STATUS BADGE
// ============================================

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    status: 'online' | 'offline' | 'busy' | 'away';
}

export function StatusBadge({ className, status, ...props }: StatusBadgeProps) {
    const statusConfig = {
        online: { color: 'bg-success', text: 'Online', animate: true },
        offline: { color: 'bg-text-muted', text: 'Offline', animate: false },
        busy: { color: 'bg-danger', text: 'Busy', animate: false },
        away: { color: 'bg-warning', text: 'Away', animate: true },
    };

    const config = statusConfig[status];

    return (
        <span
            className={cn('inline-flex items-center gap-1.5 text-xs text-text-secondary', className)}
            {...props}
        >
            <span
                className={cn(
                    'w-2 h-2 rounded-full',
                    config.color,
                    config.animate && 'animate-pulse'
                )}
            />
            {config.text}
        </span>
    );
}

// ============================================
// GRADE BADGE
// ============================================

export interface GradeBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showLabel?: boolean;
}

export function GradeBadge({
    className,
    grade,
    size = 'md',
    showLabel = false,
    ...props
}: GradeBadgeProps) {
    const gradeConfig = {
        A: {
            bg: 'bg-success/15',
            text: 'text-success',
            border: 'border-success/30',
            glow: 'shadow-[0_0_30px_rgba(16,185,129,0.2)]',
            label: 'Exceptional',
        },
        B: {
            bg: 'bg-cyan-electric/15',
            text: 'text-cyan-electric',
            border: 'border-cyan-electric/30',
            glow: 'shadow-[0_0_30px_rgba(0,212,255,0.2)]',
            label: 'Strong',
        },
        C: {
            bg: 'bg-warning/15',
            text: 'text-warning',
            border: 'border-warning/30',
            glow: 'shadow-[0_0_30px_rgba(245,158,11,0.2)]',
            label: 'Moderate',
        },
        D: {
            bg: 'bg-danger/15',
            text: 'text-danger',
            border: 'border-danger/30',
            glow: 'shadow-[0_0_30px_rgba(239,68,68,0.2)]',
            label: 'At Risk',
        },
        F: {
            bg: 'bg-danger/15',
            text: 'text-danger',
            border: 'border-danger/30',
            glow: 'shadow-[0_0_30px_rgba(239,68,68,0.2)]',
            label: 'Critical',
        },
    };

    const sizes = {
        sm: 'w-10 h-10 text-lg',
        md: 'w-16 h-16 text-2xl',
        lg: 'w-20 h-20 text-3xl',
        xl: 'w-24 h-24 text-4xl',
    };

    const config = gradeConfig[grade];

    return (
        <div className={cn('flex flex-col items-center gap-2', className)} {...props}>
            <div
                className={cn(
                    'relative inline-flex items-center justify-center rounded-2xl font-bold border',
                    config.bg,
                    config.text,
                    config.border,
                    config.glow,
                    sizes[size]
                )}
            >
                {grade}
            </div>
            {showLabel && (
                <span className={cn('text-sm font-medium', config.text)}>{config.label}</span>
            )}
        </div>
    );
}
