import { useEffect, useRef } from 'react';

/**
 * Hook to apply Antigravity-style scroll-reveal animations
 * Uses IntersectionObserver to trigger .animate-in class on scroll
 * 
 * Animation timing: 0.8s cubic-bezier(0.16, 1, 0.3, 1)
 * 
 * Usage:
 * 1. Add useScrollAnimation() to your component
 * 2. Add className="scroll-reveal" to elements you want to animate
 * 
 * Variants:
 * - .scroll-reveal (fade up - default)
 * - .scroll-reveal-left (fade from left)
 * - .scroll-reveal-right (fade from right)
 */
export function useScrollAnimation(options?: IntersectionObserverInit) {
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            // Immediately show all elements if user prefers reduced motion
            document.querySelectorAll('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right').forEach((el) => {
                el.classList.add('animate-in');
            });
            return;
        }

        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                        // Unobserve after animating (one-time animation)
                        observerRef.current?.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px -10% 0px',
                ...options,
            }
        );

        // Observe all scroll-reveal elements
        document.querySelectorAll('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right').forEach((el) => {
            observerRef.current?.observe(el);
        });

        return () => {
            observerRef.current?.disconnect();
        };
    }, [options]);
}

export default useScrollAnimation;
