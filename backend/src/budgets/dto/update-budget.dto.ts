import { IsNotEmpty, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class UpdateBudgetDto {
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  @IsNotEmpty()
  amount?: number;
}