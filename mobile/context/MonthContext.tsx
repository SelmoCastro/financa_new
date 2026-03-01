import React, { createContext, useState, useContext, ReactNode } from 'react';

interface MonthContextData {
    selectedDate: Date;
    changeMonth: (increment: number) => void;
    setDate: (date: Date) => void;
}

const MonthContext = createContext<MonthContextData>({} as MonthContextData);

export const MonthProvider = ({ children }: { children: ReactNode }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());

    const changeMonth = (increment: number) => {
        setSelectedDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + increment);
            return newDate;
        });
    };

    const setDate = (date: Date) => {
        setSelectedDate(date);
    }

    return (
        <MonthContext.Provider value={{ selectedDate, changeMonth, setDate }}>
            {children}
        </MonthContext.Provider>
    );
};

export const useMonth = () => useContext(MonthContext);
