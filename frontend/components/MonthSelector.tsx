/**
 * Componente reutilizável do frontend; encapsula uma parte relevante da interface dentro do domínio de componentes reutilizáveis da interface.
 */
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMonth } from '../context/MonthContext';
import { useCurrency } from '../context/CurrencyContext'; // Added this import
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const MonthSelector: React.FC = () => {
    const { selectedDate, setDate } = useMonth();
    const { locale } = useCurrency(); // Added this line to get locale
    const [isOpen, setIsOpen] = useState(false);
    const [tempYear, setTempYear] = useState(selectedDate.getFullYear());
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    // Fechar ao clicar fora e recalcular posição
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        const updatePosition = () => {
            if (isOpen && buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                setDropdownPos({
                    top: rect.bottom + window.scrollY + 8, // 8px de gap 
                    left: rect.left + window.scrollX
                });
            }
        };

        if (isOpen) {
            updatePosition();
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition);
        };
    }, [isOpen]);

    const handleSelectMonth = (monthIndex: number) => {
        setDate(new Date(tempYear, monthIndex, 1));
        setIsOpen(false);
    };

    const monthName = selectedDate.toLocaleDateString(locale, { month: 'short' }); // Changed 'pt-BR' to locale
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const toggleOpen = () => {
        if (!isOpen) {
            setTempYear(selectedDate.getFullYear());
        }
        setIsOpen(!isOpen);
    };

    return (
        <>
            <button
                ref={buttonRef}
                onClick={toggleOpen}
                className="flex items-center justify-center bg-slate-100/50 dark:bg-slate-900/50 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 rounded-xl p-2 md:p-2.5 transition-all border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative z-50 active:scale-95"
                title="Escolher Mês"
            >
                <CalendarDays className="w-4 h-4 md:w-5 h-5 transition-colors" />
                <span className="ml-2 text-[10px] md:text-xs font-black uppercase tracking-widest hidden sm:block">
                    {capitalizedMonth} {selectedDate.getFullYear()}
                </span>
            </button>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="absolute z-[9999] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-5 w-72 animate-in fade-in slide-in-from-top-2"
                    style={{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px` }}
                >
                    {/* Header: Troca de Ano */}
                    <div className="flex justify-between items-center mb-6">
                        <button
                            onClick={() => setTempYear(y => y - 1)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all active:scale-90"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="font-black text-slate-800 dark:text-white text-lg tracking-tight">{tempYear}</span>
                        <button
                            onClick={() => setTempYear(y => y + 1)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all active:scale-90"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Grade de Meses */}
                    <div className="grid grid-cols-3 gap-2">
                        {MONTHS.map((m, index) => {
                            const isSelected = selectedDate.getMonth() === index && selectedDate.getFullYear() === tempYear;
                            return (
                                <button
                                    key={m}
                                    onClick={() => handleSelectMonth(index)}
                                    className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${isSelected
                                        ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
                                        : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 border border-transparent hover:border-cyan-100 dark:hover:border-cyan-500/20'
                                        }`}
                                >
                                    {m}
                                </button>
                            );
                        })}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
