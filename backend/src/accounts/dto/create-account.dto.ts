import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max, IsIn } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['CHECKING', 'SAVINGS', 'INVESTMENT', 'CASH', 'OTHER'])
  type: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(9999999999999.99)
  balance?: number;
}