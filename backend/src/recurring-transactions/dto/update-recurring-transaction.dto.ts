import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class UpdateRecurringTransactionDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  amount?: number;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
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
