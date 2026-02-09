export interface Transaction {
    id: string;
    description: string;
    amount: number | string; // Adjusted to handle potential string inputs from forms
    type: 'INCOME' | 'EXPENSE';
    date: string;
    category: string;
    isFixed: boolean;
    userId: string;
    createdAt: string;
    updatedAt: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
}
