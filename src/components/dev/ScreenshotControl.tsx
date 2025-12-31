import { useEffect, useState } from 'react';

export function ScreenshotControl() {
    const [isEnabled, setIsEnabled] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Toggle on Ctrl+Shift+S or Cmd+Shift+S
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                setIsEnabled(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isEnabled) {
            document.body.classList.add('screenshot-mode');
        } else {
            document.body.classList.remove('screenshot-mode');
        }
    }, [isEnabled]);

    if (!isEnabled) return null;

    // Optional: Show a subtle indicator that disappears after a few seconds?
    // For now, we just rely on visual change of UI elements disappearing.
    return null;
}
