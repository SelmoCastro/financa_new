import { IsIn } from 'class-validator';

export class UpdatePlanDto {
  @IsIn(['free', 'premium'])
  plan!: 'free' | 'premium';

  @IsIn(['lifetime', '30d', '60d', '90d', 'custom'])
  duration!: 'lifetime' | '30d' | '60d' | '90d' | 'custom';
}