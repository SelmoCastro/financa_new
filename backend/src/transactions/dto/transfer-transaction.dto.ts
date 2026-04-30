import {
  IsString,
  IsUUID,
  IsNumber,
  IsDateString,
  IsOptional,
  IsNotEmpty,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class TransferTransactionDto {
  @IsUUID()
  @IsNotEmpty()
  sourceAccountId: string;

  @IsUUID()
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
  @MaxLength(500)
  description?: string;
}