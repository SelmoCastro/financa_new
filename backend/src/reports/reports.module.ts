/**
 * Módulo NestJS do domínio de relatórios e indicadores; agrupa controllers, services e dependências necessárias para este contexto.
 */
import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
