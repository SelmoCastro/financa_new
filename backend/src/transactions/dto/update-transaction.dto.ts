import { PartialType, OmitType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CreateTransactionDto, TransactionType } from './create-transaction.dto';

export class UpdateTransactionDto extends OmitType(PartialType(CreateTransactionDto), ['sharedWithEmail', 'type'] as const) {
  @IsOptional()
  @IsIn(['INCOME', 'EXPENSE'], { message: 'Use o endpoint de transferência para alterar transações TRANSFER' })
  type?: TransactionType.INCOME | TransactionType.EXPENSE;
}