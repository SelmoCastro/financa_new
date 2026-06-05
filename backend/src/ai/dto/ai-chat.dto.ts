import { IsString, MaxLength } from 'class-validator';

export class AiChatDto {
  @IsString()
  @MaxLength(4000)
  message: string;
}
