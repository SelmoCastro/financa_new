import { IsString, IsNumber, IsDateString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class ImportValidateTransactionDto {
    @IsString()
    description: string;

    @IsNumber()
    amount: number;

    @IsDateString()
    date: Date;

    @IsString()
    type: string;

    @IsString()
    @IsOptional()
    fitId?: string;

    @IsString()
    @IsOptional()
    accountId?: string;
}

export class ImportConfirmTransactionDto {
    @IsString()
    description: string;

    @IsNumber()
    amount: number;

    @IsDateString()
    date: Date;

    @IsString()
    type: string;

    @IsString()
    @IsOptional()
    fitId?: string;

    @IsBoolean()
    @IsOptional()
    isFixed?: boolean;

    @IsString()
    @IsOptional()
    categoryId?: string;

    @IsString()
    @IsOptional()
    categoryLegacy?: string;

    @IsNumber()
    @IsOptional()
    classificationRule?: number;

    @IsString()
    @IsOptional()
    accountId?: string;

    @IsString()
    @IsOptional()
    creditCardId?: string;
}

/**
 * Payload completo de confirmação de importação.
 * Inclui as transações confirmadas + os FITIDs que o usuário rejeitou
 * na tela de revisão, para que possamos gravá-los e não mostrá-los novamente.
 */
export class ImportConfirmPayloadDto {
    @IsArray()
    transactions: ImportConfirmTransactionDto[];

    @IsArray()
    @IsOptional()
    rejectedFitIds?: string[];
}
