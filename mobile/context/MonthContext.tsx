import React, { createContext, useState, useContext, ReactNode } from 'react';

interface MonthContextData {
    selectedDate: Date;
    changeMonth: (increment: number) => void;
    setDate: (date: Date) => void;
}

const MonthContext = createContext<MonthContextData>({} as MonthContextData);

export const MonthProvider = ({ children }: { children: ReactNode }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());

    const setDate = React.useCallback((date: Date) => {
        setSelectedDate(date);
    }, []);

    const changeMonth = React.useCallback((increment: number) => {
        setSelectedDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + increment);
            return newDate;
        });
    }, []);

    const value = React.useMemo(() => ({
        selectedDate,
        changeMonth,
        setDate
    }), [selectedDate, changeMonth, setDate]);

    return (
        <MonthContext.Provider value={value}>
            {children}
        </MonthContext.Provider>
    );
};

export const useMonth = () => useContext(MonthContext);
