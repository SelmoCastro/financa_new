import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsEmail,
} from 'class-validator';

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01, { message: 'O valor deve ser positivo' })
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

  @IsIn(['INCOME', 'EXPENSE', 'TRANSFER'], { message: 'Tipo deve ser INCOME, EXPENSE ou TRANSFER' })
  type: TransactionType;

  @IsBoolean()
  @IsOptional()
  isFixed?: boolean;

  @IsEmail({}, { message: 'Email inválido para compartilhamento' })
  @IsOptional()
  sharedWithEmail?: string;
}
