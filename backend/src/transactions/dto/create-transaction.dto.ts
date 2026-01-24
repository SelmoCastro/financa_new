
export class CreateTransactionDto {
    description: string;
    amount: number;
    date: string; // ISO string
    category: string;
    type: string; // 'INCOME' | 'EXPENSE'
    isFixed?: boolean;
}
