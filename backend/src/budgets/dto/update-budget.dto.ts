import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  Max,
} from 'class-validator';

export class UpdateBudgetDto {
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  @Max(99999999.99)
  amount?: number;
}
