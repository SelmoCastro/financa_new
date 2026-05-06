import { IsString, IsNumber, IsOptional, IsPositive, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para pagamento (parcial ou total) de uma fatura.
 */
export class PayInvoiceDto {
  @ApiPropertyOptional({ description: 'Valor a pagar (padrão = valor restante da fatura)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({ description: 'ID da conta de onde sairá o pagamento' })
  @IsString()
  accountId: string;
}
