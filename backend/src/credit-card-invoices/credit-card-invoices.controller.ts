import { Controller, Get, Post, Param, Body, Req, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CreditCardInvoiceService } from './credit-card-invoices.service';
import { PayInvoiceDto } from './dto/pay-invoice.dto';

@ApiTags('credit-card-invoices')
@ApiBearerAuth()
@Controller({
  path: 'credit-card-invoices',
  version: '1',
})
export class CreditCardInvoiceController {
  constructor(private readonly invoiceService: CreditCardInvoiceService) {}

  /**
   * Retorna a fatura aberta atual de um cartão (projeção se ainda não fechada).
   */
  @Get(':creditCardId/current')
  getCurrentInvoice(
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Req() req: any,
  ) {
    return this.invoiceService.getCurrentInvoice(creditCardId, req.user.id);
  }

  /**
   * Fecha a fatura atual do cartão, vinculando transações do período.
   */
  @Post(':creditCardId/close')
  closeInvoice(
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Req() req: any,
  ) {
    return this.invoiceService.closeInvoice(creditCardId, req.user.id);
  }

  /**
   * Registra pagamento (parcial ou total) em uma fatura.
   */
  @Post(':invoiceId/pay')
  payInvoice(
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Body() dto: PayInvoiceDto,
    @Req() req: any,
  ) {
    return this.invoiceService.payInvoice(invoiceId, dto, req.user.id);
  }

  /**
   * Lista o histórico de faturas de um cartão.
   */
  @Get(':creditCardId/history')
  getInvoiceHistory(
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Req() req: any,
  ) {
    return this.invoiceService.getInvoiceHistory(creditCardId, req.user.id);
  }
}
