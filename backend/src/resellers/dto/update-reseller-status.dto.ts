/**
 * DTO usado para validar e tipar o payload de update reseller status dentro do fluxo de revendedores e créditos.
 */
import { IsIn } from 'class-validator';
import { RESELLER_STATUSES, ResellerStatus } from '../reseller.constants';

export class UpdateResellerStatusDto {
  @IsIn(RESELLER_STATUSES)
  status!: ResellerStatus;
}
