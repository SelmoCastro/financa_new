import { IsString, IsNumber, IsDateString, IsOptional, IsNotEmpty } from 'class-validator';

export class TransferTransactionDto {
    @IsString()
    @IsNotEmpty()
    sourceAccountId: string;

    @IsString()
    @IsNotEmpty()
    destinationAccountId: string;

    @IsNumber()
    amount: number;

    @IsDateString()
    date: string;

    @IsString()
    @IsOptional()
    description?: string;
}
