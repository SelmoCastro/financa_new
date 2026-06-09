/**
 * DTO usado para validar e tipar o payload de forgot password dentro do fluxo de autenticação.
 */
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}
