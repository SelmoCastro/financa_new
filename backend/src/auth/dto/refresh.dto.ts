import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RefreshDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  refreshToken?: string;
}
