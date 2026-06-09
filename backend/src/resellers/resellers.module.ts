/**
 * Módulo NestJS do domínio de revendedores e créditos; agrupa controllers, services e dependências necessárias para este contexto.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ResellersService } from './resellers.service';
import { ResellersAdminController } from './resellers-admin.controller';
import { ResellerPortalController } from './reseller-portal.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ResellersAdminController, ResellerPortalController],
  providers: [ResellersService],
  exports: [ResellersService],
})
export class ResellersModule {}
