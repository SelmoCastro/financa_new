/**
 * DTO usado para validar e tipar o payload de ai chat dentro do fluxo de inteligência artificial.
 */
import { IsString, MaxLength } from 'class-validator';

export class AiChatDto {
  @IsString()
  @MaxLength(4000)
  message: string;
}
