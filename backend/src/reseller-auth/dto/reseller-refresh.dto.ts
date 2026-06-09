/**
 * DTO usado para validar e tipar o payload de reseller refresh dentro do fluxo de autenticação de revendedores.
 */
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ResellerRefreshDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  refreshToken?: string;
}
