/**
 * DTO usado para validar e tipar o payload de verify email dentro do fluxo de autenticação.
 */
import { IsString, Length, MaxLength } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @Length(1)
  @MaxLength(256)
  token: string;
}
