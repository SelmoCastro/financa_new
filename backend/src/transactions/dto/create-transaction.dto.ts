import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @Transform(({ value }) =>
    value !== null && value !== undefined ? Number(value) : value,
  )
  @Min(0.01, { message: 'O valor deve ser positivo' })
  @Max(99999999.99, { message: 'O valor deve ser menor que R$ 100.000.000' })
  amount: number;

  @IsDateString()
  date: string; // ISO string

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  categoryLegacy?: string;

  @IsUUID()
  @IsOptional()
  accountId?: string;

  @IsUUID()
  @IsOptional()
  creditCardId?: string;

  @IsIn(['INCOME', 'EXPENSE', 'TRANSFER'], {
    message: 'Tipo deve ser INCOME, EXPENSE ou TRANSFER',
  })
  type: TransactionType;

  @IsBoolean()
  @IsOptional()
  isFixed?: boolean;

  @IsEmail({}, { message: 'Email inválido para compartilhamento' })
  @IsOptional()
  sharedWithEmail?: string;
}
