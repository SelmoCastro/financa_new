import { IsIn, IsString, IsOptional, IsNumber, IsBoolean, Min, Max, IsUUID } from 'class-validator';

export class UpdateRecurringTransactionDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  @Max(99999999.99)
  amount?: number;

  @IsIn(['INCOME', 'EXPENSE'])
  @IsOptional()
  type?: string;

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
  @IsOptional()
  @Min(1)
  @Max(31)
  dueDay?: number;

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
