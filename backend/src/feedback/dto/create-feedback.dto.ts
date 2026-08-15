/**
 * DTO usado para validar e tipar o payload de create feedback dentro do fluxo de feedback dos usuários.
 */
import { IsString, MaxLength, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

function normalizePlatform(value: unknown): unknown {
  return typeof value === 'string' ? value.toLowerCase() : value;
}

export class CreateFeedbackDto {
  @IsString()
  @MaxLength(2000)
  content: string;

  @IsString()
  @Transform(({ value }) => normalizePlatform(value))
  @IsIn(['web', 'mobile'])
  platform: string;
}
