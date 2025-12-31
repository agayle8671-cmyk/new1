import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

// ============================================
// METRIC COMPONENT
// ============================================

export interface MetricProps extends React.HTMLAttributes<HTMLDivElement> {
    label: string;
    value: string | number;
    suffix?: string;
    prefix?: string;
    trend?: {
        value: number;
        direction: 'up' | 'down' | 'neutral';
    };
    size?: 'sm' | 'md' | 'lg' | 'hero';
    color?: 'default' | 'cyan' | 'violet' | 'success' | 'warning' | 'danger';
    animate?: boolean;
}

export function Metric({
    className,
    label,
    value,
    suffix,
    prefix,
    trend,
    size = 'md',
    color = 'default',
    animate = true,
    ...props
}: MetricProps) {
    const sizes = {
        sm: {
            value: 'text-xl font-semibold',
            label: 'text-xs',
        },
        md: {
            value: 'text-3xl font-bold',
            label: 'text-sm',
        },
        lg: {
            value: 'text-4xl font-bold tracking-tight',
            label: 'text-sm',
        },
        hero: {
            value: 'text-6xl md:text-7xl font-bold tracking-tighter',
            label: 'text-base',
        },
    };

    const colors = {
        default: 'text-text-primary',
        cyan: 'text-cyan-electric',
        violet: 'text-violet-vivid',
        success: 'text-success',
        warning: 'text-warning',
        danger: 'text-danger',
    };

    const trendColors = {
        up: 'text-success',
        down: 'text-danger',
        neutral: 'text-text-tertiary',
    };

    const TrendIcon = {
        up: TrendingUp,
        down: TrendingDown,
        neutral: Minus,
    };

    const Component = animate ? motion.div : 'div';
    const animationProps = animate
        ? {
            initial: { opacity: 0, y: 10 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.4 },
        }
        : {};

    return (
        <Component className={cn('', className)} {...animationProps} {...props}>
            <p className={cn('text-text-tertiary uppercase tracking-wider font-medium mb-1', sizes[size].label)}>
                {label}
            </p>
            <div className="flex items-baseline gap-2">
                <span className={cn('tabular-nums', sizes[size].value, colors[color])}>
                    {prefix}
                    {typeof value === 'number' ? value.toLocaleString() : value}
                    {suffix && <span className="text-text-tertiary ml-0.5">{suffix}</span>}
                </span>
                {trend && (
                    <span className={cn('flex items-center gap-0.5 text-sm font-medium', trendColors[trend.direction])}>
                        {React.createElement(TrendIcon[trend.direction], { className: 'w-3.5 h-3.5' })}
                        {Math.abs(trend.value)}%
                    </span>
                )}
            </div>
        </Component>
    );
}

// ============================================
// METRIC CARD (Metric with card wrapper)
// ============================================

export interface MetricCardProps extends MetricProps {
    icon?: React.ReactNode;
    glow?: boolean;
}

export function MetricCard({
    className,
    icon,
    glow = false,
    color = 'default',
    ...props
}: MetricCardProps) {
    const glowColors = {
        default: '',
        cyan: 'shadow-glow-cyan',
        violet: 'shadow-glow-violet',
        success: 'shadow-glow-success',
        warning: '',
        danger: '',
    };

    return (
        <motion.div
            className={cn(
                'bg-surface-1 border border-border rounded-2xl p-6',
                'hover:bg-surface-2 hover:border-border-strong',
                'transition-all duration-200',
                glow && glowColors[color],
                className
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
        >
            {icon && (
                <div className="mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-text-secondary">
                        {icon}
                    </div>
                </div>
            )}
            <Metric color={color} animate={false} {...props} />
        </motion.div>
    );
}

// ============================================
// HERO METRIC (For the main runway display)
// ============================================

export interface HeroMetricProps extends React.HTMLAttributes<HTMLDivElement> {
    value: number;
    label: string;
    suffix?: string;
    trend?: {
        value: number;
        direction: 'up' | 'down' | 'neutral';
    };
    subMetrics?: Array<{
        label: string;
        value: string | number;
        suffix?: string;
    }>;
}

export function HeroMetric({
    className,
    value,
    label,
    suffix = 'months',
    trend,
    subMetrics,
    ...props
}: HeroMetricProps) {
    return (
        <div className={cn('text-center', className)} {...props}>
            {/* Main Value */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
                <p className="text-text-tertiary uppercase tracking-widest text-sm font-medium mb-2">
                    {label}
                </p>
                <div className="flex items-baseline justify-center gap-3">
                    <span className="text-7xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-text-primary tabular-nums">
                        {value.toFixed(1)}
                    </span>
                    <span className="text-2xl md:text-3xl text-text-tertiary font-medium">
                        {suffix}
                    </span>
                </div>
                {trend && (
                    <div className={cn(
                        'inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-sm font-medium',
                        trend.direction === 'up' && 'bg-success/15 text-success',
                        trend.direction === 'down' && 'bg-danger/15 text-danger',
                        trend.direction === 'neutral' && 'bg-white/5 text-text-tertiary'
                    )}>
                        {trend.direction === 'up' && <TrendingUp className="w-4 h-4" />}
                        {trend.direction === 'down' && <TrendingDown className="w-4 h-4" />}
                        {trend.direction === 'neutral' && <Minus className="w-4 h-4" />}
                        {trend.value > 0 ? '+' : ''}{trend.value}% from last month
                    </div>
                )}
            </motion.div>

            {/* Sub Metrics */}
            {subMetrics && subMetrics.length > 0 && (
                <motion.div
                    className="mt-8 grid grid-cols-3 gap-4 max-w-xl mx-auto"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                >
                    {subMetrics.map((metric, i) => (
                        <div key={i} className="text-center">
                            <p className="text-text-tertiary text-xs uppercase tracking-wider mb-1">
                                {metric.label}
                            </p>
                            <p className="text-xl font-semibold text-text-primary tabular-nums">
                                {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                                {metric.suffix && <span className="text-text-tertiary text-sm ml-0.5">{metric.suffix}</span>}
                            </p>
                        </div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}

// Fix React import for TrendIcon createElement
import React from 'react';
