/**
 * Service do domínio de acesso ao banco com Prisma; concentra as regras de negócio, validações e operações de banco ligadas a este fluxo.
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
