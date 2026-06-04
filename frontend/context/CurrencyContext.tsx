import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useLanguage } from './LanguageContext';

export type CurrencyCode = 'BRL' | 'USD' | 'EUR';

interface CurrencyContextType {
    currency: CurrencyCode;
    setCurrency: (currency: CurrencyCode) => void;
    formatCurrency: (value: number | string, options?: Intl.NumberFormatOptions) => string;
    currencySymbol: string;
    locale: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currency, setCurrencyState] = useState<CurrencyCode>('BRL');
    const { locale } = useLanguage();

    useEffect(() => {
        const storedCurrency = localStorage.getItem('app_currency');
        if (storedCurrency && ['BRL', 'USD', 'EUR'].includes(storedCurrency)) {
            setCurrencyState(storedCurrency as CurrencyCode);
        }
    }, []);

    const setCurrency = (newCurrency: CurrencyCode) => {
        setCurrencyState(newCurrency);
        localStorage.setItem('app_currency', newCurrency);
    };

    const formatCurrency = (value: number | string, options?: Intl.NumberFormatOptions) => {
        if (value === null || value === undefined) return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(0);
        const numValue = typeof value === 'string' ? Number(value) : value;
        if (isNaN(numValue)) return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(0);

        return numValue.toLocaleString(locale, {
            style: 'currency',
            currency,
            ...options,
        });
    };

    const currencySymbol = useMemo(() => {
        if (currency === 'USD') return '$';
        if (currency === 'EUR') return '€';
        return 'R$';
    }, [currency]);

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, currencySymbol, locale }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = (): CurrencyContextType => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};
