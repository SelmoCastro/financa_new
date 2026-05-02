import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class UpdateInstallmentDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  totalAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(31)
  dueDay?: number;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
