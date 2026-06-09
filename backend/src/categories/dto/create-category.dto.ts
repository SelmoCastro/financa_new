/**
 * DTO usado para validar e tipar o payload de create category dentro do fluxo de categorias.
 */
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  MaxLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(7)
  color?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  icon?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['INCOME', 'EXPENSE', 'TRANSFER'])
  type: string;
}
