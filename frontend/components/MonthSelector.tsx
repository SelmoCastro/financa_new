import React, { useState, useRef, useEffect } from 'react';
import { useMonth } from '../context/MonthContext';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const MonthSelector: React.FC = () => {
    const { selectedDate, setDate } = useMonth();
    const [isOpen, setIsOpen] = useState(false);
    const [tempYear, setTempYear] = useState(selectedDate.getFullYear());
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fechar ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectMonth = (monthIndex: number) => {
        setDate(new Date(tempYear, monthIndex, 1));
        setIsOpen(false);
    };

    const monthName = selectedDate.toLocaleDateString('pt-BR', { month: 'short' });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => {
                    setTempYear(selectedDate.getFullYear());
                    setIsOpen(!isOpen);
                }}
                className="flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl p-3 md:p-3.5 transition-colors shadow-sm"
                title="Escolher Mês"
            >
                <CalendarDays className="w-5 h-5 text-indigo-500" />
            </button>

            {isOpen && (
                <div className="absolute top-12 left-0 z-50 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-4 w-72 animate-in fade-in slide-in-from-top-2">
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
                </div>
            )}
        </div>
    );
};
