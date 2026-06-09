/**
 * Componente reutilizável do frontend; encapsula uma parte relevante da interface dentro do domínio de componentes reutilizáveis da interface.
 */
import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'rectangular' | 'circular' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rectangular' }) => {
    const baseClass = "bg-slate-200 dark:bg-slate-700 animate-pulse";

    if (variant === 'circular') {
        return <div className={`rounded-full ${baseClass} ${className}`} />;
    }

    if (variant === 'text') {
        return <div className={`rounded-md ${baseClass} ${className}`} />;
    }

    return <div className={`rounded-2xl ${baseClass} ${className}`} />;
};
