export class ImportValidateTransactionDto {
    description: string;
    amount: number;
    date: Date;
    type: string;
    fitId: string;
}

export class ImportConfirmTransactionDto {
    description: string;
    amount: number;
    date: Date;
    type: string;
    fitId?: string;
    isFixed?: boolean;
    categoryId?: string;
    categoryLegacy?: string;
    classificationRule?: number;
    accountId?: string;
    creditCardId?: string;
}
