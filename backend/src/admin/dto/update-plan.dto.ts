import { IsIn } from 'class-validator';

export class UpdatePlanDto {
  @IsIn(['free', 'pro', 'premium'])
  plan!: 'free' | 'pro' | 'premium';

  @IsIn(['lifetime', '30d', '60d', '90d', 'custom'])
  duration!: 'lifetime' | '30d' | '60d' | '90d' | 'custom';
}