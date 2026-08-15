/**
 * DTO usado para validar e tipar o payload de activate premium dentro do fluxo de revendedores e créditos.
 */
import { IsBoolean, IsIn, IsNotEmpty, IsUUID } from 'class-validator';
import { IsValidEmail } from '../../users/validators/is-valid-email.validator';
import {
  RESELLER_PREMIUM_SKUS,
  ResellerPremiumSku,
} from '../reseller.constants';

export class ActivatePremiumDto {
  @IsValidEmail()
  @IsNotEmpty()
  email!: string;

  @IsIn(RESELLER_PREMIUM_SKUS)
  sku!: ResellerPremiumSku;

  @IsBoolean()
  confirmationChecked!: boolean;

  @IsUUID()
  idempotencyKey!: string;
}
