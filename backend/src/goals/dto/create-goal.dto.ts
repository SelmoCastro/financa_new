import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  targetAmount: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  currentAmount?: number;

  @IsDateString()
  @IsOptional()
  deadline?: string;
}
