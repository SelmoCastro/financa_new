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
    @IsNotEmpty()
    category: string;

    @IsString() // Ideally @IsEnum(TransactionType) but keeping string for now to match current simple implementation
    type: string; // 'INCOME' | 'EXPENSE'

    @IsBoolean()
    @IsOptional()
    isFixed?: boolean;
}
