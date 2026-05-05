import React from 'react';
import { ToastProvider } from '../context/ToastContext';
import { MonthProvider } from '../context/MonthContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import { DataProvider } from '../context/DataProvider';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    <MonthProvider>
      <CurrencyProvider>
        <DataProvider>
          {children}
        </DataProvider>
      </CurrencyProvider>
    </MonthProvider>
  </ToastProvider>
);