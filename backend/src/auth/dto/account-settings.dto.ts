import { IsString, MinLength, IsEmail, IsOptional } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class ChangeEmailDto {
  @IsEmail()
  newEmail: string;

  @IsString()
  password: string;
}

export class ChangeNameDto {
  @IsString()
  @IsOptional()
  name?: string;
}