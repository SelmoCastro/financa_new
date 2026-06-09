/**
 * DTO usado para validar e tipar o payload de reset password dentro do fluxo de autenticação.
 */
import {
  IsString,
  MinLength,
  MaxLength,
  Length,
  Matches,
} from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @Length(1)
  @MaxLength(256)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, {
    message: 'Senha deve conter letras e numeros',
  })
  password: string;
}
