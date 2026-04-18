import { IsNotEmpty, IsNumber, IsUUID, Min, Max } from 'class-validator';

export class CreateBudgetDto {
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  @Max(99999999.99, { message: 'Budget amount must be less than R$ 100.000.000' })
  amount: number;
}