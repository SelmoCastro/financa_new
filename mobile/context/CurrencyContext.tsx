import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useLanguage } from './LanguageContext';
import { API_URL } from '../services/appConfig';

export type CurrencyCode = 'BRL' | 'USD' | 'EUR';

interface ExchangeRates {
    USD: number; // 1 BRL = X USD
    EUR: number; // 1 BRL = X EUR
    date: string;
    source: string;
}

interface CurrencyContextType {
    currency: CurrencyCode;
    setCurrency: (currency: CurrencyCode) => Promise<void>;
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

    // Buscar taxas de câmbio (com cache em SecureStore)
    useEffect(() => {
        async function fetchRates() {
            // Tentar cache primeiro
            try {
                const cached = await SecureStore.getItemAsync(RATES_CACHE_KEY);
                if (cached) {
                    const { rates: cachedRates, ts } = JSON.parse(cached);
                    if (Date.now() - ts < RATES_CACHE_TTL) {
                        setRates(cachedRates);
                        return;
                    }
                }
            } catch { /* ignora */ }

            // Buscar da API
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000);

                const res = await fetch(`${API_URL}/exchange-rate`, {
                    signal: controller.signal,
                });
                clearTimeout(timeout);

                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const data = await res.json();
                const r = data.data || data;
                setRates(r);

                // Salvar no cache
                try {
                    await SecureStore.setItemAsync(RATES_CACHE_KEY, JSON.stringify({ rates: r, ts: Date.now() }));
                } catch { /* SecureStore cheio */ }
            } catch (err: any) {
                console.warn('[Currency] Falha ao buscar cotação:', err?.message || err);
                // Usa cache expirado se existir
                try {
                    const cached = await SecureStore.getItemAsync(RATES_CACHE_KEY);
                    if (cached) {
                        const { rates: cachedRates } = JSON.parse(cached);
                        setRates(cachedRates);
                    }
                } catch { /* ignora */ }
            }
        }
        fetchRates();
    }, [currency]);

    const setCurrency = React.useCallback(async (newCurrency: CurrencyCode) => {
        try {
            setCurrencyState(newCurrency);
            await SecureStore.setItemAsync('app_currency', newCurrency);
        } catch (e) {
            console.error('[CurrencyContext] Erro ao salvar moeda:', e);
        }
    }, []);

    const formatCurrency = React.useCallback((value: number | string, options?: Intl.NumberFormatOptions) => {
        // Proteção contra NaN/undefined/encrypted strings
        if (value === undefined || value === null) {
            return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(0);
        }
        if (typeof value === 'string' && value.startsWith('enc:')) {
            return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(0);
        }
        const numValue = typeof value === 'string' ? Number(value) : value;
        const safeValue = isNaN(numValue) ? 0 : numValue;

        // Converter: valor em BRL → moeda alvo
        let converted = safeValue;
        if (currency === 'USD' && rates?.USD && rates.USD > 0) {
            converted = safeValue * rates.USD;
        } else if (currency === 'EUR' && rates?.EUR && rates.EUR > 0) {
            converted = safeValue * rates.EUR;
        }

        return converted.toLocaleString(locale, {
            style: 'currency',
            currency,
            ...options,
        });
    }, [currency, locale, rates]);

    const currencySymbol = useMemo(() => {
        if (currency === 'USD') return '$';
        if (currency === 'EUR') return '€';
        return 'R$';
    }, [currency]);

    const value = React.useMemo(() => ({
        currency, setCurrency, formatCurrency, currencySymbol, locale, rates,
    }), [currency, setCurrency, formatCurrency, currencySymbol, locale, rates]);

    return (
        <CurrencyContext.Provider value={value}>
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
