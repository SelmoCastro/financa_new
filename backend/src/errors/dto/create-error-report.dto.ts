import {
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class CreateErrorReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @IsString()
  @IsOptional()
  @MaxLength(8000)
  stack?: string;

  @IsString()
  @IsOptional()
  @MaxLength(8000)
  componentStack?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  platform?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  appVersion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  deviceId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsDateString()
  @IsOptional()
  timestamp?: string;
}
