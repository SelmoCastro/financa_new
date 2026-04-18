import { IsString, MinLength, MaxLength, Length, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @Length(1)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, { message: 'Senha deve conter letras e numeros' })
  password: string;
}