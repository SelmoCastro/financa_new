import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { useLanguage } from './LanguageContext';

export type CurrencyCode = 'BRL' | 'USD' | 'EUR';

interface ExchangeRates {
    USD: number; // 1 BRL = X USD
    EUR: number; // 1 BRL = X EUR
    date: string;
    source: string;
}

interface CurrencyContextType {
    currency: CurrencyCode;
    setCurrency: (currency: CurrencyCode) => void;
    formatCurrency: (value: number | string, options?: Intl.NumberFormatOptions) => string;
    currencySymbol: string;
    locale: string;
    rates: ExchangeRates | null;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const RATES_CACHE_KEY = 'finanza_exchange_rates';
const RATES_CACHE_TTL = 30 * 60 * 1000; // 30 minutos

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currency, setCurrencyState] = useState<CurrencyCode>('BRL');
    const [rates, setRates] = useState<ExchangeRates | null>(null);
    const { locale } = useLanguage();

    // Carregar moeda salva
    useEffect(() => {
        const storedCurrency = localStorage.getItem('app_currency');
        if (storedCurrency && ['BRL', 'USD', 'EUR'].includes(storedCurrency)) {
            setCurrencyState(storedCurrency as CurrencyCode);
        }
    }, []);

    // Buscar taxas de câmbio
    useEffect(() => {
        // Tentar cache primeiro
        try {
            const cached = localStorage.getItem(RATES_CACHE_KEY);
            if (cached) {
                const { rates: cachedRates, ts } = JSON.parse(cached);
                if (Date.now() - ts < RATES_CACHE_TTL) {
                    setRates(cachedRates);
                    return;
                }
            }
        } catch { /* ignora */ }

        // Buscar da API
        const controller = new AbortController();
        fetch('/api/v1/exchange-rate', { signal: controller.signal })
            .then(res => res.json())
            .then(data => {
                // Lidar com envelope NestJS { data: {...} }
                const r = data.data || data;
                setRates(r);
                try {
                    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ rates: r, ts: Date.now() }));
                } catch { /* localStorage cheio */ }
            })
            .catch(err => {
                if (err.name !== 'AbortError') {
                    console.warn('[Currency] Falha ao buscar cotação:', err.message);
                }
                // Usa cache expirado se existir
                try {
                    const cached = localStorage.getItem(RATES_CACHE_KEY);
                    if (cached) {
                        const { rates: cachedRates } = JSON.parse(cached);
                        setRates(cachedRates);
                    }
                } catch { /* ignora */ }
            });

        return () => controller.abort();
    }, [currency]); // re-fetch quando mudar moeda também

    const setCurrency = useCallback((newCurrency: CurrencyCode) => {
        setCurrencyState(newCurrency);
        localStorage.setItem('app_currency', newCurrency);
    }, []);

    const formatCurrency = useCallback((value: number | string, options?: Intl.NumberFormatOptions) => {
        if (value === null || value === undefined) {
            return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(0);
        }
        const numValue = typeof value === 'string' ? Number(value) : value;
        if (isNaN(numValue)) {
            return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(0);
        }

        // Converter: valor em BRL → moeda alvo
        let converted = numValue;
        if (currency === 'USD' && rates?.USD && rates.USD > 0) {
            converted = numValue * rates.USD;
        } else if (currency === 'EUR' && rates?.EUR && rates.EUR > 0) {
            converted = numValue * rates.EUR;
        }

        return converted.toLocaleString(locale, {
            style: 'currency',
            currency,
            ...options,
        });
    }, [locale, currency, rates]);

    const currencySymbol = useMemo(() => {
        if (currency === 'USD') return '$';
        if (currency === 'EUR') return '€';
        return 'R$';
    }, [currency]);

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, currencySymbol, locale, rates }}>
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
