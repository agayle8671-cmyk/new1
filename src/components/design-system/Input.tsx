import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

// ============================================
// INPUT COMPONENT
// ============================================

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    variant?: 'default' | 'glass';
    error?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, variant = 'default', error, leftIcon, rightIcon, ...props }, ref) => {
        const variants = {
            default: 'bg-surface-1 border-border',
            glass: 'bg-white/5 border-white/10 backdrop-blur-sm',
        };

        return (
            <div className="relative">
                {leftIcon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
                        {leftIcon}
                    </div>
                )}
                <input
                    ref={ref}
                    className={cn(
                        'w-full px-4 py-3 rounded-xl border text-text-primary',
                        'placeholder:text-text-muted',
                        'focus:outline-none focus:border-cyan-electric/50 focus:ring-1 focus:ring-cyan-electric/20',
                        'transition-all duration-200',
                        variants[variant],
                        error && 'border-danger focus:border-danger focus:ring-danger/20',
                        leftIcon && 'pl-10',
                        rightIcon && 'pr-10',
                        className
                    )}
                    {...props}
                />
                {rightIcon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">
                        {rightIcon}
                    </div>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

// ============================================
// TEXTAREA COMPONENT
// ============================================

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    variant?: 'default' | 'glass';
    error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, variant = 'default', error, ...props }, ref) => {
        const variants = {
            default: 'bg-surface-1 border-border',
            glass: 'bg-white/5 border-white/10 backdrop-blur-sm',
        };

        return (
            <textarea
                ref={ref}
                className={cn(
                    'w-full px-4 py-3 rounded-xl border text-text-primary min-h-[120px] resize-none',
                    'placeholder:text-text-muted',
                    'focus:outline-none focus:border-cyan-electric/50 focus:ring-1 focus:ring-cyan-electric/20',
                    'transition-all duration-200',
                    variants[variant],
                    error && 'border-danger focus:border-danger focus:ring-danger/20',
                    className
                )}
                {...props}
            />
        );
    }
);

Textarea.displayName = 'Textarea';

// ============================================
// SEARCH INPUT
// ============================================

export interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
    onSearch?: (value: string) => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
    ({ className, onSearch, onChange, ...props }, ref) => {
        return (
            <Input
                ref={ref}
                type="search"
                leftIcon={
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                }
                onChange={(e) => {
                    onChange?.(e);
                    onSearch?.(e.target.value);
                }}
                className={className}
                {...props}
            />
        );
    }
);

SearchInput.displayName = 'SearchInput';
