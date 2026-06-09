/**
 * DTO usado para validar e tipar o payload de update credit card dentro do fluxo de cartões de crédito.
 */
import { PartialType } from '@nestjs/swagger';
import { CreateCreditCardDto } from './create-credit-card.dto';

export class UpdateCreditCardDto extends PartialType(CreateCreditCardDto) {}
