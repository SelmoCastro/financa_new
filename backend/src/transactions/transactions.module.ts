import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsModule } from '../reports/reports.module';
import { AiModule } from '../ai/ai.module';
import { SocialModule } from '../social/social.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, ReportsModule, AiModule, SocialModule, AuditModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
