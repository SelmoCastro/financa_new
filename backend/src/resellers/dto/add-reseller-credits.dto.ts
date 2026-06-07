/**
 * DTO usado para validar e tipar o payload de add reseller credits dentro do fluxo de revendedores e créditos.
 */
import { IsInt, IsNotEmpty, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class AddResellerCreditsDto {
  @IsInt()
  @Min(1)
  @Max(100000)
  credits!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  reason!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  notes!: string;

  @IsUUID()
  idempotencyKey!: string;
}
