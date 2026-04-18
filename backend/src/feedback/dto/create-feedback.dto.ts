import { IsString, MaxLength, IsIn } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  @MaxLength(2000)
  content: string;

  @IsString()
  @IsIn(['web', 'mobile'])
  platform: string;
}