import { IsNotEmpty, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateBudgetDto {
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  amount: number;
}