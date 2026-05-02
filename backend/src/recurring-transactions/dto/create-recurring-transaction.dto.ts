import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, Min, Max, IsUUID } from 'class-validator';

export class CreateRecurringTransactionDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  type: string; // INCOME, EXPENSE

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
