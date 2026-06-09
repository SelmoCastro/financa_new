/**
 * Módulo NestJS do domínio de transações financeiras; agrupa controllers, services e dependências necessárias para este contexto.
 */
import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsImportService } from './transactions-import.service';
import { TransactionsTransferService } from './transactions-transfer.service';
import { TransactionsController } from './transactions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsModule } from '../reports/reports.module';
import { AiModule } from '../ai/ai.module';
import { OcrModule } from '../common/services/ocr.module';
import { SocialModule } from '../social/social.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    ReportsModule,
    AiModule,
    OcrModule,
    SocialModule,
    AuditModule,
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    TransactionsImportService,
    TransactionsTransferService,
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}
