export interface Transaction {
    id: string;
    description: string;
    amount: number | string; // Adjusted to handle potential string inputs from forms
    type: 'INCOME' | 'EXPENSE';
    date: string;
    category?: { id: string; name: string; type: string; color: string; icon: string };
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

export interface Budget {
    id: string;
    amount: number;
    categoryId: string;
    categoryObj: { id: string; name: string; icon: string; color?: string };
    spent: number;
    percentage: number;
    isOverBudget: boolean;
}

export interface Goal {
    id: string;
    title: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    progress: number;
    remainingAmount: number;
}
