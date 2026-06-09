/**
 * DTO usado para validar e tipar o payload de update goal dentro do fluxo de metas financeiras.
 */
import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateGoalDto } from './create-goal.dto';

// currentAmount must only change through the dedicated deposit endpoint.
export class UpdateGoalDto extends OmitType(PartialType(CreateGoalDto), [
  'currentAmount',
] as const) {}
