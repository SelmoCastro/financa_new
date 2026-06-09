/**
 * DTO usado para validar e tipar o payload de create user dentro do fluxo de usuários.
 */
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsBoolean,
} from 'class-validator';
import { IsValidEmail } from '../validators/is-valid-email.validator';

export class CreateUserDto {
  @IsValidEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @MaxLength(72, { message: 'A senha deve ter no máximo 72 caracteres' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, {
    message: 'A senha deve conter pelo menos letras e números',
  })
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsBoolean()
  @IsNotEmpty({
    message: 'Você deve aceitar os termos de uso para criar uma conta',
  })
  termsAccepted: boolean;
}
