/**
 * Módulo NestJS do domínio de acesso ao banco com Prisma; agrupa controllers, services e dependências necessárias para este contexto.
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
