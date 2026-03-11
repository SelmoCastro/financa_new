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
                className="flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl p-2 md:p-2.5 transition-colors shadow-sm relative z-50"
                title="Escolher Mês"
            >
                <CalendarDays className="w-4 h-4 text-indigo-500" />
                <span className="ml-2 text-sm font-semibold hidden md:block">
                    {capitalizedMonth} {selectedDate.getFullYear()}
                </span>
            </button>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="absolute z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 w-72 animate-in fade-in slide-in-from-top-2"
                    style={{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px` }}
                >
                    {/* Header: Troca de Ano */}
                    <div className="flex justify-between items-center mb-4">
                        <button
                            onClick={() => setTempYear(y => y - 1)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="font-black text-slate-800 text-lg">{tempYear}</span>
                        <button
                            onClick={() => setTempYear(y => y + 1)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
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
                                    className={`py-2 rounded-xl text-sm font-bold transition-all ${isSelected
                                        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-indigo-600'
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
