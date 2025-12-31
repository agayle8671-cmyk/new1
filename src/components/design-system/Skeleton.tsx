import { cn } from '../../lib/utils';

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div className={cn('skeleton', className)} />
    );
}

export function SkeletonText({
    className,
    lines = 1,
    lastLineWidth = '75%',
}: {
    className?: string;
    lines?: number;
    lastLineWidth?: string;
}) {
    return (
        <div className={cn('space-y-2', className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="skeleton-text"
                    style={i === lines - 1 && lines > 1 ? { width: lastLineWidth } : undefined}
                />
            ))}
        </div>
    );
}

export function SkeletonCard({ className }: SkeletonProps) {
    return (
        <div className={cn('skeleton-card p-6 space-y-4', className)}>
            <div className="flex items-center gap-3">
                <div className="skeleton-avatar" />
                <div className="flex-1 space-y-2">
                    <div className="skeleton-text w-1/3" />
                    <div className="skeleton-text-sm w-1/2" />
                </div>
            </div>
            <div className="space-y-2">
                <div className="skeleton-text" />
                <div className="skeleton-text w-4/5" />
            </div>
        </div>
    );
}

export function SkeletonMetric({ className }: SkeletonProps) {
    return (
        <div className={cn('space-y-2', className)}>
            <div className="skeleton-text-sm w-20" />
            <div className="skeleton-text-lg w-28" />
        </div>
    );
}

export function LoadingDots({ className }: { className?: string }) {
    return (
        <span className={cn('loading-dots text-text-muted', className)}>
            <span />
            <span />
            <span />
        </span>
    );
}
