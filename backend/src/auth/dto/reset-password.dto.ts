import { IsString, MinLength, MaxLength, Length } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @Length(1)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}