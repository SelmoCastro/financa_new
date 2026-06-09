/**
 * Módulo NestJS do domínio de assinaturas e plano premium; agrupa controllers, services e dependências necessárias para este contexto.
 */
import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PlanGuard } from './plan.guard';
import { AiRequestGuard } from './ai-request.guard';

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, PlanGuard, AiRequestGuard],
  exports: [SubscriptionService, PlanGuard, AiRequestGuard],
})
export class SubscriptionModule {}
