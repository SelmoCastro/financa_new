import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';

export class TransferTransactionDto {
  @IsString()
  @IsNotEmpty()
  sourceAccountId: string;

  @IsString()
  @IsNotEmpty()
  destinationAccountId: string;

  @IsNumber()
  @Min(0.01, { message: 'O valor deve ser positivo' })
  @Max(9999999999999.99)
  amount: number;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  description?: string;
}