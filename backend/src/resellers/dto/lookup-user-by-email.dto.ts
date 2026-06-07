/**
 * DTO usado para validar e tipar o payload de lookup user by email dentro do fluxo de revendedores e créditos.
 */
import { IsNotEmpty } from 'class-validator';
import { IsValidEmail } from '../../users/validators/is-valid-email.validator';

export class LookupUserByEmailDto {
  @IsValidEmail()
  @IsNotEmpty()
  email!: string;
}
