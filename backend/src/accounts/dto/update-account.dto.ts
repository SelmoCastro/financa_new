/**
 * DTO usado para validar e tipar o payload de update account dentro do fluxo de contas bancárias.
 */
import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';

export class UpdateAccountDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  version?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['CHECKING', 'SAVINGS', 'INVESTMENT', 'CASH', 'WALLET', 'OTHER'])
  @IsOptional()
  type?: string;
}
