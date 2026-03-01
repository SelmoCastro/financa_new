import React, { useEffect } from 'react';
import { useMonth } from '../context/MonthContext';

export const MonthSelector: React.FC = () => {
    const { selectedDate, changeMonth } = useMonth();

    const formattedDate = selectedDate.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric'
    });

    const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    // Refresh lucide icons when component renders to ensure chevrons appear
    useEffect(() => {
        // @ts-ignore
        if (window.lucide) {
            // @ts-ignore
            window.lucide.createIcons();
        }
    }, [selectedDate]);

    return (
        <div className="flex items-center justify-center bg-slate-100 rounded-full px-3 py-1.5 md:px-4 md:py-2 w-fit">
            <button
                onClick={() => changeMonth(-1)}
                className="p-1 hover:bg-slate-200 rounded-full transition-colors active:scale-95 text-slate-500 hover:text-indigo-600"
            >
                <i data-lucide="chevron-left" className="w-4 h-4 md:w-5 md:h-5"></i>
            </button>

            <span className="mx-2 md:mx-4 font-bold text-slate-700 min-w-[110px] md:min-w-[130px] text-center text-xs md:text-sm capitalize">
                {displayDate}
            </span>

            <button
                onClick={() => changeMonth(1)}
                className="p-1 hover:bg-slate-200 rounded-full transition-colors active:scale-95 text-slate-500 hover:text-indigo-600"
            >
                <i data-lucide="chevron-right" className="w-4 h-4 md:w-5 md:h-5"></i>
            </button>
        </div>
    );
};
