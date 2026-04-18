import { IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @Length(1)
  token: string;
}