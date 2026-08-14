/**
 * DTO usado para validar e tipar o payload de update credit card dentro do fluxo de cartões de crédito.
 */
import { PartialType } from '@nestjs/swagger';
import { CreateCreditCardDto } from './create-credit-card.dto';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateCreditCardDto extends PartialType(CreateCreditCardDto) {
  @IsInt()
  @Min(0)
  @IsOptional()
  version?: number;
}
