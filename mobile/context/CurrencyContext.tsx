import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';

export type CurrencyCode = 'BRL' | 'USD' | 'EUR';

interface CurrencyContextType {
    currency: CurrencyCode;
    setCurrency: (currency: CurrencyCode) => Promise<void>;
    formatCurrency: (value: number | string, options?: Intl.NumberFormatOptions) => string;
    currencySymbol: string;
    locale: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currency, setCurrencyState] = useState<CurrencyCode>('BRL');

    useEffect(() => {
        async function loadStoredCurrency() {
            try {
                const storedCurrency = await SecureStore.getItemAsync('app_currency');
                if (storedCurrency && ['BRL', 'USD', 'EUR'].includes(storedCurrency)) {
                    setCurrencyState(storedCurrency as CurrencyCode);
                }
            } catch (e) {
                console.error('[CurrencyContext] Erro ao carregar moeda:', e);
            }
        }
        loadStoredCurrency();
    }, []);

    const setCurrency = async (newCurrency: CurrencyCode) => {
        try {
            setCurrencyState(newCurrency);
            await SecureStore.setItemAsync('app_currency', newCurrency);
        } catch (e) {
            console.error('[CurrencyContext] Erro ao salvar moeda:', e);
        }
    };

    const formatCurrency = (value: number | string, options?: Intl.NumberFormatOptions) => {
        const numValue = typeof value === 'string' ? Number(value) : value;
        const safeValue = isNaN(numValue) ? 0 : numValue;

        let currentLocale = 'pt-BR';
        if (currency === 'USD') currentLocale = 'en-US';
        if (currency === 'EUR') currentLocale = 'de-DE';

        return safeValue.toLocaleString(currentLocale, {
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
