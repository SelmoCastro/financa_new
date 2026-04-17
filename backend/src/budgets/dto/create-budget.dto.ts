import { IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

export class CreateBudgetDto {
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;
}