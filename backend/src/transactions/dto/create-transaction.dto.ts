import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTransactionDto {
    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @IsDateString()
    date: string; // ISO string

    @IsString()
    @IsOptional()
    categoryId?: string;

    @IsString()
    @IsOptional()
    categoryLegacy?: string;

    @IsString()
    @IsOptional()
    accountId?: string;

    @IsString()
    @IsOptional()
    creditCardId?: string;

    @IsString()
    type: string; // 'INCOME' | 'EXPENSE'

    @IsBoolean()
    @IsOptional()
    isFixed?: boolean;
}
