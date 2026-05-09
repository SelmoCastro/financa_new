import { IsString, MinLength, IsEmail, IsOptional, MaxLength, Matches, IsUUID } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  currentPassword: string;

  @IsString()
  @MinLength(8) // V7: Aligned with CreateUserDto/ResetPasswordDto
  @MaxLength(72) // bcrypt truncates >72 bytes
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, { message: 'Senha deve conter pelo menos uma letra e um número' })
  newPassword: string;
}

export class ChangeEmailDto {
  @IsEmail()
  newEmail: string;

  @IsString()
  @MaxLength(72)
  password: string;
}

export class ChangeNameDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;
}

// V13: Proper DTO for delete-account (was inline type)
export class DeleteAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}