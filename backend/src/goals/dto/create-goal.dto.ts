import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01) // V17: Target amount must be > 0
  @Max(99999999.99, { message: 'Target amount must be less than R$ 100.000.000' })
  targetAmount: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(99999999.99, { message: 'Current amount must be less than R$ 100.000.000' })
  currentAmount?: number;

  @IsDateString()
  @IsOptional()
  deadline?: string;
}
