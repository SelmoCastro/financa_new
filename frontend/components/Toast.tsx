
import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    onClose: (id: string) => void;
}

const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500" />,
    info: <Info className="w-5 h-5 text-indigo-500" />
};

const styles = {
    success: 'bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-500/20 shadow-emerald-500/5',
    error: 'bg-white dark:bg-slate-900 border-rose-100 dark:border-rose-500/20 shadow-rose-500/5',
    info: 'bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-500/20 shadow-indigo-500/5'
};

export const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, 4000);

        return () => clearTimeout(timer);
    }, [id, onClose]);

    return (
        <div className={`flex items-center gap-4 p-5 rounded-[1.5rem] shadow-2xl border ${styles[type]} animate-in slide-in-from-right-4 fade-in duration-500 max-w-sm w-full pointer-events-auto backdrop-blur-xl`}>
            <div className="flex-shrink-0 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl shadow-sm">
                {icons[type]}
            </div>
            <p className="flex-1 text-sm font-black text-slate-700 dark:text-slate-200 tracking-tight leading-tight">{message}</p>
            <button
                onClick={() => onClose(id)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-all active:scale-90"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};
