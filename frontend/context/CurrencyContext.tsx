import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';

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
        const numValue = typeof value === 'string' ? Number(value) : value;

        let currentLocale = 'pt-BR';
        if (currency === 'USD') currentLocale = 'en-US';
        if (currency === 'EUR') currentLocale = 'de-DE'; // Using German locale for Euro formatting as an example (1.234,56 €) or standard standard

        return numValue.toLocaleString(currentLocale, {
            style: 'currency',
            currency: currency,
            ...options
        });
    };

    const currencySymbol = useMemo(() => {
        if (currency === 'USD') return '$';
        if (currency === 'EUR') return '€';
        return 'R$';
    }, [currency]);

    const locale = useMemo(() => {
        if (currency === 'USD') return 'en-US';
        if (currency === 'EUR') return 'de-DE';
        return 'pt-BR';
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
