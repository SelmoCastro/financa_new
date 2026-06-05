import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class UpdateAccountDto {
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
