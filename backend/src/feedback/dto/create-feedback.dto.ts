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
