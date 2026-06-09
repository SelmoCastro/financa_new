/**
 * Módulo NestJS do domínio de faturas de cartão; agrupa controllers, services e dependências necessárias para este contexto.
 */
import { Module } from '@nestjs/common';
import { CreditCardInvoiceService } from './credit-card-invoices.service';
import { CreditCardInvoiceController } from './credit-card-invoices.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CreditCardInvoiceController],
  providers: [CreditCardInvoiceService],
  exports: [CreditCardInvoiceService],
})
export class CreditCardInvoiceModule {}
