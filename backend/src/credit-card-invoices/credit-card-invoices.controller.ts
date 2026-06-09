/**
 * Controller HTTP do domínio de faturas de cartão; recebe as requisições, aplica guards/decorators e delega a regra de negócio aos services.
 */
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CreditCardInvoiceService } from './credit-card-invoices.service';
import { PayInvoiceDto } from './dto/pay-invoice.dto';

@ApiTags('credit-card-invoices')
@ApiBearerAuth()
@Controller({
  path: 'credit-card-invoices',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
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
    return this.invoiceService.getCurrentInvoice(creditCardId, req.user.userId);
  }

  /**
   * Fecha a fatura atual do cartão, vinculando transações do período.
   */
  @Post(':creditCardId/close')
  closeInvoice(
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Req() req: any,
  ) {
    return this.invoiceService.closeInvoice(creditCardId, req.user.userId);
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
    return this.invoiceService.payInvoice(invoiceId, dto, req.user.userId);
  }

  /**
   * Lista o histórico de faturas de um cartão.
   */
  @Get(':creditCardId/history')
  getInvoiceHistory(
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Req() req: any,
  ) {
    return this.invoiceService.getInvoiceHistory(creditCardId, req.user.userId);
  }

  /**
   * Remove uma fatura, revertendo pagamentos e desvinculando transações.
   */
  @Delete(':invoiceId')
  removeInvoice(
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Req() req: any,
  ) {
    return this.invoiceService.remove(invoiceId, req.user.userId);
  }
}
