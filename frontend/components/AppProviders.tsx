import React from 'react';
import { ToastProvider } from '../context/ToastContext';
import { MonthProvider } from '../context/MonthContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import { LanguageProvider } from '../context/LanguageContext';
import { DataProvider } from '../context/DataProvider';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    <MonthProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <DataProvider>
            {children}
          </DataProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </MonthProvider>
  </ToastProvider>
);