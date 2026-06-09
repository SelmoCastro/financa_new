/**
 * DTO usado para validar e tipar o payload de create account dentro do fluxo de contas bancárias.
 */
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsIn,
  MaxLength,
} from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['CHECKING', 'SAVINGS', 'INVESTMENT', 'CASH', 'WALLET', 'OTHER'])
  type: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(9999999999999.99)
  balance?: number;
}
