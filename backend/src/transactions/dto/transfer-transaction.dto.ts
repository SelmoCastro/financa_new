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
  @Max(99999999.99, { message: 'O valor deve ser menor que R$ 100.000.000' })
  amount: number;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  description?: string;
}