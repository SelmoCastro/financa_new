/**
 * DTO usado para validar e tipar o payload de create feedback dentro do fluxo de feedback dos usuários.
 */
import { IsString, MaxLength, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateFeedbackDto {
  @IsString()
  @MaxLength(2000)
  content: string;

  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsIn(['web', 'mobile'])
  platform: string;
}
