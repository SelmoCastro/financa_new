/**
 * DTO usado para validar e tipar o payload de reseller login dentro do fluxo de autenticação de revendedores.
 */
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { IsValidEmail } from '../../users/validators/is-valid-email.validator';

export class ResellerLoginDto {
  @IsValidEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;
}
