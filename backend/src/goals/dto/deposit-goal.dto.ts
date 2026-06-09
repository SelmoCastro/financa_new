/**
 * DTO usado para validar e tipar o payload de deposit goal dentro do fluxo de metas financeiras.
 */
import { IsNumber, Max, Min } from 'class-validator';

export class DepositGoalDto {
  @IsNumber()
  @Min(0.01, { message: 'O valor do depósito deve ser positivo' })
  @Max(99999999.99, {
    message: 'O valor do depósito deve ser menor que R$ 100.000.000',
  })
  amount: number;
}
