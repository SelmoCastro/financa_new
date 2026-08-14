/**
 * DTO usado para validar e tipar o payload de update transaction dentro do fluxo de transações financeiras.
 */
import { PartialType, OmitType } from '@nestjs/swagger';
import { IsIn, IsOptional, IsInt, Min } from 'class-validator';
import {
  CreateTransactionDto,
  TransactionType,
} from './create-transaction.dto';

export class UpdateTransactionDto extends OmitType(
  PartialType(CreateTransactionDto),
  ['sharedWithEmail', 'type'] as const,
) {
  @IsInt()
  @Min(0)
  @IsOptional()
  version?: number;

  @IsOptional()
  @IsIn(['INCOME', 'EXPENSE'], {
    message: 'Use o endpoint de transferência para alterar transações TRANSFER',
  })
  type?: TransactionType.INCOME | TransactionType.EXPENSE;
}
