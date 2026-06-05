import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsUUID,
  IsIn,
} from 'class-validator';

export class CreateRecurringTransactionDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  @Max(99999999.99)
  amount: number;

  @IsIn(['INCOME', 'EXPENSE'])
  type: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsUUID()
  @IsOptional()
  accountId?: string;

  @IsUUID()
  @IsOptional()
  creditCardId?: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(31)
  dueDay: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(12)
  startMonth?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(12)
  endMonth?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
