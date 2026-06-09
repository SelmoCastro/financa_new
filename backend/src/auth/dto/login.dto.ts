/**
 * DTO usado para validar e tipar o payload de login dentro do fluxo de autenticação.
 */
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72) // bcrypt truncates >72 bytes, prevent DoS
  password: string;
}
