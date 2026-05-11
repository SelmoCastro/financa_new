import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';

export class CreatePreferenceDto {
  @IsString()
  @IsIn(['premium_monthly', 'premium_annual'])
  plan!: 'premium_monthly' | 'premium_annual';

  @IsString()
  @IsOptional()
  external_reference?: string;
}

export class MercadoPagoWebhookDto {
  @IsString()
  @IsOptional()
  action?: string;

  @IsString()
  @IsOptional()
  api_version?: string;

  @IsString()
  @IsOptional()
  data_id?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsNumber()
  @IsOptional()
  id?: number;

  @IsNumber()
  @IsOptional()
  user_id?: number;

  @IsString()
  @IsOptional()
  date_created?: string;

  @IsNumber()
  @IsOptional()
  live_mode?: boolean;
}
