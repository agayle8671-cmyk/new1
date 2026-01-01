import React from 'react';
import { cn } from '../../lib/utils';

interface EditorWindowProps {
    children: React.ReactNode;
    title?: string;
    className?: string;
}

/**
 * EditorWindow - Dark window chrome component (Antigravity signature style)
 * 
 * Creates a macOS-style window with traffic light buttons on dark background.
 * Used for code displays, terminal outputs, and "Pro" visual contrast.
 * 
 * CSS:
 * - Border radius: 24px (rounded-window)
 * - Shadow: 0 20px 80px rgba(0,0,0,0.15)
 * - Background: #1a1a1a
 */
export function EditorWindow({ children, title, className }: EditorWindowProps) {
    return (
        <div className={cn('editor-window', className)}>
            {/* Title bar with traffic light dots */}
            <div className="editor-window-titlebar">
                <div className="flex gap-2">
                    <div className="editor-dot editor-dot-red" />
                    <div className="editor-dot editor-dot-yellow" />
                    <div className="editor-dot editor-dot-green" />
                </div>
                {title && (
                    <span className="ml-4 text-sm text-gray-400 font-medium">
                        {title}
                    </span>
                )}
            </div>

            {/* Content area */}
            <div className="p-6">
                {children}
            </div>
        </div>
    );
}

export default EditorWindow;
