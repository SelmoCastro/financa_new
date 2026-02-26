export interface Transaction {
    id: string;
    description: string;
    amount: number | string; // Adjusted to handle potential string inputs from forms
    type: 'INCOME' | 'EXPENSE';
    date: string;
    category: string;
    categoryLegacy?: string;
    isFixed: boolean;
    accountId?: string;
    creditCardId?: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
}

export interface Account {
    id: string;
    name: string;
    type: string;
    balance: number;
}

export interface CreditCard {
    id: string;
    name: string;
    limit: number;
    closingDay: number;
    dueDay: number;
    accountId: string;
}
