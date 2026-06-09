/**
 * DTO usado para validar e tipar o payload de refresh dentro do fluxo de autenticação.
 */
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RefreshDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  refreshToken?: string;
}
