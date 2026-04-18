import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['INCOME', 'EXPENSE', 'TRANSFER'])
  type: string;
}
